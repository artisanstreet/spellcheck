<script lang="ts" effect>
  import { Settings, checks_site } from "../../settings/settings.ts";
  import { focused_field } from "./focus.svelte.ts";

  const settings = yield* Settings;
  const preferences = yield* settings.load;
</script>

{#if checks_site(preferences, location.hostname) && focused_field.rect}
  <div class="badge" style:top="{focused_field.rect.bottom - 28}px" style:left="{focused_field.rect.right - 96}px">
    Spellcheck
  </div>
{/if}

<style>
  .badge {
    position: fixed;
    z-index: 2147483647;
    padding: 0.25rem 0.5rem;
    border: 1px solid var(--panel-edge);
    border-radius: 999px;
    background: var(--panel);
    box-shadow: var(--shadow-card);
    color: var(--ink-dim);
    font: 500 0.75rem/1 system-ui, sans-serif;
    pointer-events: none;
  }
</style>
