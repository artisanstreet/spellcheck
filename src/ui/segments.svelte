<script lang="ts" generics="Choice extends string" effect>
  import type { Effect } from "effect";
  import Card from "./card.svelte";

  let {
    label,
    choices,
    selected,
    name,
    choose,
  }: {
    label: string;
    choices: ReadonlyArray<Choice>;
    selected: Choice;
    name: (choice: Choice) => string;
    choose: (choice: Choice) => Effect.Effect<void, unknown>;
  } = $props();
</script>

<div class="segments-card">
  <Card surface="var(--bg)" radius="var(--radius-sm)">
    <div class="segments" role="radiogroup" aria-label={label}>
      {#each choices as choice (choice)}
        <button type="button" role="radio" aria-checked={choice === selected} onclick={yield* choose(choice)}>
          {name(choice)}
        </button>
      {/each}
    </div>
  </Card>
</div>

<style>
  .segments-card {
    display: flex;
  }

  .segments {
    position: relative;
    z-index: 2;
    display: flex;
    flex: 1;
    padding: 2px;
    border-radius: var(--radius-sm);
  }

  .segments button {
    flex: 1;
    padding: var(--sp-1) var(--sp-3);
    font: inherit;
    font-size: 0.8125rem;
    line-height: 1.25rem;
    color: var(--ink-dim);
    cursor: pointer;
    background: transparent;
    border: 0;
    border-radius: calc(var(--radius-md) - 8px);
    transition:
      color var(--duration-quick) var(--ease-smooth-out),
      background-color var(--duration-quick) var(--ease-smooth-out);
  }

  .segments button:hover:not([aria-checked="true"]) {
    color: var(--ink);
  }

  .segments button[aria-checked="true"] {
    color: oklch(1 0 0);
    text-shadow: 0 1px 4px oklch(0 0 0 / 0.4);
    background: var(--sky-fill);
    box-shadow:
      inset 0 0 0 1px var(--sky-edge),
      inset 0 2px 0 -1px var(--sky-highlight),
      var(--shadow-press);
  }

  .segments button:focus-visible {
    outline: 2px solid var(--focus);
    outline-offset: 1px;
  }
</style>
