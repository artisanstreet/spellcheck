<script lang="ts">
  import { Issue, Kind } from "../suggestions/issue.ts";
  import Button from "./button.svelte";

  let {
    issue,
    accept,
    dismiss,
    learn,
  }: { issue: Issue; accept: (replacement: string) => void; dismiss: () => void; learn?: (() => void) | undefined } = $props();

  const tone = $derived(Kind.$match(issue.kind, { Spelling: () => "spelling", Grammar: () => "grammar" }));
  const title = $derived(Kind.$match(issue.kind, { Spelling: () => "Spelling", Grammar: () => "Grammar" }));
</script>

<div class="card" role="dialog" aria-label="{title} suggestion" data-tone={tone}>
  <div class="kind">{title}</div>
  <p class="message">{issue.message}</p>
  <div class="actions">
    {#each issue.replacements as replacement, index (replacement)}
      <Button tone={index === 0 ? "sand" : "secondary"} onclick={() => accept(replacement)}>{replacement === "" ? "Remove" : replacement}</Button>
    {/each}
    {#if learn}
      <Button tone="secondary" onclick={learn}>Add to dictionary</Button>
    {/if}
    <Button aria-label="Wrong suggestion, hide it" title="Wrong suggestion" onclick={dismiss}>
      <svg class="thumb" viewBox="0 0 24 24" aria-hidden="true">
        <path d="M17 14V2" />
        <path
          d="M9 18.12 10 14H4.17a2 2 0 0 1-1.92-2.56l2.33-8A2 2 0 0 1 6.5 2H20a2 2 0 0 1 2 2v8a2 2 0 0 1-2 2h-2.76a2 2 0 0 0-1.79 1.11L12 22a3.13 3.13 0 0 1-3-3.88Z"
        />
      </svg>
    </Button>
  </div>
</div>

<style>
  .card {
    --mark-ink: var(--mark-spelling-on-glass);
    display: flex;
    flex-direction: column;
    gap: var(--sp-2);
    width: 17rem;
    padding: var(--sp-3);
    border-radius: var(--radius-md);
    color: var(--ink);
    font-family: var(--font-sans);
    background:
      linear-gradient(180deg, oklch(1 0 0 / 0.08), oklch(1 0 0 / 0) 44%),
      linear-gradient(145deg, oklch(from var(--glass-near) l c h / 0.22), oklch(from var(--glass-far) l c h / 0.16)),
      oklch(from var(--panel) l c h / var(--glass-alpha));
    backdrop-filter: blur(20px) saturate(0.6);
    box-shadow:
      0 -1px 0 oklch(1 0 0 / 0.14),
      inset 0 1px 0 oklch(1 0 0 / 0.1),
      inset 0 -1px 0 var(--glass-rim-shade),
      var(--shadow-overlay);
  }

  .card[data-tone="grammar"] {
    --mark-ink: var(--mark-grammar-on-glass);
  }

  .kind {
    font-size: 0.75rem;
    font-weight: 600;
    line-height: 1rem;
    letter-spacing: 0.01em;
    color: var(--mark-ink);
  }

  .message {
    margin: 0;
    font-size: 0.8125rem;
    line-height: 1.25rem;
    color: var(--glass-ink-dim);
  }

  .actions {
    display: flex;
    flex-wrap: wrap;
    gap: var(--sp-2);
  }

  .thumb {
    margin: 0 calc(-1 * var(--sp-1));
    color: var(--ink-faint);
    width: 1rem;
    height: 1rem;
    fill: none;
    stroke: currentColor;
    stroke-width: 2;
    stroke-linecap: round;
    stroke-linejoin: round;
    transition: color var(--duration-micro) var(--ease-smooth-out);
  }

  :global(.button:hover) > .thumb {
    color: var(--ink-dim);
  }
</style>
