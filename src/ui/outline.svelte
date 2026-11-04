<script lang="ts">
  const id = $props.id();
</script>

<svg class="outline" aria-hidden="true" focusable="false">
  <defs>
    <linearGradient id="{id}-rim" x1="0%" y1="0%" x2="0%" y2="100%">
      <stop offset="0" class="rim-top" />
      <stop offset="1" class="rim-bottom" />
    </linearGradient>
    <linearGradient id="{id}-highlight" x1="0%" y1="0%" x2="0%" y2="100%">
      <stop offset="0" class="highlight-top" />
      <stop offset="1" class="highlight-bottom" />
    </linearGradient>
  </defs>
  <rect class="rim" stroke="url(#{id}-rim)" stroke-width="1" />
  <rect class="highlight" stroke="url(#{id}-highlight)" stroke-width="1" />
</svg>

<style>
  .outline {
    position: absolute;
    inset: 0;
    width: 100%;
    height: 100%;
    z-index: 1;
    pointer-events: none;
    fill: none;
  }

  .rim {
    x: 0.5px;
    y: 0.5px;
    width: calc(100% - 1px);
    height: calc(100% - 1px);
    rx: calc(var(--card-radius) - 0.5px);
  }

  .highlight {
    x: 1.5px;
    y: 1.5px;
    width: calc(100% - 3px);
    height: calc(100% - 3px);
    rx: calc(var(--card-radius) - 1.5px);
  }

  .rim-top {
    stop-color: color-mix(in oklch, var(--card-surface), var(--white) 4%);
  }

  .rim-bottom {
    stop-color: color-mix(in oklch, var(--card-surface), var(--black) var(--bevel-shade));
  }

  .highlight-top {
    stop-color: color-mix(in oklch, var(--card-surface), var(--white) 12%);
  }

  .highlight-bottom {
    stop-color: var(--card-surface);
  }
</style>
