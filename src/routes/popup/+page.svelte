<script lang="ts" effect>
  import { Effect, Option } from "effect";
  import { Browser } from "../../browser/browser.ts";
  import { Settings, with_site, type Pickiness, type Preferences } from "../../settings/settings.ts";
  import PopupCard from "../../ui/popup-card.svelte";
  import Row from "../../ui/row.svelte";
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
    <Row title="Check everywhere">
      {#snippet action()}
        <Switch label="Check everywhere" checked={preferences.enabled} toggle={(enabled) => update({ ...preferences, enabled })} />
      {/snippet}
    </Row>
    {#if Option.isSome(site)}
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

  <Well>
    Spellcheck by Artisan Street is an on-device spellchecker powered by a small neural network, running on your {accelerator}. The
    extension is free. You can find its repository <a href={repository} target="_blank" rel="noreferrer">here</a>.
  </Well>
</PopupCard>

<style>
  .rows {
    display: flex;
    flex-direction: column;
    margin: calc(-1 * var(--sp-4)) calc(-1 * var(--sp-4)) 0;
  }

  .rows > :global(* + *) {
    box-shadow:
      inset 0 1px 0 var(--rule-shade),
      inset 0 2px 0 var(--rule-light);
  }
</style>
