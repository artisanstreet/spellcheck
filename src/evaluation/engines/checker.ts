import american from "dictionary-en";
import british from "dictionary-en-gb";
import { Effect } from "effect";
import { Gate, check_text } from "../../checking/check.ts";
import { Source, dictionary_of } from "../../dictionary/dictionary.ts";
import { Thresholds, sentence_edits } from "../../tagger/labels.ts";
import { replace } from "../edits/edit.ts";
import { Engine, EngineError } from "./engine.ts";
import { load_tagger } from "./tagger.ts";

const decoder = new TextDecoder();

export const english = [american, british].map(({ aff, dic }) => new Source({ aff: decoder.decode(aff), dic: decoder.decode(dic) }));

export const checker_engine = (directory: string, thresholds: Thresholds, gate: Gate) =>
  Effect.gen(function* () {
    const { vocabulary, run } = yield* load_tagger(directory);
    const dictionary = yield* dictionary_of(english).pipe(Effect.mapError((error) => new EngineError({ engine: "checker", cause: error.cause })));
    return new Engine({
      name: "checker",
      check: (text) =>
        check_text(dictionary, vocabulary, run, thresholds, gate, text).pipe(
          Effect.map((checked) => [
            ...checked.spelled.map((entry) => replace(entry.token.start, entry.token.end, entry.candidates[0]!)),
            ...checked.tagged.flatMap((sentence) => sentence_edits(sentence.tokens, sentence.start, sentence.verdicts)),
          ]),
        ),
    });
  });
