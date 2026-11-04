<script lang="ts">
  import { Issue, Kind } from "../suggestions/issue.ts";

  let { issues }: { issues: ReadonlyArray<Issue> } = $props();

  const tone = $derived(issues.some((issue) => Kind.$is("Spelling")(issue.kind)) ? "spelling" : "grammar");
  const label = $derived(
    issues.length === 0 ? "No suggestions" : `${issues.length} suggestion${issues.length === 1 ? "" : "s"}`,
  );
</script>

<span class="count" data-tone={issues.length === 0 ? "clear" : tone} role="status" aria-label={label}>
  {#if issues.length > 0}{issues.length}{/if}
</span>

<style>
  .count {
    --count-ink: var(--mark-spelling);
    display: inline-grid;
    place-items: center;
    min-width: 1.25rem;
    height: 1.25rem;
    padding: 0 0.375rem;
    font-family: var(--font-sans);
    font-size: 0.6875rem;
    font-weight: 700;
    font-variant-numeric: tabular-nums;
    line-height: 1;
    color: var(--mark-on-spelling);
    background: var(--count-ink);
    border-radius: 999px;
    box-shadow:
      inset 0 1px 0 oklch(1 0 0 / 0.25),
      0 1px 2px oklch(0 0 0 / 0.25);
    transition:
      background-color var(--duration-quick) var(--ease-smooth-out),
      min-width var(--duration-quick) var(--ease-smooth-out);
  }

  .count[data-tone="grammar"] {
    --count-ink: var(--mark-grammar);
    color: oklch(0.25 0.05 70);
  }

  .count[data-tone="clear"] {
    min-width: 0.5rem;
    height: 0.5rem;
    padding: 0;
    background: var(--mark-clear);
    box-shadow: none;
  }
</style>
