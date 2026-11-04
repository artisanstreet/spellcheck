<script lang="ts">
  import { Issue, Kind } from "../suggestions/issue.ts";

  let { issue, accept, dismiss }: { issue: Issue; accept: (replacement: string) => void; dismiss: () => void } = $props();

  const tone = $derived(Kind.$match(issue.kind, { Spelling: () => "spelling", Grammar: () => "grammar" }));
  const title = $derived(Kind.$match(issue.kind, { Spelling: () => "Spelling", Grammar: () => "Grammar" }));
</script>

<div class="card" role="dialog" aria-label="{title} suggestion" data-tone={tone}>
  <div class="header">
    <div class="kind"><span class="dot"></span>{title}</div>
    <button type="button" class="dismiss" aria-label="Wrong suggestion, hide it" title="Wrong suggestion" onclick={dismiss}>
      <svg viewBox="0 0 24 24" aria-hidden="true">
        <path d="M17 14V2" />
        <path
          d="M9 18.12 10 14H4.17a2 2 0 0 1-1.92-2.56l2.33-8A2 2 0 0 1 6.5 2H20a2 2 0 0 1 2 2v8a2 2 0 0 1-2 2h-2.76a2 2 0 0 0-1.79 1.11L12 22a3.13 3.13 0 0 1-3-3.88Z"
        />
      </svg>
    </button>
  </div>
  <p class="message">{issue.message}</p>
  {#if issue.replacements.length > 0}
    <div class="replacements">
      {#each issue.replacements as replacement, index (replacement)}
        <button type="button" class="replacement" class:primary={index === 0} onclick={() => accept(replacement)}>
          {replacement}
        </button>
      {/each}
    </div>
  {/if}
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
    display: flex;
    align-items: center;
    gap: var(--sp-2);
    font-size: 0.75rem;
    font-weight: 600;
    line-height: 1rem;
    letter-spacing: 0.01em;
    color: var(--mark-ink);
  }

  .dot {
    width: 0.5rem;
    height: 0.5rem;
    border-radius: 50%;
    background: var(--mark-ink);
  }

  .message {
    margin: 0;
    font-size: 0.8125rem;
    line-height: 1.25rem;
    color: var(--glass-ink-dim);
  }

  .replacements {
    display: flex;
    flex-wrap: wrap;
    gap: var(--sp-2);
  }

  .replacement {
    min-height: 2rem;
    padding: 0 var(--sp-3);
    font: inherit;
    font-size: 0.875rem;
    font-weight: 600;
    color: var(--ink);
    background: var(--hover-fill);
    border: 1px solid var(--hover-edge);
    border-radius: var(--radius-sm);
    cursor: pointer;
    transition: filter var(--duration-micro) var(--ease-smooth-out);
  }

  .replacement.primary {
    --sand-top: oklch(0.92 0.035 88);
    --sand-bottom: oklch(0.82 0.05 78);
    color: oklch(0.27 0.025 70);
    background: linear-gradient(var(--sand-top), color-mix(in oklch, var(--sand-top), var(--sand-bottom)), var(--sand-bottom));
    border-color: transparent;
    box-shadow: inset 0 1px 0 color-mix(in oklch, var(--sand-top), oklch(1 0 0) 30%), var(--shadow-press);
  }

  .replacement:hover {
    filter: brightness(1.08);
  }

  .replacement:active {
    filter: brightness(0.94);
  }

  .header {
    display: flex;
    align-items: center;
    justify-content: space-between;
  }

  .dismiss {
    display: grid;
    place-items: center;
    width: 1.75rem;
    height: 1.75rem;
    margin: -0.375rem -0.375rem -0.375rem 0;
    padding: 0;
    color: var(--glass-ink-dim);
    background: none;
    border: 0;
    cursor: pointer;
    transition: color var(--duration-micro) var(--ease-smooth-out);
  }

  .dismiss:hover {
    color: var(--ink);
  }

  .dismiss svg {
    width: 1rem;
    height: 1rem;
    fill: none;
    stroke: currentColor;
    stroke-width: 2;
    stroke-linecap: round;
    stroke-linejoin: round;
  }
</style>
