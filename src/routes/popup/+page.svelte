<script lang="ts" effect>
  import { Effect } from "effect";
  import { Browser } from "../../browser/browser.ts";
  import { Settings, type Pickiness, type Preferences } from "../../settings/settings.ts";
  import Hint from "../../ui/hint.svelte";
  import PopupCard from "../../ui/popup-card.svelte";
  import Row from "../../ui/row.svelte";
  import Rule from "../../ui/rule.svelte";
  import Segments from "../../ui/segments.svelte";
  import Switch from "../../ui/switch.svelte";
  import Well from "../../ui/well.svelte";

  const settings = yield* Settings;
  const browser = yield* Browser;
  const accelerator = yield* browser.accelerator;
  let preferences: Preferences = $state(yield* settings.load);

  const update = (next: Preferences) =>
    Effect.gen(function* () {
      yield* settings.save(next);
      preferences = next;
    });

  const repository = "https://github.com/artisanstreet/spellcheck";

  const pickiness_names: Record<Pickiness, string> = { relaxed: "Relaxed", balanced: "Balanced", strict: "Strict" };
  const pickiness_details: Record<Pickiness, string> = {
    relaxed: "Only clear mistakes",
    balanced: "Mistakes and likely slips",
    strict: "Anything worth a second look",
  };
</script>

<svelte:head>
  <title>Spellcheck</title>
</svelte:head>

<PopupCard>
  <div class="rows">
    <Row title="Check my writing" detail={preferences.enabled ? "Underlining mistakes as you type" : "Paused on every site"}>
      {#snippet action()}
        <Switch label="Check my writing" checked={preferences.enabled} toggle={(enabled) => update({ ...preferences, enabled })} />
      {/snippet}
    </Row>
    <Rule />
    <Row title="Pickiness" detail={pickiness_details[preferences.pickiness]}>
      <Segments
        label="Pickiness"
        choices={["relaxed", "balanced", "strict"] as const}
        selected={preferences.pickiness}
        name={(choice) => pickiness_names[choice]}
        choose={(pickiness) => update({ ...preferences, pickiness })}
      />
    </Row>
  </div>

  <div class="about">
    <Well>
      <span class="name">Spellcheck by Artisan Street</span> is an on-device spellchecker powered by a small neural network, running on
      your
      {#if accelerator === "GPU"}
        <Hint label="GPU">
          {#snippet title()}Spellcheck is graphics accelerated{/snippet}
          The GPU on your device is accelerating computation for spellcheck. You're doing great!
        </Hint>{:else}
        <Hint label="CPU">
          {#snippet title()}Spellcheck is <span class="not">not</span> graphics accelerated{/snippet}
          Your browser isn't letting spellcheck use the GPU on your device, so the CPU does the
          computation instead. Everything still works, it's just slower and uses more battery. Updating your browser often turns
          acceleration on.
        </Hint>{/if}. The extension is free and licensed under BSD-3. You can find its repository
      <a href={repository} target="_blank" rel="noreferrer">here</a>.
    </Well>
  </div>
</PopupCard>

<style>
  .rows {
    display: flex;
    flex-direction: column;
    margin: calc(-1 * var(--sp-4)) calc(-1 * var(--sp-4)) 0;
  }

  .about {
    position: relative;
  }

  .name {
    color: var(--ink);
  }

  .not {
    color: var(--red-400);
  }
</style>
