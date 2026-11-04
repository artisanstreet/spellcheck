<script lang="ts">
  import type { Snippet } from "svelte";
  import Outline from "./outline.svelte";

  let {
    children,
    surface = "var(--bg)",
    radius = "var(--radius-lg)",
  }: { children?: Snippet; surface?: string; radius?: string } = $props();
</script>

<div class="card" style:--card-surface={surface} style:--card-radius={radius}>
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
</style>
