<script lang="ts">
  import type { Snippet } from "svelte";
  import type { HTMLButtonAttributes } from "svelte/elements";
  import Card from "./card.svelte";

  let { tone = "secondary", children, ...rest }: { tone?: "secondary" | "default"; children: Snippet } & HTMLButtonAttributes =
    $props();
</script>

{#if tone === "default"}
  <button type="button" class="button" data-tone="default" {...rest}>{@render children()}</button>
{:else}
  <span class="secondary">
    <Card surface="var(--bg)" radius="var(--radius-sm)" key>
      <button type="button" class="button" data-tone="secondary" {...rest}>{@render children()}</button>
    </Card>
  </span>
{/if}

<style>
  .secondary {
    display: flex;
  }

  .button {
    position: relative;
    z-index: 2;
    display: inline-flex;
    align-items: center;
    justify-content: center;
    gap: var(--sp-2);
    min-height: 2.25rem;
    padding: var(--sp-1) var(--sp-3);
    font: inherit;
    font-size: 0.875rem;
    font-weight: 500;
    line-height: 1.25rem;
    white-space: nowrap;
    color: var(--ink);
    cursor: pointer;
    outline: none;
    border: 1px solid transparent;
    border-radius: calc(var(--radius-md) - 6px);
    background: transparent;
    transform: translateY(0);
    transition:
      transform var(--duration-quick) var(--ease-smooth-out),
      box-shadow var(--duration-quick) var(--ease-smooth-out);
  }

  .button:focus-visible {
    outline: 2px solid var(--focus);
    outline-offset: 2px;
  }

  .button:active {
    transform: translateY(1px);
    transition-duration: var(--duration-micro);
    transition-timing-function: ease-out;
  }

  .button[data-tone="secondary"] {
    border: 0;
    border-radius: inherit;
  }

  .button[data-tone="secondary"]:active {
    transform: none;
  }

  .button[data-tone="secondary"]::before,
  .button[data-tone="secondary"]::after {
    content: "";
    position: absolute;
    inset: 0;
    border-radius: inherit;
    pointer-events: none;
    transition: opacity var(--duration-quick) var(--ease-smooth-out);
  }

  .button[data-tone="secondary"]::before {
    background: radial-gradient(ellipse 70% 110% at 50% 115%, oklch(1 0 0 / 0.07), oklch(1 0 0 / 0) 70%);
  }

  .button[data-tone="secondary"]::after {
    background: radial-gradient(ellipse 90% 120% at 50% -15%, oklch(0 0 0 / 0.45), oklch(0 0 0 / 0) 70%);
    box-shadow: inset 0 1px 0 oklch(0 0 0 / 0.5);
    opacity: 0;
  }

  .button[data-tone="secondary"]:active::after {
    opacity: 1;
    transition-duration: var(--duration-micro);
  }

  .button[data-tone="default"] {
    color: oklch(1 0 0);
    text-shadow: 0 1px 4px oklch(0 0 0 / 0.4);
    border-color: var(--sky-edge);
    background: var(--sky-fill);
    box-shadow:
      inset 0 1px 0 var(--sky-highlight),
      inset 0 -1px 0 oklch(0 0 0 / 0.22),
      var(--shadow-press);
    transition:
      transform var(--duration-quick) var(--ease-smooth-out),
      box-shadow var(--duration-quick) var(--ease-smooth-out),
      filter var(--duration-quick) var(--ease-smooth-out);
  }

  .button[data-tone="default"]:hover {
    filter: brightness(1.1);
  }

  .button[data-tone="default"]:active {
    transform: translateY(1.5px);
    box-shadow:
      inset 0 2px 4px oklch(0 0 0 / 0.45),
      0 0 0 1px var(--sky-pressed-edge);
  }

  @media (prefers-reduced-motion: reduce) {
    .button {
      transition: none;
    }
  }
</style>
