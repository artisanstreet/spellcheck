<script lang="ts" effect>
  import type { Effect } from "effect";

  let {
    label,
    checked,
    toggle,
  }: {
    label: string;
    checked: boolean;
    toggle: (next: boolean) => Effect.Effect<void, unknown>;
  } = $props();
</script>

<button type="button" role="switch" aria-checked={checked} aria-label={label} class="switch" onclick={yield* toggle(!checked)}>
  <span class="thumb"></span>
</button>

<style>
  .switch {
    position: relative;
    flex: none;
    width: 2.5rem;
    height: 1.5rem;
    padding: 0;
    border: 0;
    border-radius: 999px;
    background: var(--bg);
    box-shadow: var(--shadow-inset);
    cursor: pointer;
  }

  .switch:focus-visible {
    outline: 2px solid var(--focus);
    outline-offset: 2px;
  }

  .thumb {
    position: absolute;
    top: 3px;
    left: 3px;
    width: 1.125rem;
    height: 1.125rem;
    border-radius: 999px;
    --thumb-top: color-mix(in oklch, var(--polar-500), oklch(1 0 0) 6%);
    --thumb-bottom: color-mix(in oklch, var(--polar-500), var(--polar-600) 20%);
    background: linear-gradient(var(--thumb-top), var(--thumb-bottom));
    box-shadow: inset 0 1px 0 color-mix(in oklch, var(--thumb-top), oklch(1 0 0) 20%), var(--shadow-press);
    transition:
      transform var(--duration-fast) var(--ease-smooth-out),
      background var(--duration-quick) var(--ease-smooth-out);
  }

  .switch[aria-checked="true"] .thumb {
    background: var(--sky-fill);
    box-shadow: inset 0 0 0 1px var(--sky-edge), inset 0 2px 0 -1px var(--sky-highlight), var(--shadow-press);
    transform: translateX(1rem);
  }
</style>
