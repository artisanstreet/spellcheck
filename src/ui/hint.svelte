<script lang="ts">
  import type { Snippet } from "svelte";
  import Card from "./card.svelte";

  let { label, title, children }: { label: string; title: string; children: Snippet } = $props();
  const id = $props.id();
</script>

<span class="hint"
  ><button type="button" class="trigger" aria-describedby={id}>{label}</button
  ><span class="bubble" role="tooltip" {id}>
    <Card surface="var(--panel)" radius="var(--radius-sm)">
      <span class="content">
        <span class="title">{title}</span>
        <span class="text">{@render children()}</span>
      </span>
    </Card>
  </span></span
>

<style>
  .hint .trigger {
    padding: 0;
    font: inherit;
    color: oklch(0.88 0.045 82);
    text-decoration: underline dotted;
    text-decoration-thickness: 1.5px;
    text-underline-offset: 0.2em;
    background: none;
    border: 0;
    cursor: help;
  }

  .bubble {
    position: absolute;
    right: 0;
    bottom: calc(100% + var(--sp-2));
    left: 0;
    z-index: 3;
    display: flex;
    opacity: 0;
    pointer-events: none;
    transform: translateY(4px);
    transition:
      opacity var(--duration-quick) var(--ease-smooth-out),
      transform var(--duration-quick) var(--ease-smooth-out);
  }

  .hint:hover .bubble,
  .hint:focus-within .bubble {
    opacity: 1;
    pointer-events: auto;
    transform: none;
  }

  .content {
    position: relative;
    z-index: 2;
    display: flex;
    flex-direction: column;
    gap: var(--sp-1);
    padding: var(--sp-3);
  }

  .title {
    font-size: 0.8125rem;
    line-height: 1.25rem;
    color: var(--ink);
  }

  .text {
    font-size: 0.75rem;
    line-height: 1.125rem;
    color: var(--ink-dim);
  }
</style>
