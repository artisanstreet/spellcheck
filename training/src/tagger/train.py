import argparse
import json
import math
import time
from dataclasses import dataclass
from pathlib import Path

import pyarrow.parquet as pq
import torch
from torch import nn
from torch.utils.data import DataLoader, Dataset
from transformers import AutoModel, AutoTokenizer, PreTrainedTokenizerFast

from tagger.vocabulary import Vocabulary, ignored, read_counts, token_targets, top_labels, word_targets


class Examples(Dataset):
    def __init__(self, path: Path):
        self.path = path
        self.rows = pq.read_metadata(path).num_rows
        self.table = None

    def __len__(self) -> int:
        return self.rows

    def __getitem__(self, index: int) -> tuple[list[str], list[str]]:
        self.table = self.table or pq.read_table(self.path)
        return self.table.column("words")[index].as_py(), self.table.column("labels")[index].as_py()


@dataclass(frozen=True)
class Collate:
    tokenizer: PreTrainedTokenizerFast
    vocabulary: Vocabulary
    max_tokens: int

    def __call__(self, batch: list[tuple[list[str], list[str]]]) -> dict[str, torch.Tensor]:
        encoded = self.tokenizer(
            [words for words, _ in batch],
            is_split_into_words=True,
            truncation=True,
            max_length=self.max_tokens,
            padding=True,
            return_tensors="pt",
        )
        targets = [word_targets(labels, self.vocabulary) for _, labels in batch]
        word_ids = [encoded.word_ids(row) for row in range(len(batch))]
        return {
            "input_ids": encoded["input_ids"],
            "attention_mask": encoded["attention_mask"],
            "labels": torch.tensor([token_targets(ids, labels) for ids, (labels, _) in zip(word_ids, targets)]),
            "errors": torch.tensor([token_targets(ids, errors) for ids, (_, errors) in zip(word_ids, targets)]),
        }


class Tagger(nn.Module):
    def __init__(self, encoder: nn.Module, labels: int):
        super().__init__()
        self.encoder = encoder
        hidden = encoder.config.hidden_size
        self.labels = nn.Linear(hidden, labels)
        self.errors = nn.Linear(hidden, 2)

    def forward(self, input_ids: torch.Tensor, attention_mask: torch.Tensor) -> tuple[torch.Tensor, torch.Tensor]:
        hidden = self.encoder(input_ids=input_ids, attention_mask=attention_mask).last_hidden_state
        return self.labels(hidden), self.errors(hidden)


def loss_of(model: Tagger, batch: dict[str, torch.Tensor]) -> tuple[torch.Tensor, torch.Tensor, torch.Tensor]:
    label_logits, error_logits = model(batch["input_ids"], batch["attention_mask"])
    loss = nn.functional.cross_entropy(
        label_logits.flatten(0, 1).float(), batch["labels"].flatten(), ignore_index=ignored
    ) + nn.functional.cross_entropy(error_logits.flatten(0, 1).float(), batch["errors"].flatten(), ignore_index=ignored)
    return loss, label_logits, error_logits


def schedule(step: int, warmup: int, total: int) -> float:
    return step / warmup if step < warmup else max(0.0, (total - step) / max(1, total - warmup))


@torch.no_grad()
def evaluate(model: Tagger, loader: DataLoader, device: torch.device) -> dict[str, float]:
    model.eval()
    totals = dict.fromkeys(["loss", "batches", "flagged", "errors", "caught", "edits", "edits_right"], 0.0)
    for batch in loader:
        batch = {key: value.to(device) for key, value in batch.items()}
        with torch.autocast(device.type, dtype=torch.bfloat16):
            loss, label_logits, error_logits = loss_of(model, batch)
        words = batch["errors"] != ignored
        actual = (batch["errors"] == 1) & words
        flagged = (error_logits.argmax(-1) == 1) & words
        known_edits = (batch["labels"] > 0) & words
        totals["loss"] += loss.item()
        totals["batches"] += 1
        totals["flagged"] += flagged.sum().item()
        totals["errors"] += actual.sum().item()
        totals["caught"] += (flagged & actual).sum().item()
        totals["edits"] += known_edits.sum().item()
        totals["edits_right"] += ((label_logits.argmax(-1) == batch["labels"]) & known_edits).sum().item()
    model.train()
    precision = totals["caught"] / max(1, totals["flagged"])
    recall = totals["caught"] / max(1, totals["errors"])
    return {
        "loss": totals["loss"] / max(1, totals["batches"]),
        "detect_precision": precision,
        "detect_recall": recall,
        "detect_f05": 1.25 * precision * recall / max(1e-9, 0.25 * precision + recall),
        "edit_accuracy": totals["edits_right"] / max(1, totals["edits"]),
    }


def save(model: Tagger, tokenizer: PreTrainedTokenizerFast, vocabulary: Vocabulary, base: str, path: Path) -> None:
    path.mkdir(parents=True, exist_ok=True)
    torch.save(model.state_dict(), path / "tagger.pt")
    tokenizer.save_pretrained(path)
    (path / "labels.txt").write_text("".join(f"{label}\n" for label in vocabulary.labels), encoding="utf-8")
    (path / "tagger.json").write_text(json.dumps({"base": base, "labels": len(vocabulary.labels)}), encoding="utf-8")


def main() -> None:
    parser = argparse.ArgumentParser()
    parser.add_argument("--data", type=Path, required=True)
    parser.add_argument("--output", type=Path, required=True)
    parser.add_argument("--base", default="jhu-clsp/ettin-encoder-32m")
    parser.add_argument("--labels", type=int, default=5000)
    parser.add_argument("--batch-size", type=int, default=64)
    parser.add_argument("--max-tokens", type=int, default=160)
    parser.add_argument("--learning-rate", type=float, default=1e-4)
    parser.add_argument("--epochs", type=float, default=3)
    parser.add_argument("--max-steps", type=int, default=None)
    parser.add_argument("--warmup", type=int, default=1000)
    parser.add_argument("--evaluate-every", type=int, default=2000)
    parser.add_argument("--workers", type=int, default=6)
    arguments = parser.parse_args()

    torch.manual_seed(0)
    torch.backends.cuda.enable_mem_efficient_sdp(False)
    device = torch.device("cuda")
    vocabulary = top_labels(read_counts(arguments.data / "labels.tsv"), arguments.labels)
    tokenizer = AutoTokenizer.from_pretrained(arguments.base, add_prefix_space=True)
    collate = Collate(tokenizer, vocabulary, arguments.max_tokens)
    train = DataLoader(
        Examples(arguments.data / "train.parquet"),
        batch_size=arguments.batch_size,
        shuffle=True,
        collate_fn=collate,
        num_workers=arguments.workers,
        persistent_workers=True,
        pin_memory=True,
        drop_last=True,
    )
    dev = DataLoader(Examples(arguments.data / "dev.parquet"), batch_size=128, collate_fn=collate, num_workers=2)

    model = Tagger(AutoModel.from_pretrained(arguments.base), len(vocabulary.labels)).to(device)
    total = arguments.max_steps or math.ceil(arguments.epochs * len(train))
    optimizer = torch.optim.AdamW(model.parameters(), lr=arguments.learning_rate, weight_decay=0.01, fused=True)
    scheduler = torch.optim.lr_scheduler.LambdaLR(optimizer, lambda step: schedule(step, arguments.warmup, total))
    print(f"parameters {sum(p.numel() for p in model.parameters()) / 1e6:.1f}M, labels {len(vocabulary.labels)}, steps {total}")

    step, tokens, started, best = 0, 0, time.perf_counter(), math.inf
    while step < total:
        for batch in train:
            batch = {key: value.to(device, non_blocking=True) for key, value in batch.items()}
            with torch.autocast(device.type, dtype=torch.bfloat16):
                loss, _, _ = loss_of(model, batch)
            loss.backward()
            nn.utils.clip_grad_norm_(model.parameters(), 1.0)
            optimizer.step()
            scheduler.step()
            optimizer.zero_grad(set_to_none=True)
            step += 1
            tokens += int(batch["attention_mask"].sum())
            if step % 100 == 0:
                elapsed = time.perf_counter() - started
                remaining = elapsed / step * (total - step)
                print(
                    f"step {step}/{total} loss {loss.item():.4f} {tokens / elapsed:,.0f} tokens/s "
                    f"elapsed {elapsed / 60:.1f}m remaining {remaining / 60:.1f}m",
                    flush=True,
                )
            if step % arguments.evaluate_every == 0 or step == total:
                scores = evaluate(model, dev, device)
                print("dev " + " ".join(f"{key} {value:.4f}" for key, value in scores.items()), flush=True)
                save(model, tokenizer, vocabulary, arguments.base, arguments.output / "last")
                if scores["loss"] < best:
                    best = scores["loss"]
                    save(model, tokenizer, vocabulary, arguments.base, arguments.output / "best")
            if step >= total:
                break


if __name__ == "__main__":
    main()
