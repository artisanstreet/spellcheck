<script lang="ts">
  import type { Snippet } from "svelte";

  let { children }: { children: Snippet } = $props();
</script>

<div class="well">
  <p>{@render children()}</p>
</div>

<style>
  .well {
    padding: var(--sp-4);
    border-radius: var(--field-radius);
    background: var(--bg);
    box-shadow: var(--shadow-inset);
  }

  p {
    margin: 0;
    font-size: 0.75rem;
    line-height: 1.125rem;
    color: var(--ink-dim);
  }

  .well :global(a),
  .well :global(a:visited),
  .well :global(button) {
    padding: 0;
    font: inherit;
    color: oklch(0.88 0.045 82);
    text-decoration: underline;
    text-underline-offset: 0.15em;
    background: none;
    border: 0;
    cursor: pointer;
  }
</style>
