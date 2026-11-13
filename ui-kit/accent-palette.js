export const DEFAULT_ACCENT = '#1687F8';

const LEGACY_ACCENTS = Object.freeze({
  blue: DEFAULT_ACCENT,
  green: '#0F8465',
  violet: '#6C5BD7',
});

export function normalizeHex(value) {
  const migrated = LEGACY_ACCENTS[String(value || '').toLocaleLowerCase('en')] || value;
  let hex = String(migrated || '').trim().replace(/^#/, '').toUpperCase();
  if (/^[0-9A-F]{3}$/.test(hex)) hex = [...hex].map(character => character.repeat(2)).join('');
  return /^[0-9A-F]{6}$/.test(hex) ? `#${hex}` : null;
}

function hexToRgb(hex) {
  const normalized = normalizeHex(hex);
  if (!normalized) throw new TypeError('Invalid HEX color');
  const value = Number.parseInt(normalized.slice(1), 16);
  return { red: value >> 16, green: (value >> 8) & 255, blue: value & 255 };
}

export function rgbToHsl(hex) {
  const { red, green, blue } = hexToRgb(hex);
  const [r, g, b] = [red, green, blue].map(value => value / 255);
  const max = Math.max(r, g, b);
  const min = Math.min(r, g, b);
  const delta = max - min;
  let hue = 0;
  if (delta) {
    if (max === r) hue = 60 * (((g - b) / delta) % 6);
    else if (max === g) hue = 60 * (((b - r) / delta) + 2);
    else hue = 60 * (((r - g) / delta) + 4);
  }
  if (hue < 0) hue += 360;
  const lightness = (max + min) / 2;
  const saturation = delta ? delta / (1 - Math.abs((2 * lightness) - 1)) : 0;
  return { hue, saturation: saturation * 100, lightness: lightness * 100 };
}

export function hslToHex(hue, saturation, lightness) {
  const h = ((hue % 360) + 360) % 360;
  const s = Math.max(0, Math.min(100, saturation)) / 100;
  const l = Math.max(0, Math.min(100, lightness)) / 100;
  const chroma = (1 - Math.abs((2 * l) - 1)) * s;
  const x = chroma * (1 - Math.abs(((h / 60) % 2) - 1));
  const offset = l - (chroma / 2);
  const [r, g, b] = h < 60 ? [chroma, x, 0]
    : h < 120 ? [x, chroma, 0]
      : h < 180 ? [0, chroma, x]
        : h < 240 ? [0, x, chroma]
          : h < 300 ? [x, 0, chroma]
            : [chroma, 0, x];
  return `#${[r, g, b].map(channel => Math.round((channel + offset) * 255).toString(16).padStart(2, '0')).join('').toUpperCase()}`;
}

function mixHex(from, to, amount) {
  const first = hexToRgb(from);
  const second = hexToRgb(to);
  const mixed = ['red', 'green', 'blue'].map(channel => (
    Math.round(first[channel] + ((second[channel] - first[channel]) * amount))
  ));
  return `#${mixed.map(value => value.toString(16).padStart(2, '0')).join('').toUpperCase()}`;
}

function accentRgba(hex, alpha) {
  const { red, green, blue } = hexToRgb(hex);
  return `rgba(${red}, ${green}, ${blue}, ${alpha})`;
}

export function relativeLuminance(hex) {
  const { red, green, blue } = hexToRgb(hex);
  const channels = [red, green, blue].map(value => {
    const normalized = value / 255;
    return normalized <= .04045 ? normalized / 12.92 : ((normalized + .055) / 1.055) ** 2.4;
  });
  return (.2126 * channels[0]) + (.7152 * channels[1]) + (.0722 * channels[2]);
}

export function contrastRatio(first, second) {
  const bright = Math.max(relativeLuminance(first), relativeLuminance(second));
  const dark = Math.min(relativeLuminance(first), relativeLuminance(second));
  return (bright + .05) / (dark + .05);
}

export function buildAccentPalette(seed) {
  const selected = normalizeHex(seed) || DEFAULT_ACCENT;
  const source = rgbToHsl(selected);
  const saturation = Math.max(52, Math.min(88, source.saturation));
  let baseLightness = Math.max(24, Math.min(50, source.lightness));
  let base = hslToHex(source.hue, saturation, baseLightness);
  while (contrastRatio(base, '#FFFFFF') < 4.5 && baseLightness > 20) {
    baseLightness -= 1;
    base = hslToHex(source.hue, saturation, baseLightness);
  }
  const strong = hslToHex(source.hue, saturation, Math.max(18, baseLightness - 9));
  let endLightness = Math.min(48, baseLightness + 3);
  let gradientEnd = hslToHex(source.hue + 8, Math.min(92, saturation + 5), endLightness);
  while (contrastRatio(gradientEnd, '#FFFFFF') < 4.5 && endLightness > 20) {
    endLightness -= 1;
    gradientEnd = hslToHex(source.hue + 8, Math.min(92, saturation + 5), endLightness);
  }
  return {
    selected,
    hue: source.hue,
    tokens: {
      '--accent-base': base,
      '--accent-strong': strong,
      '--accent-gradient-end': gradientEnd,
      '--accent-soft-light': mixHex(base, '#FFFFFF', .88),
      '--accent-soft-dark': mixHex('#1B273B', base, .24),
      '--accent-pressed-light': mixHex(base, '#FFFFFF', .84),
      '--accent-pressed-dark': mixHex('#1B273B', base, .32),
      '--accent-border-light': accentRgba(base, .32),
      '--accent-border-dark': accentRgba(mixHex(base, '#FFFFFF', .28), .42),
      '--accent-translucent-light': accentRgba(base, .12),
      '--accent-translucent-dark': accentRgba(mixHex(base, '#FFFFFF', .24), .16),
      '--accent-glow-light': accentRgba(selected, .2),
      '--accent-glow-dark': accentRgba(selected, .14),
      '--accent-shadow-light': accentRgba(base, .18),
      '--accent-shadow-dark': accentRgba(base, .24),
    },
  };
}
