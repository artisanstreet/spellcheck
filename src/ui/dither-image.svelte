<script lang="ts">
  let {
    src,
    fit = "contain",
    pixel_size = 2,
    contrast = 1,
    brightness = 1,
    threshold_bias = 0,
    max_resolution = 512,
    fade_right = 0,
  }: {
    src: string;
    fit?: "contain" | "cover";
    pixel_size?: number;
    contrast?: number;
    brightness?: number;
    threshold_bias?: number;
    max_resolution?: number;
    fade_right?: number;
  } = $props();

  let wrapper = $state<HTMLSpanElement>();
  let mask_url = $state("");

  const thresholds = [0, 8, 2, 10, 12, 4, 14, 6, 3, 11, 1, 9, 15, 7, 13, 5];

  $effect(() => {
    const element = wrapper;
    if (!element) return;
    const image_fit = fit;
    const image_contrast = contrast;
    const image_brightness = brightness;
    const image_threshold = threshold_bias;
    const image_fade_right = Math.max(0, Math.min(1, fade_right));
    const resolution = Math.max(64, max_resolution);
    const sample_size = Math.max(0.5, pixel_size);
    const source = new Image();
    const target = document.createElement("canvas");
    let disposed = false;

    const paint = () => {
      if (disposed || !source.naturalWidth) return;
      const context = target.getContext("2d");
      if (!context) return;
      const sampled_width = Math.max(1, element.clientWidth / sample_size);
      const sampled_height = Math.max(1, element.clientHeight / sample_size);
      const reduction = Math.min(1, resolution / sampled_width, (resolution * 1.5) / sampled_height);
      const width = Math.max(1, Math.round(sampled_width * reduction));
      const height = Math.max(1, Math.round(sampled_height * reduction));
      target.width = width;
      target.height = height;
      const scale = (image_fit === "cover" ? Math.max : Math.min)(
        width / source.naturalWidth,
        height / source.naturalHeight,
      );
      const image_height = source.naturalHeight * scale;
      const image_width = source.naturalWidth * scale;
      context.drawImage(
        source,
        image_fit === "cover" ? (width - image_width) / 2 : 0,
        image_fit === "cover" ? (height - image_height) / 2 : height - image_height,
        image_width,
        image_height,
      );
      const pixels = context.getImageData(0, 0, width, height);

      for (let y = 0; y < height; y++) {
        for (let x = 0; x < width; x++) {
          const index = (y * width + x) * 4;
          const luminance =
            ((pixels.data[index] ?? 0) * 0.2126 +
              (pixels.data[index + 1] ?? 0) * 0.7152 +
              (pixels.data[index + 2] ?? 0) * 0.0722) /
            255;
          const threshold = ((thresholds[(y % 4) * 4 + (x % 4)] ?? 0) + 0.5) / 16;
          const fade = image_fade_right > 0
            ? 1 - Math.max(0, (x / width - (1 - image_fade_right)) / image_fade_right)
            : 1;
          const adjusted = Math.max(0, Math.min(1, (luminance * image_brightness - 0.5) * image_contrast + 0.5)) * fade;
          const visible = adjusted > threshold + image_threshold && (pixels.data[index + 3] ?? 0) > 0;
          pixels.data[index] = 255;
          pixels.data[index + 1] = 255;
          pixels.data[index + 2] = 255;
          pixels.data[index + 3] = visible ? 255 : 0;
        }
      }

      context.putImageData(pixels, 0, 0);
      mask_url = target.toDataURL();
    };

    source.onload = paint;
    source.src = src;
    const observer = new ResizeObserver(paint);
    observer.observe(element);

    return () => {
      disposed = true;
      source.onload = null;
      observer.disconnect();
    };
  });
</script>

<span bind:this={wrapper} aria-hidden="true" class="artwork">
  <span
    class="dots"
    style:mask-image={mask_url ? `url("${mask_url}")` : "none"}
    style:visibility={mask_url ? "visible" : "hidden"}
  ></span>
</span>

<style>
  .artwork {
    position: absolute;
    inset: 0;
    width: 100%;
    height: 100%;
    pointer-events: none;
    mask-image: var(--dither-mask, none);
  }

  .dots {
    position: absolute;
    inset: 0;
    image-rendering: pixelated;
    mask-size: 100% 100%;
    mask-repeat: no-repeat;
    background-color: var(--dither-color, var(--ink));
    opacity: var(--dither-opacity, 0.25);
  }
</style>
