import { Data, Effect, Option, Order, Array as Arr } from "effect";
import { Token, tokenize } from "../evaluation/edits/tokens.ts";
import { sentences } from "../evaluation/engines/sentences.ts";
import { misspellings_of, type Dictionary, type Misspelling } from "../dictionary/dictionary.ts";
import { Thresholds, Verdict } from "../tagger/labels.ts";
import { Tagged, infer_sentence, tag_sentence, word_errors, type Run, type Vocabulary } from "../tagger/tagger.ts";

export class Substitution extends Data.Class<{ readonly start: number; readonly end: number; readonly text: string }> {}

export class Spelled extends Data.Class<{ readonly token: Token; readonly candidates: ReadonlyArray<string> }> {}

export class Checked extends Data.Class<{ readonly spelled: ReadonlyArray<Spelled>; readonly tagged: ReadonlyArray<Tagged> }> {}

const ranked_candidates = 5;
const rank_penalty = 0.02;

export class Gate extends Data.Class<{ readonly margin: number; readonly commonness: number }> {}

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

const corrected_start = (substitutions: ReadonlyArray<Substitution>, substitution: Substitution): number =>
  placed(substitutions).find((entry) => entry.substitution === substitution)?.start ?? substitution.start;

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

const fit = <E>(vocabulary: Vocabulary, run: Run<E>, content: string, chosen: ReadonlyArray<Substitution>, candidate: Substitution) =>
  Effect.gen(function* () {
    const all = [...chosen, candidate];
    const inferred = yield* infer_sentence(vocabulary, run, substitute(content, all), 0);
    const start = corrected_start(all, candidate);
    const end = start + candidate.text.length;
    return Option.map(inferred, (found) => {
      const errors = word_errors(found);
      const covered = found.tokens.flatMap((token, index) => (token.end > start && token.start < end ? [index] : []));
      const window = covered.length === 0 ? [] : errors.slice(Math.max(0, covered[0]! - 1), covered[covered.length - 1]! + 2);
      return Math.max(0, ...window);
    });
  });

const rank = <E>(
  dictionary: Dictionary,
  vocabulary: Vocabulary,
  run: Run<E>,
  gate: Gate,
  content: string,
  chosen: ReadonlyArray<Substitution>,
  misspelling: Misspelling,
) =>
  Effect.gen(function* () {
    const substitution = (text: string) => new Substitution({ start: misspelling.token.start, end: misspelling.token.end, text });
    const original = yield* fit(vocabulary, run, content, chosen, substitution(misspelling.token.text));
    const scored = yield* Effect.forEach(misspelling.candidates.slice(0, ranked_candidates), (candidate, index) =>
      fit(vocabulary, run, content, chosen, substitution(candidate)).pipe(
        Effect.map((score) => {
          const fit = Option.getOrElse(score, () => 0);
          return { candidate, fit, score: fit + rank_penalty * index - gate.commonness * dictionary.commonness(candidate) };
        }),
      ),
    );
    const sorted = Arr.sort(scored, Order.mapInput(Order.Number, (entry: { score: number }) => entry.score));
    const best = Math.min(1, ...scored.map((entry) => entry.fit));
    const wrong = Option.getOrElse(original, () => 1) - best >= gate.margin;
    return wrong
      ? Option.some([...sorted.map((entry) => entry.candidate), ...misspelling.candidates.slice(ranked_candidates)])
      : Option.none<ReadonlyArray<string>>();
  });

const shift_token = (token: Token, start: number) => new Token({ ...token, start: token.start + start, end: token.end + start });

const check_sentence = <E>(dictionary: Dictionary, vocabulary: Vocabulary, run: Run<E>, thresholds: Thresholds, gate: Gate, content: string, start: number) =>
  Effect.gen(function* () {
    const tokens = tokenize(content);
    const spelled = yield* Effect.reduce(misspellings_of(dictionary, tokens), (): ReadonlyArray<Spelled> => [], (done, misspelling) =>
      rank(
        dictionary,
        vocabulary,
        run,
        gate,
        content,
        done.map((entry) => new Substitution({ start: entry.token.start, end: entry.token.end, text: entry.candidates[0]! })),
        misspelling,
      ).pipe(
        Effect.map((candidates) =>
          Option.match(candidates, { onNone: () => done, onSome: (found) => [...done, new Spelled({ token: misspelling.token, candidates: found })] }),
        ),
      ),
    );
    const substitutions = spelled.map((entry) => new Substitution({ start: entry.token.start, end: entry.token.end, text: entry.candidates[0]! }));
    const tagged = yield* tag_sentence(vocabulary, run, thresholds, substitute(content, substitutions), 0);
    return new Checked({
      spelled: spelled.map((entry) => new Spelled({ token: shift_token(entry.token, start), candidates: entry.candidates })),
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
        new Checked({ spelled: checked.flatMap((entry) => entry.spelled), tagged: checked.flatMap((entry) => entry.tagged) }),
    ),
  );
