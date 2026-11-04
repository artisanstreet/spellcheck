<script lang="ts">
  import type { Snippet } from "svelte";

  let {
    leading,
    title,
    title_extra,
    detail,
    action,
    children,
  }: {
    leading?: Snippet;
    title: string;
    title_extra?: Snippet;
    detail?: string;
    action?: Snippet;
    children?: Snippet;
  } = $props();
</script>

<div class="row">
  <div class="line">
    {@render leading?.()}
    <div class="text">
      <span class="title">{title}{@render title_extra?.()}</span>
      {#if detail}
        <span class="detail">{detail}</span>
      {/if}
    </div>
    {#if action}
      <div class="action">{@render action()}</div>
    {/if}
  </div>
  {#if children}
    <div class="more">{@render children()}</div>
  {/if}
</div>

<style>
  .row {
    display: flex;
    flex-direction: column;
    gap: var(--sp-4);
    padding: var(--sp-4);
  }

  .line {
    display: flex;
    align-items: center;
    gap: var(--sp-3);
    min-height: 2.25rem;
  }

  .text {
    display: flex;
    flex: 1;
    flex-direction: column;
    min-width: 0;
    font-size: 0.875rem;
    line-height: 1.25rem;
  }

  .title {
    display: flex;
    align-items: center;
    flex-wrap: wrap;
    gap: var(--sp-2);
    color: var(--ink);
  }

  .detail {
    overflow: hidden;
    color: var(--ink-dim);
    text-overflow: ellipsis;
    white-space: nowrap;
  }

  .more:empty {
    display: none;
  }

  .action {
    display: flex;
    flex: none;
    align-items: center;
    gap: var(--sp-2);
  }
</style>
