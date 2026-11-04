<script lang="ts">
  import { Draft, Issue, Kind } from "../../suggestions/issue.ts";
  import Field from "./field.svelte";

  const text = `Hi Maria,

Thanks for sending the slides over. I recieved them this morning and the team will go through them tomorow. Could you send me the the final numbers before friday? Dana needs to sign of on the budget, and a late change might effect the forecast.

Best,
Sam`;

  const at = (needle: string, kind: Kind, message: string, replacements: ReadonlyArray<string>) => {
    const start = text.indexOf(needle);
    return new Issue({ start, end: start + needle.length, kind, message, replacements });
  };

  const start = new Draft({
    text,
    issues: [
      at("recieved", Kind.Spelling(), "This word isn't in the dictionary. It looks like a misspelling of “received”.", ["received"]),
      at("tomorow", Kind.Spelling(), "This word isn't in the dictionary.", ["tomorrow", "tomorrows"]),
      at("the the", Kind.Grammar(), "The same word appears twice in a row.", ["the"]),
      at("friday", Kind.Grammar(), "Days of the week start with a capital letter.", ["Friday"]),
      at("sign of", Kind.Grammar(), "In this phrase, “sign off” means to approve something.", ["sign off"]),
      at(
        "effect",
        Kind.Grammar(),
        "This word may not fit here, but spellcheck isn't confident enough to suggest a fix. Give it a second look.",
        [],
      ),
    ],
  });

  let fields: Array<Field> = $state([]);
</script>

<svelte:head>
  <title>Underline workbench</title>
</svelte:head>

<main>
  <header>
    <h1>Underline workbench</h1>
    <button type="button" class="reset" onclick={() => fields.forEach((field) => field.reset())}>Reset</button>
  </header>
  <div class="pages">
    <section class="page" data-surface="light">
      <h2>Light page</h2>
      <Field bind:this={fields[0]} {start} surface="light" />
    </section>
    <section class="page" data-surface="dark">
      <h2>Dark page</h2>
      <Field bind:this={fields[1]} {start} surface="dark" />
    </section>
  </div>
</main>

<style>
  main {
    display: flex;
    flex-direction: column;
    gap: var(--sp-6);
    max-width: 72rem;
    margin: 0 auto;
    padding: var(--sp-8) var(--sp-6);
  }

  header {
    display: flex;
    align-items: center;
    justify-content: space-between;
  }

  h1 {
    margin: 0;
    font-size: 1.125rem;
    font-weight: 600;
  }

  .reset {
    min-height: 2rem;
    padding: 0 var(--sp-3);
    font: inherit;
    font-size: 0.875rem;
    font-weight: 500;
    color: var(--ink);
    background: var(--hover-fill);
    border: 1px solid var(--hover-edge);
    border-radius: var(--radius-sm);
    cursor: pointer;
  }

  .pages {
    display: grid;
    grid-template-columns: repeat(auto-fit, minmax(min(100%, 28rem), 1fr));
    gap: var(--sp-6);
  }

  .page {
    display: flex;
    flex-direction: column;
    gap: var(--sp-3);
    padding: var(--sp-6);
    border-radius: var(--radius-lg);
  }

  .page[data-surface="light"] {
    background: oklch(0.96 0.003 260);
  }

  .page[data-surface="dark"] {
    background: oklch(0.19 0.008 260);
  }

  h2 {
    margin: 0;
    font-size: 0.75rem;
    font-weight: 600;
  }

  .page[data-surface="light"] h2 {
    color: oklch(0.45 0 0);
  }

  .page[data-surface="dark"] h2 {
    color: oklch(0.72 0 0);
  }
</style>
