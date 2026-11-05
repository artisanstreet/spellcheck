<script lang="ts" effect>
  import { Effect, Option } from "effect";
  import { untrack } from "svelte";
  import { Settings } from "../../settings/settings.ts";
  import { Kind, type Issue } from "../../suggestions/issue.ts";
  import SuggestionCard from "../../ui/suggestion-card.svelte";
  import { Checker, Result } from "./checker.ts";
  import { caret_of, rects_of, replace, surface_of } from "./editable.ts";
  import { focused_field as field } from "./focus.svelte.ts";

  const settings = yield* Settings;
  const checker = yield* Checker;
  const preferences = yield* settings.load;

  const text = $derived(preferences.enabled ? field.settled : "");

  const result = $derived(
    yield* checker
      .check(text, preferences.pickiness)
      .pipe(Effect.orElseSucceed(() => new Result({ text: "", issues: [] }))),
  );

  let dismissed: ReadonlySet<string> = $state(new Set());
  let open: Option.Option<Issue> = $state.raw(Option.none());

  const key = (text: string, issue: Issue) => `${text.slice(issue.start, issue.end)}→${issue.replacements.join("|")}`;

  const settled = $derived(result ?? new Result({ text: "", issues: [] }));

  const visible = $derived(
    settled.text === field.text && field.text !== "" ? settled.issues.filter((issue) => !dismissed.has(key(settled.text, issue))) : [],
  );

  const box = $derived.by(() => {
    field.layout;
    return Option.map(field.editable, (editable) => editable.element.getBoundingClientRect());
  });

  const lines = $derived.by(() => {
    field.layout;
    return Option.match(Option.all([field.editable, box]), {
      onNone: () => [],
      onSome: ([editable, bounds]) =>
        visible.flatMap((issue) =>
          rects_of(editable, issue.start, issue.end)
            .filter((rect) => rect.width > 0 && rect.bottom > bounds.top && rect.top < bounds.bottom && rect.right > bounds.left && rect.left < bounds.right)
            .map((rect) => ({ issue, rect })),
        ),
    });
  });

  const surface = $derived(Option.match(field.editable, { onNone: () => "dark" as const, onSome: (editable) => surface_of(editable.element) }));

  $effect(() => {
    field.editable;
    untrack(() => (open = Option.none()));
  });

  $effect(() => {
    field.clicks;
    untrack(() => {
      open = Option.flatMap(field.editable, (editable) =>
        Option.flatMap(caret_of(editable), (caret) =>
          Option.fromNullishOr(visible.find((issue) => issue.start <= caret && caret <= issue.end)),
        ),
      );
    });
  });

  const shown = $derived(Option.filter(open, (issue) => visible.includes(issue)));

  const cards = $derived(
    Option.toArray(
      Option.flatMap(shown, (issue) =>
        Option.map(Option.fromNullishOr(lines.find((line) => line.issue === issue)?.rect), (rect) => ({ issue, rect })),
      ),
    ),
  );

  const tone = (issue: Issue) => Kind.$match(issue.kind, { Spelling: () => "spelling", Grammar: () => "grammar" });

  const accept = (issue: Issue, replacement: string) => {
    Option.map(field.editable, (editable) => replace(editable, issue.start, issue.end, replacement));
    open = Option.none();
  };

  const dismiss = (issue: Issue) => {
    dismissed = new Set([...dismissed, key(settled.text, issue)]);
    open = Option.none();
  };
</script>

{#if Option.isSome(box)}
  <div class="layer" data-surface={surface}>
    {#each lines as line, index (index)}
      <span
        class="line"
        class:unsure={line.issue.replacements.length === 0}
        data-tone={tone(line.issue)}
        style:left="{line.rect.left}px"
        style:top="{line.rect.bottom - 1}px"
        style:width="{line.rect.width}px"
      ></span>
    {/each}
    {#each cards as card (card.issue)}
      <div
        class="card"
        role="presentation"
        style:top="{card.rect.bottom + 6}px"
        style:left="{Math.max(8, Math.min(card.rect.left, innerWidth - 280))}px"
        onmousedown={(event) => event.preventDefault()}
      >
        <SuggestionCard issue={card.issue} accept={(replacement) => accept(card.issue, replacement)} dismiss={() => dismiss(card.issue)} />
      </div>
    {/each}
  </div>
{/if}

<style>
  .layer {
    position: fixed;
    inset: 0;
    z-index: 2147483647;
    pointer-events: none;
  }

  .line {
    --mark-ink: var(--mark-spelling);
    position: fixed;
    height: 2px;
    border-radius: 1px;
    background: var(--mark-ink);
  }

  .line[data-tone="grammar"] {
    --mark-ink: var(--mark-grammar);
  }

  .line.unsure {
    background: radial-gradient(circle at 1px 1px, var(--mark-ink) 1px, transparent 1.25px) 0 0 / 4px 2px repeat-x;
  }

  .card {
    position: fixed;
    pointer-events: auto;
  }
</style>
