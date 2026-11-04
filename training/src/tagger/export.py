import argparse
import json
import shutil
from pathlib import Path

import torch
from torch import nn
from transformers import AutoConfig, AutoModel

from tagger.train import Tagger


class Probabilities(nn.Module):
    def __init__(self, tagger: Tagger):
        super().__init__()
        self.tagger = tagger

    def forward(self, input_ids: torch.Tensor, attention_mask: torch.Tensor) -> tuple[torch.Tensor, torch.Tensor]:
        labels, errors = self.tagger(input_ids, attention_mask)
        return labels.softmax(-1), errors.softmax(-1)[..., 1]


def main() -> None:
    parser = argparse.ArgumentParser()
    parser.add_argument("--checkpoint", type=Path, required=True)
    parser.add_argument("--output", type=Path, required=True)
    arguments = parser.parse_args()

    settings = json.loads((arguments.checkpoint / "tagger.json").read_text(encoding="utf-8"))
    encoder = AutoModel.from_config(AutoConfig.from_pretrained(settings["base"]), attn_implementation="eager")
    tagger = Tagger(encoder, settings["labels"])
    tagger.load_state_dict(torch.load(arguments.checkpoint / "tagger.pt", map_location="cpu"))
    model = Probabilities(tagger).eval()

    arguments.output.mkdir(parents=True, exist_ok=True)
    example = (torch.ones(1, 12, dtype=torch.int64), torch.ones(1, 12, dtype=torch.int64))
    batch, length = torch.export.Dim("batch"), torch.export.Dim("length", min=2, max=1024)
    torch.onnx.export(
        model,
        example,
        arguments.output / "model.onnx",
        input_names=["input_ids", "attention_mask"],
        output_names=["label_probabilities", "error_probabilities"],
        dynamic_shapes={"input_ids": {0: batch, 1: length}, "attention_mask": {0: batch, 1: length}},
        external_data=False,
    )
    for name in ["tokenizer.json", "tokenizer_config.json", "labels.txt"]:
        shutil.copy(arguments.checkpoint / name, arguments.output / name)
    print(f"exported to {arguments.output}")
