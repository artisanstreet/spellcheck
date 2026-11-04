<script lang="ts" effect>
  import { Effect, Option } from "effect";
  import { Browser } from "../../browser/browser.ts";
  import { Settings, with_site, type Pickiness, type Preferences } from "../../settings/settings.ts";
  import Hint from "../../ui/hint.svelte";
  import PopupCard from "../../ui/popup-card.svelte";
  import Row from "../../ui/row.svelte";
  import Rule from "../../ui/rule.svelte";
  import Segments from "../../ui/segments.svelte";
  import Switch from "../../ui/switch.svelte";
  import Well from "../../ui/well.svelte";

  const settings = yield* Settings;
  const browser = yield* Browser;
  const site = yield* browser.current_site;
  const accelerator = yield* browser.accelerator;
  const site_name = (host: string) => host.replace(/^www\./, "");
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
    {#if Option.isSome(site)}
      <Rule />
      <Row title="Check on {site_name(site.value)}">
        {#snippet action()}
          <Switch
            label="Check on {site_name(site.value)}"
            checked={!preferences.disabled_sites.includes(site.value)}
            toggle={(checked) => update(with_site(preferences, site.value, checked))}
          />
        {/snippet}
      </Row>
    {/if}
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
        <Hint label="GPU" title="Fast mode is on">
          Your computer has a special chip for heavy work like games and video. Spellcheck uses it, so suggestions show up right away and
          the rest of your computer stays quick.
        </Hint>{:else}
        <Hint label="CPU" title="Running in standard mode">
          Your browser won't let Spellcheck use your computer's fast graphics chip, so it uses the main chip instead. Everything still
          works. Suggestions may just take a moment longer, and your battery may run down a little faster.
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
</style>
