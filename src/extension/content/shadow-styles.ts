export const shadow_styles = (css: string): string =>
  css
    .replace(/@font-face\s*\{[^}]*\}/g, "")
    .replace(/:root\[([^\]]+)\]/g, ":host([$1])")
    .replace(/:root/g, ":host");
