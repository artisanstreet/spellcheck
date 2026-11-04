<script lang="ts">
  import Card from "../../ui/card.svelte";
  import Row from "../../ui/row.svelte";
</script>

<main>
  <Card radius="var(--radius-lg)">
    <Row title="Personal dictionary" detail="Words you add from suggestions will show up here." />
  </Card>
</main>

<style>
  main {
    display: flex;
    max-width: 40rem;
    margin: 0 auto;
    padding: var(--sp-6, 1.5rem) var(--sp-4);
  }
</style>
