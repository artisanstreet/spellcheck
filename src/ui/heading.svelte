<script lang="ts">
  import type { Snippet } from "svelte";

  let {
    title,
    text,
    working = false,
    leading,
  }: { title: string; text?: string | Snippet; working?: boolean; leading?: Snippet } = $props();
</script>

<div class="heading">
  {@render leading?.()}
  <div class="words">
    <h1 data-working={working}>{title}</h1>
    {#if text}
      <p>
        {#if typeof text === "string"}
          {text}
        {:else}
          {@render text()}
        {/if}
      </p>
    {/if}
  </div>
</div>

<style>
  .heading {
    display: flex;
    align-items: center;
    gap: var(--sp-3);
  }

  .words {
    display: flex;
    flex-direction: column;
    gap: 2px;
    min-width: 0;
  }

  h1 {
    margin: 0;
    font-size: 0.9375rem;
    line-height: 1.25rem;
    font-weight: 600;
  }

  h1[data-working="true"] {
    color: transparent;
    background: linear-gradient(
        100deg,
        var(--ink) 35%,
        color-mix(in oklch, var(--ink), var(--ink-dim) 70%) 50%,
        var(--ink) 65%
      )
      0 0 / 250% 100%;
    background-clip: text;
    animation: shimmer 1.6s linear infinite;
  }

  @keyframes shimmer {
    from {
      background-position: 100% 0;
    }

    to {
      background-position: -150% 0;
    }
  }

  p {
    margin: 0;
    font-size: 0.75rem;
    line-height: 1.125rem;
    color: var(--ink-dim);
  }

  @media (prefers-reduced-motion: reduce) {
    h1[data-working="true"] {
      animation: none;
      color: var(--ink);
      background: none;
    }
  }
</style>
