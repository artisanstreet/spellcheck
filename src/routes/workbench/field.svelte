<script lang="ts">
  import { Option } from "effect";
  import { Draft, Issue, Segment, accept, dismiss, segments } from "../../suggestions/issue.ts";
  import Mark from "../../ui/mark.svelte";
  import SuggestionCard from "../../ui/suggestion-card.svelte";

  let { start, surface }: { start: Draft; surface: "light" | "dark" } = $props();

  class Open {
    issue: Issue;
    left: number;
    top: number;
    constructor(issue: Issue, left: number, top: number) {
      this.issue = issue;
      this.left = left;
      this.top = top;
    }
  }

  let draft = $state(start);
  let open: Option.Option<Open> = $state(Option.none());
  let field: HTMLElement;

  export const reset = () => {
    draft = start;
    open = Option.none();
  };

  const select = (issue: Issue, anchor: HTMLElement) => {
    const box = field.getBoundingClientRect();
    const mark = anchor.getBoundingClientRect();
    const card_width = 17 * parseFloat(getComputedStyle(document.documentElement).fontSize);
    const left = Math.max(0, Math.min(mark.left - box.left, box.width - card_width));
    open = Option.some(new Open(issue, left, mark.bottom - box.top + 6));
  };

  const close = () => (open = Option.none());

  const is_open = (issue: Issue) => Option.isSome(open) && open.value.issue === issue;
</script>

<svelte:window onkeydown={(event) => event.key === "Escape" && close()} />

<div class="field" data-surface={surface} bind:this={field}>
  <div class="text">
    {#each segments(draft.text, draft.issues) as segment, index (index)}
      {#if Segment.$is("Marked")(segment)}
        <Mark
          kind={segment.issue.kind}
          text={segment.text}
          certain={segment.issue.replacements.length > 0}
          active={is_open(segment.issue)}
          select={(anchor) => select(segment.issue, anchor)}
        />
      {:else}{segment.text}{/if}
    {/each}
  </div>
  {#if Option.isSome(open)}
    {@const current = open.value}
    <div class="anchor" style:left="{current.left}px" style:top="{current.top}px">
      <SuggestionCard
        issue={current.issue}
        accept={(replacement) => {
          draft = accept(draft, current.issue, replacement);
          close();
        }}
        dismiss={() => {
          draft = dismiss(draft, current.issue);
          close();
        }}
      />
    </div>
  {/if}
</div>

<style>
  .field {
    position: relative;
    min-height: 15rem;
    padding: 0.875rem 1rem 2.25rem;
    font-family: system-ui, -apple-system, "Segoe UI", sans-serif;
    font-size: 0.9375rem;
    line-height: 1.6;
    border-radius: 0.5rem;
  }

  .field[data-surface="light"] {
    color: oklch(0.22 0 0);
    background: oklch(1 0 0);
    border: 1px solid oklch(0.86 0 0);
  }

  .field[data-surface="dark"] {
    color: oklch(0.93 0 0);
    background: oklch(0.24 0.008 260);
    border: 1px solid oklch(0.34 0.008 260);
  }

  .text {
    white-space: pre-wrap;
  }

  .anchor {
    position: absolute;
    z-index: 2;
  }
</style>
