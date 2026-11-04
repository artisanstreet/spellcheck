<script lang="ts">
  import type { Snippet } from "svelte";
  import Card from "./card.svelte";
  import DitherImage from "./dither-image.svelte";

  let { children }: { children: Snippet } = $props();
</script>

<main>
  <Card radius="var(--outer-radius)">
    <div class="stack">
      <header>
        <span class="wordmark" role="img" aria-label="Artisan"></span>
        <div class="art">
          <DitherImage src="./images/art/mountain-1.png" fit="contain" pixel_size={0.5} contrast={1.15} brightness={1.25} threshold_bias={0.02} max_resolution={1024} fade_right={0.3} />
        </div>
      </header>
      <div class="inner">
        <Card surface="var(--card-inner)" radius="var(--inner-radius)">
          <span class="pattern" aria-hidden="true"></span>
          <div class="body">{@render children()}</div>
        </Card>
      </div>
    </div>
  </Card>
</main>

<style>
  main {
    --inset: var(--sp-2);
    --outer-radius: calc(var(--radius-md) + var(--inset));
    --inner-radius: var(--radius-md);
    --field-radius: var(--radius-sm);
    display: flex;
    width: 25rem;
    padding: var(--sp-2);
  }

  .stack {
    flex: 1;
    display: flex;
    flex-direction: column;
  }

  header {
    display: flex;
    align-items: flex-start;
    justify-content: space-between;
    gap: var(--sp-6);
    padding: var(--sp-6);
  }

  .art {
    --dither-color: oklch(0.74 0.012 250);
    --dither-opacity: 0.7;
    --dither-mask: linear-gradient(to right, transparent 0%, black 30%);
    position: relative;
    flex: none;
    align-self: end;
    width: 15rem;
    height: 6rem;
    margin: 0 calc(-1 * var(--sp-6)) calc(-1 * var(--sp-6)) 0;
  }

  .wordmark {
    display: block;
    height: 4.5rem;
    aspect-ratio: 311 / 512;
    background-color: currentColor;
    mask-image: url("./assets/wordmark.svg");
    mask-position: center;
    mask-size: contain;
    mask-repeat: no-repeat;
  }

  .inner {
    flex: 1;
    display: flex;
    flex-direction: column;
    margin: 0 var(--inset) var(--inset);
  }

  .body {
    position: relative;
    z-index: 2;
    display: flex;
    flex-direction: column;
    gap: var(--sp-4);
    padding: var(--sp-4);
  }

  .pattern {
    position: absolute;
    left: 0;
    bottom: 0;
    width: 100%;
    height: 46%;
    z-index: 0;
    border-bottom-left-radius: inherit;
    border-bottom-right-radius: inherit;
    overflow: hidden;
    pointer-events: none;
    clip-path: polygon(0% 12%, 8% 4%, 18% 0%, 30% 8%, 42% 26%, 54% 40%, 66% 36%, 78% 46%, 90% 58%, 100% 52%, 100% 100%, 0% 100%);
    mask-image:
      linear-gradient(to right, #000 30%, transparent 100%),
      linear-gradient(to top, #000 45%, transparent 100%);
    mask-composite: intersect;
  }

  .pattern::before {
    content: "";
    position: absolute;
    inset: 0;
    background-color: color-mix(in oklch, var(--ink) 2%, transparent);
    mask: url("data:image/svg+xml,%3Csvg width='84' height='48' viewBox='0 0 84 48' xmlns='http://www.w3.org/2000/svg'%3E%3Cpath d='M0 0h12v6H0V0zm28 8h12v6H28V8zm14-8h12v6H42V0zm14 0h12v6H56V0zm0 8h12v6H56V8zM42 8h12v6H42V8zm0 16h12v6H42v-6zm14-8h12v6H56v-6zm14 0h12v6H70v-6zm0-16h12v6H70V0zM28 32h12v6H28v-6zM14 16h12v6H14v-6zM0 24h12v6H0v-6zm0 8h12v6H0v-6zm14 0h12v6H14v-6zm14 8h12v6H28v-6zm-14 0h12v6H14v-6zm28 0h12v6H42v-6zm14-8h12v6H56v-6zm0-8h12v6H56v-6zm14 8h12v6H70v-6zm0 8h12v6H70v-6zM14 24h12v6H14v-6zm14-8h12v6H28v-6zM14 8h12v6H14V8zM0 8h12v6H0V8z' fill='%23000' fill-rule='evenodd'/%3E%3C/svg%3E") 0 0 / 84px 48px repeat;
  }
</style>
