<script lang="ts" effect>
  import { Effect } from "effect";
  import { Settings, type Preferences } from "../../settings/settings.ts";
  import Card from "../../ui/card.svelte";
  import Row from "../../ui/row.svelte";

  const settings = yield* Settings;
  let preferences: Preferences = $state(yield* settings.load);

  const set_enabled = (enabled: boolean) =>
    Effect.gen(function* () {
      const next = { ...preferences, enabled };
      yield* settings.save(next);
      preferences = next;
    });
</script>

<main>
  <Card radius="var(--radius-lg)">
    <Row title="Spellcheck" detail={preferences.enabled ? "Checking as you type" : "Paused everywhere"}>
      {#snippet action()}
        <button
          type="button"
          role="switch"
          aria-checked={preferences.enabled}
          aria-label="Check spelling and grammar"
          class="switch"
          onclick={yield* set_enabled(!preferences.enabled)}
        >
          <span class="thumb"></span>
        </button>
      {/snippet}
    </Row>
  </Card>
</main>

<style>
  main {
    display: flex;
    width: 20rem;
    padding: var(--sp-3);
  }

  .switch {
    position: relative;
    width: 2.25rem;
    height: 1.25rem;
    padding: 0;
    border: 1px solid var(--control-edge);
    border-radius: 999px;
    background: var(--surface-2);
    cursor: pointer;
  }

  .switch[aria-checked="true"] {
    border-color: var(--primary-edge);
    background: var(--primary);
  }

  .switch:focus-visible {
    outline: 2px solid var(--focus);
    outline-offset: 2px;
  }

  .thumb {
    position: absolute;
    top: 50%;
    left: 0.125rem;
    width: 0.875rem;
    height: 0.875rem;
    border-radius: 999px;
    background: var(--ink-dim);
    transform: translateY(-50%);
    transition: transform 150ms ease-out;
  }

  .switch[aria-checked="true"] .thumb {
    background: var(--primary-ink);
    transform: translate(1rem, -50%);
  }
</style>
