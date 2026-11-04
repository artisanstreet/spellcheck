<script lang="ts">
  import { Kind } from "../suggestions/issue.ts";

  let {
    kind,
    text,
    certain,
    active,
    select,
  }: { kind: Kind; text: string; certain: boolean; active: boolean; select: (anchor: HTMLElement) => void } = $props();

  const tone = $derived(Kind.$match(kind, { Spelling: () => "spelling", Grammar: () => "grammar" }));
</script>

<button type="button" class="mark" data-tone={tone} class:unsure={!certain} aria-expanded={active} onclick={(event) => select(event.currentTarget)}
  >{text}</button
>

<style>
  .mark {
    --mark-ink: var(--mark-spelling);
    padding: 0 0 2px;
    margin: 0 0 -2px;
    font: inherit;
    color: inherit;
    letter-spacing: inherit;
    white-space: pre-wrap;
    background:
      linear-gradient(var(--mark-ink), var(--mark-ink)) bottom / 100% 2px no-repeat,
      transparent;
    border: 0;
    border-radius: 2px 2px 0 0;
    cursor: pointer;
    transition: background-color var(--duration-micro) var(--ease-smooth-out);
  }

  .mark.unsure {
    background:
      radial-gradient(circle at 1px 1px, var(--mark-ink) 1px, transparent 1.25px) 0 100% / 4px 2px repeat-x,
      transparent;
  }

  .mark[data-tone="grammar"] {
    --mark-ink: var(--mark-grammar);
  }

  .mark:hover,
  .mark[aria-expanded="true"] {
    background-color: color-mix(in oklch, var(--mark-ink) 18%, transparent);
  }
</style>
