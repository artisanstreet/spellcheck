import { Data, Effect, Option, Order, Array as Arr } from "effect";
import { Token, tokenize } from "../evaluation/edits/tokens.ts";
import { sentences } from "../evaluation/engines/sentences.ts";
import { misspellings_of, type Dictionary, type Misspelling } from "../dictionary/dictionary.ts";
import { typo_cost } from "../dictionary/typo.ts";
import { Thresholds, Verdict } from "../tagger/labels.ts";
import { Tagged, encode_sentence, tag_sentence, type Input, type Run, type Vocabulary } from "../tagger/tagger.ts";

export class Substitution extends Data.Class<{ readonly start: number; readonly end: number; readonly text: string }> {}

export type Spelled = Data.TaggedEnum<{
  Fixable: { readonly token: Token; readonly candidates: ReadonlyArray<string> };
  Unknown: { readonly token: Token };
}>;

export const Spelled = Data.taggedEnum<Spelled>();

export class Checked extends Data.Class<{ readonly spelled: ReadonlyArray<Spelled>; readonly tagged: ReadonlyArray<Tagged> }> {}

const ranked_candidates = 6;
const rank_penalty = 0.02;

export class Gate extends Data.Class<{ readonly margin: number; readonly commonness: number; readonly typo: number }> {}

const by_start = Order.mapInput(Order.Number, (substitution: Substitution) => substitution.start);

export const substitute = (content: string, substitutions: ReadonlyArray<Substitution>): string =>
  Arr.sort(substitutions, by_start).reduceRight(
    (text, substitution) => text.slice(0, substitution.start) + substitution.text + text.slice(substitution.end),
    content,
  );

const growth = (substitution: Substitution) => substitution.text.length - (substitution.end - substitution.start);

const placed = (substitutions: ReadonlyArray<Substitution>) =>
  Arr.sort(substitutions, by_start).map((substitution, index, sorted) => ({
    substitution,
    start: substitution.start + sorted.slice(0, index).reduce((total, other) => total + growth(other), 0),
  }));

const original_position = (substitutions: ReadonlyArray<Substitution>, position: number): Option.Option<number> => {
  const entries = placed(substitutions);
  const inside = entries.some((entry) => position >= entry.start && position < entry.start + entry.substitution.text.length);
  const shift = entries
    .filter((entry) => entry.start + entry.substitution.text.length <= position)
    .reduce((total, entry) => total + growth(entry.substitution), 0);
  return inside ? Option.none() : Option.some(position - shift);
};

export const restore = (original: ReadonlyArray<Token>, corrected: Tagged, substitutions: ReadonlyArray<Substitution>): Tagged => {
  const verdicts = new Map(
    corrected.tokens.flatMap((token, index) =>
      Option.toArray(Option.map(original_position(substitutions, token.start), (start) => [start, corrected.verdicts[index] ?? Verdict.Fine()] as const)),
    ),
  );
  const substituted = (token: Token) => substitutions.some((substitution) => substitution.start === token.start);
  return new Tagged({
    tokens: original,
    start: corrected.start,
    verdicts: original.map((token) => (substituted(token) ? Verdict.Fine() : (verdicts.get(token.start) ?? Verdict.Fine()))),
  });
};

class Variant extends Data.Class<{
  readonly misspelling: Misspelling;
  readonly position: number;
  readonly text: string;
  readonly input: Option.Option<Input>;
  readonly window: ReadonlyArray<number>;
}> {}

const variant_of = (vocabulary: Vocabulary, content: string, misspelling: Misspelling, position: number, text: string): Variant => {
  const corrected = substitute(content, [new Substitution({ start: misspelling.token.start, end: misspelling.token.end, text })]);
  const tokens = tokenize(corrected);
  const end = misspelling.token.start + text.length;
  const covered = tokens.flatMap((token, index) => (token.end > misspelling.token.start && token.start < end ? [index] : []));
  const window = covered.length === 0 ? [] : tokens.map((_, index) => index).slice(Math.max(0, covered[0]! - 1), covered[covered.length - 1]! + 2);
  return new Variant({ misspelling, position, text, input: encode_sentence(vocabulary, tokens), window });
};

const rank = <E>(
  dictionary: Dictionary,
  vocabulary: Vocabulary,
  run: Run<E>,
  gate: Gate,
  content: string,
  misspellings: ReadonlyArray<Misspelling>,
): Effect.Effect<ReadonlyArray<Spelled>, E> => {
  const variants = misspellings.flatMap((misspelling) => [
    variant_of(vocabulary, content, misspelling, -1, misspelling.token.text),
    ...misspelling.candidates.slice(0, ranked_candidates).map((candidate, position) => variant_of(vocabulary, content, misspelling, position, candidate)),
  ]);
  const runnable = variants.flatMap((variant) => Option.toArray(Option.map(variant.input, (input) => ({ variant, input }))));
  return (runnable.length === 0 ? Effect.succeed([]) : run(runnable.map((entry) => entry.input.ids))).pipe(
    Effect.map((outputs) => {
      const fits = new Map(
        runnable.map((entry, index) => [
          entry.variant,
          Math.max(0, ...entry.variant.window.map((word) => outputs[index]!.errors[entry.input.firsts[word + 1]!] ?? 0)),
        ]),
      );
      return misspellings.map((misspelling) => {
        const own = variants.filter((variant) => variant.misspelling === misspelling);
        const original = fits.get(own[0]!) ?? 1;
        const scored = own.slice(1).map((variant) => {
          const fit = fits.get(variant) ?? 0;
          return {
            candidate: variant.text,
            fit,
            score:
              fit +
              rank_penalty * variant.position -
              gate.commonness * dictionary.commonness(variant.text) +
              gate.typo * typo_cost(misspelling.token.text, variant.text),
          };
        });
        const best = Math.min(1, ...scored.map((entry) => entry.fit));
        return original - best >= gate.margin
          ? Spelled.Fixable({
              token: misspelling.token,
              candidates: [
                ...scored.toSorted((left, right) => left.score - right.score).map((entry) => entry.candidate),
                ...misspelling.candidates.slice(ranked_candidates),
              ],
            })
          : Spelled.Unknown({ token: misspelling.token });
      });
    }),
  );
};

const shift_token = (token: Token, start: number) => new Token({ ...token, start: token.start + start, end: token.end + start });

const shift_spelled = (spelled: Spelled, start: number): Spelled =>
  Spelled.$match(spelled, {
    Fixable: ({ token, candidates }) => Spelled.Fixable({ token: shift_token(token, start), candidates }),
    Unknown: ({ token }) => Spelled.Unknown({ token: shift_token(token, start) }),
  });

const fix_of = (spelled: Spelled): ReadonlyArray<Substitution> =>
  Spelled.$match(spelled, {
    Fixable: ({ token, candidates }) => [new Substitution({ start: token.start, end: token.end, text: candidates[0]! })],
    Unknown: () => [],
  });

export const without_repeats = (text: string, spelled: ReadonlyArray<Spelled>): ReadonlyArray<Spelled> => {
  const counts = tokenize(text).reduce((seen, token) => seen.set(token.text.toLowerCase(), (seen.get(token.text.toLowerCase()) ?? 0) + 1), new Map<string, number>());
  return spelled.filter((entry) => Spelled.$is("Fixable")(entry) || (counts.get(entry.token.text.toLowerCase()) ?? 0) < 2);
};

const check_sentence = <E>(dictionary: Dictionary, vocabulary: Vocabulary, run: Run<E>, thresholds: Thresholds, gate: Gate, content: string, start: number) =>
  Effect.gen(function* () {
    const tokens = tokenize(content);
    const spelled = yield* rank(dictionary, vocabulary, run, gate, content, misspellings_of(dictionary, tokens));
    const substitutions = spelled.flatMap(fix_of);
    const tagged = yield* tag_sentence(vocabulary, run, thresholds, substitute(content, substitutions), 0);
    return new Checked({
      spelled: spelled.map((entry) => shift_spelled(entry, start)),
      tagged: Option.toArray(
        Option.map(tagged, (found) => {
          const restored = restore(tokens, found, substitutions);
          return new Tagged({ ...restored, tokens: restored.tokens.map((token) => shift_token(token, start)) });
        }),
      ),
    });
  });

export const check_text = <E>(dictionary: Dictionary, vocabulary: Vocabulary, run: Run<E>, thresholds: Thresholds, gate: Gate, text: string) =>
  Effect.forEach(sentences(text), ({ content, start }) => check_sentence(dictionary, vocabulary, run, thresholds, gate, content, start)).pipe(
    Effect.map(
      (checked) =>
        new Checked({ spelled: without_repeats(text, checked.flatMap((entry) => entry.spelled)), tagged: checked.flatMap((entry) => entry.tagged) }),
    ),
  );
