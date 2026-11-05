import american from "dictionary-en";
import british from "dictionary-en-gb";
import { Effect } from "effect";
import { Gate, Spelled, check_text } from "../../checking/check.ts";
import { readFile } from "node:fs/promises";
import { Source, dictionary_of, frequencies_of } from "../../dictionary/dictionary.ts";
import { Thresholds, sentence_edits } from "../../tagger/labels.ts";
import { Correction, Edit, replace } from "../edits/edit.ts";
import { Engine, EngineError } from "./engine.ts";
import { load_tagger } from "./tagger.ts";

const decoder = new TextDecoder();

export const english = [american, british].map(({ aff, dic }) => new Source({ aff: decoder.decode(aff), dic: decoder.decode(dic) }));

export const checker_engine = (directory: string, thresholds: Thresholds, gate: Gate) =>
  Effect.gen(function* () {
    const { vocabulary, run } = yield* load_tagger(directory);
    const frequencies = yield* Effect.tryPromise({
      try: () => readFile("models/frequencies.txt", "utf8"),
      catch: (cause) => new EngineError({ engine: "checker", cause }),
    }).pipe(Effect.map(frequencies_of));
    const dictionary = yield* dictionary_of(english, frequencies).pipe(Effect.mapError((error) => new EngineError({ engine: "checker", cause: error.cause })));
    return new Engine({
      name: "checker",
      check: (text) =>
        check_text(dictionary, vocabulary, run, thresholds, gate, text).pipe(
          Effect.map((checked) => [
            ...checked.spelled.map((entry) =>
              Spelled.$match(entry, {
                Fixable: ({ token, candidates }) => replace(token.start, token.end, candidates[0]!),
                Unknown: ({ token }) => new Edit({ start: token.start, end: token.end, correction: Correction.Unknown() }),
              }),
            ),
            ...checked.tagged.flatMap((sentence) => sentence_edits(sentence.tokens, sentence.start, sentence.verdicts)),
          ]),
        ),
    });
  });
