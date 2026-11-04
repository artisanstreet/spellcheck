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
    --sand-top: oklch(0.92 0.035 88);
    --sand-bottom: oklch(0.82 0.05 78);
    color: oklch(0.27 0.025 70);
    background:
      radial-gradient(ellipse 70% 110% at 50% 115%, oklch(0.42 0.1 55 / 0.45), oklch(0.42 0.1 55 / 0) 70%),
      linear-gradient(var(--sand-top), color-mix(in oklch, var(--sand-top), var(--sand-bottom)), var(--sand-bottom));
    box-shadow: inset 0 1px 0 color-mix(in oklch, var(--sand-top), oklch(1 0 0) 30%), var(--shadow-press);
  }

  .segments button:focus-visible {
    outline: 2px solid var(--focus);
    outline-offset: 1px;
  }
</style>
