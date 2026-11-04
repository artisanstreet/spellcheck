<script lang="ts">
  import type { Snippet } from "svelte";
  import "@artisanstreet/ui/tokens.css";
  import "@artisanstreet/ui/surfaces.css";
  import "../app.css";

  let { children }: { children: Snippet } = $props();
</script>

{@render children()}
