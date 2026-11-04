<script lang="ts">
  import type { Snippet } from "svelte";
  import Outline from "./outline.svelte";

  let {
    children,
    surface = "var(--bg)",
    radius = "var(--radius-lg)",
    key = false,
  }: { children?: Snippet; surface?: string; radius?: string; key?: boolean } = $props();
</script>

<div class="card" data-key={key} style:--card-surface={surface} style:--card-radius={radius}>
  <Outline />
  {@render children?.()}
</div>

<style>
  .card {
    position: relative;
    flex: 1;
    display: flex;
    flex-direction: column;
    min-height: 0;
    border-radius: var(--card-radius);
    background: var(--card-surface);
    box-shadow: var(--shadow-rest);
  }

  .card[data-key="true"] {
    overflow: hidden;
    box-shadow: 0 3px 4px -3px oklch(0 0 0 / 0.4);
    transition:
      transform var(--duration-quick) var(--ease-smooth-out),
      box-shadow var(--duration-quick) var(--ease-smooth-out);
  }

  .card[data-key="true"]:has(:global(:active:enabled)) {
    transform: translateY(1.5px);
    box-shadow: 0 0 1px -1px oklch(0 0 0 / 0.4);
    transition-duration: var(--duration-micro);
    transition-timing-function: ease-out;
  }
</style>
