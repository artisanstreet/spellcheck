<script lang="ts">
  import type { Snippet } from "svelte";

  let { label, title, children }: { label: string; title: Snippet; children: Snippet } = $props();
  const id = $props.id();
</script>

<span class="hint"
  ><button type="button" class="trigger" aria-describedby={id}>{label}</button
  ><span class="bubble" role="tooltip" {id}>
    <span class="title">{@render title()}</span>
    <span class="text">{@render children()}</span>
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
    flex-direction: column;
    gap: var(--sp-1);
    padding: var(--sp-3);
    border-radius: var(--radius-md);
    background:
      linear-gradient(180deg, oklch(1 0 0 / 0.08), oklch(1 0 0 / 0) 44%),
      linear-gradient(145deg, oklch(from var(--glass-near) l c h / 0.22), oklch(from var(--glass-far) l c h / 0.16)),
      oklch(from var(--panel) l c h / 0.8);
    backdrop-filter: blur(20px) saturate(0.6);
    box-shadow:
      0 -1px 0 oklch(1 0 0 / 0.14),
      inset 0 1px 0 oklch(1 0 0 / 0.1),
      inset 0 -1px 0 var(--glass-rim-shade),
      var(--shadow-overlay);
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

  .title {
    font-size: 0.8125rem;
    font-weight: 600;
    line-height: 1.25rem;
    color: transparent;
    background: linear-gradient(var(--ink) 50%, color-mix(in oklch, var(--ink), oklch(0.82 0.05 78) 40%));
    background-clip: text;
  }

  .text {
    font-size: 0.75rem;
    line-height: 1.125rem;
    color: var(--ink);
  }
</style>
