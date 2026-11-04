<script lang="ts" effect>
  import { Effect, Option } from "effect";
  import { Browser } from "../../browser/browser.ts";
  import { Settings, checks_site, with_site, type Pickiness, type Preferences } from "../../settings/settings.ts";
  import Heading from "../../ui/heading.svelte";
  import PopupCard from "../../ui/popup-card.svelte";
  import Row from "../../ui/row.svelte";
  import Segments from "../../ui/segments.svelte";
  import Switch from "../../ui/switch.svelte";
  import Well from "../../ui/well.svelte";

  const settings = yield* Settings;
  const browser = yield* Browser;
  const site = yield* browser.current_site;
  const site_name = (host: string) => host.replace(/^www\./, "");
  let preferences: Preferences = $state(yield* settings.load);

  const update = (next: Preferences) =>
    Effect.gen(function* () {
      yield* settings.save(next);
      preferences = next;
    });

  const pickiness_names: Record<Pickiness, string> = { relaxed: "Relaxed", balanced: "Balanced", strict: "Strict" };
  const pickiness_details: Record<Pickiness, string> = {
    relaxed: "Only clear mistakes",
    balanced: "Mistakes and likely slips",
    strict: "Anything worth a second look",
  };

  const checking_here = $derived(Option.match(site, { onNone: () => preferences.enabled, onSome: (host) => checks_site(preferences, host) }));
  const status = $derived(
    !preferences.enabled
      ? "Paused everywhere"
      : checking_here
        ? "Checking as you type"
        : Option.match(site, { onNone: () => "Paused", onSome: (host) => `Off on ${site_name(host)}` }),
  );
</script>

<svelte:head>
  <title>Spellcheck</title>
</svelte:head>

<PopupCard>
  <Heading title="Spellcheck" text={status}>
    {#snippet leading()}
      <span class="status" data-on={checking_here} aria-hidden="true"></span>
    {/snippet}
  </Heading>

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
    Your writing never leaves this device. <button type="button" onclick={yield* browser.open_options}>Settings and dictionary</button>
  </Well>
</PopupCard>

<style>
  .status {
    flex: none;
    width: 0.5rem;
    height: 0.5rem;
    margin: 0 var(--sp-1);
    border-radius: 999px;
    background: var(--ink-faint);
  }

  .status[data-on="true"] {
    background: var(--ok);
  }

  .rows {
    display: flex;
    flex-direction: column;
    margin: 0 calc(-1 * var(--sp-4));
  }

  .rows > :global(* + *) {
    box-shadow:
      inset 0 1px 0 var(--rule-shade),
      inset 0 2px 0 var(--rule-light);
  }
</style>
