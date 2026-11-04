<script lang="ts">
  import type { Snippet } from "svelte";
  import type { HTMLButtonAttributes } from "svelte/elements";
  import Card from "./card.svelte";

  let { tone = "secondary", children, ...rest }: { tone?: "secondary" | "sand"; children: Snippet } & HTMLButtonAttributes =
    $props();
</script>

{#if tone === "sand"}
  <button type="button" class="button" data-tone="sand" {...rest}>{@render children()}</button>
{:else}
  <span class="secondary">
    <Card surface="var(--bg)" radius="var(--radius-sm)">
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
    --sand-light: oklch(0.92 0.035 88);
    --sand-deep: oklch(0.82 0.05 78);
    --sand-top: var(--sand-light);
    --sand-bottom: var(--sand-deep);
    --sand-ink: oklch(0.27 0.025 70);
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

  .button[data-tone="secondary"]:hover {
    background: var(--hover-fill);
  }

  .button[data-tone="sand"] {
    color: var(--sand-ink);
    background:
      radial-gradient(ellipse 70% 110% at 50% 115%, oklch(0.42 0.1 55 / 0.45), oklch(0.42 0.1 55 / 0) 70%) padding-box,
      linear-gradient(var(--sand-top), color-mix(in oklch, var(--sand-top), var(--sand-bottom)), var(--sand-bottom)) padding-box,
      linear-gradient(color-mix(in oklch, var(--sand-top), oklch(0 0 0) 8%), color-mix(in oklch, var(--sand-bottom), oklch(0 0 0) 25%)) border-box;
    box-shadow:
      inset 0 1px 0 color-mix(in oklch, var(--sand-top), oklch(1 0 0) 30%),
      var(--shadow-press);
  }

  .button[data-tone="sand"]:hover {
    --sand-top: color-mix(in oklch, var(--sand-light), oklch(1 0 0) 6%);
  }

  .button[data-tone="sand"]:active {
    --sand-top: color-mix(in oklch, var(--sand-light), oklch(0 0 0) 4%);
    --sand-bottom: color-mix(in oklch, var(--sand-deep), oklch(0 0 0) 5%);
    transform: translateY(1.5px);
    box-shadow:
      inset 0 1px 0 transparent,
      0 0 0.5px oklch(0 0 0 / 0.3);
  }

  .button[data-tone="sand"]::after {
    content: "";
    position: absolute;
    inset: -1px;
    border-radius: inherit;
    pointer-events: none;
    background: radial-gradient(ellipse 90% 120% at 50% -15%, oklch(0.25 0.04 65 / 0.4), oklch(0.25 0.04 65 / 0) 70%);
    box-shadow: inset 0 1px 0 oklch(0.25 0.04 65 / 0.45);
    opacity: 0;
    transition: opacity var(--duration-quick) var(--ease-smooth-out);
  }

  .button[data-tone="sand"]:active::after {
    opacity: 1;
    transition-duration: var(--duration-micro);
  }

  @media (prefers-reduced-motion: reduce) {
    .button {
      transition: none;
    }
  }
</style>
