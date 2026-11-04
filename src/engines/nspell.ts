import american from "dictionary-en";
import british from "dictionary-en-gb";
import nspell from "nspell";
import { Array as Arr, Effect, Option } from "effect";
import { replace } from "../edits/edit.ts";
import { tokenize } from "../edits/tokens.ts";
import { Engine, EngineError } from "./engine.ts";

const checkable = /^\p{L}+(?:'\p{L}+)*$/u;

export const nspell_engine = Effect.try({
  try: () => [american, british].map(({ aff, dic }) => nspell({ aff: Buffer.from(aff), dic: Buffer.from(dic) })),
  catch: (cause) => new EngineError({ engine: "nspell", cause }),
}).pipe(
  Effect.map((spellers) => {
    const known = (word: string) => spellers.some((speller) => speller.correct(word));
    const suggest = (word: string) => Arr.head(spellers).pipe(Option.flatMap((speller) => Arr.head(speller.suggest(word))));
    return new Engine({
      name: "nspell",
      check: (text) =>
        Effect.try({
          try: () =>
            Arr.getSomes(
              tokenize(text)
                .filter((token) => checkable.test(token.text) && !known(token.text))
                .map((token) => suggest(token.text).pipe(Option.map((suggestion) => replace(token.start, token.end, suggestion)))),
            ),
          catch: (cause) => new EngineError({ engine: "nspell", cause }),
        }),
    });
  }),
);
