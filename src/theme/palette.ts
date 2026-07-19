import { createDarkTheme, createLightTheme, type BrandVariants, type Theme } from '@fluentui/react-components';

/** Same HSL->Hex formula as farbpalette-web-app.html, so results match 1:1. */
export function hslToHex(h: number, s: number, l: number): string {
  s /= 100;
  l /= 100;
  const k = (n: number) => (n + h / 30) % 12;
  const a = s * Math.min(l, 1 - l);
  const f = (n: number) => {
    const c = l - a * Math.max(-1, Math.min(k(n) - 3, Math.min(9 - k(n), 1)));
    return Math.round(255 * c)
      .toString(16)
      .padStart(2, '0');
  };
  return ('#' + f(0) + f(8) + f(4)).toUpperCase();
}

// Palette generated from farbpalette-web-app.html with hue 228 (Indigo-Blau, the tool's default).
export const lightPalette = {
  background: hslToHex(228, 18, 98),
  surface: '#FFFFFF',
  surface2: hslToHex(228, 14, 95),
  border: hslToHex(228, 12, 90),
  text: hslToHex(228, 16, 10),
  text2: hslToHex(228, 8, 41),
  accent: hslToHex(228, 68, 54),
  accentHover: hslToHex(228, 68, 46),
  accentSoft: hslToHex(228, 68, 94),
  success: '#1F9D63',
  warning: '#D9822B',
  error: '#D4383E',
};

export const darkPalette = {
  background: hslToHex(228, 14, 7),
  surface: hslToHex(228, 13, 11),
  surface2: hslToHex(228, 12, 15),
  border: hslToHex(228, 11, 21),
  text: hslToHex(228, 12, 94),
  text2: hslToHex(228, 8, 66),
  accent: hslToHex(228, 74, 68),
  accentHover: hslToHex(228, 78, 74),
  accentSoft: hslToHex(228, 45, 21),
  success: '#34C384',
  warning: '#E89A4B',
  error: '#E85B60',
};

// 16-step brand ramp (shade 10 = darkest, 160 = lightest) at the same hue/saturation as
// the accent color, so every Fluent component (buttons, checked toggles, focus rings, ...)
// derives consistently from the palette instead of Fluent's default blue.
const brand: BrandVariants = {
  10: hslToHex(228, 60, 8),
  20: hslToHex(228, 62, 15),
  30: hslToHex(228, 64, 21),
  40: hslToHex(228, 66, 27),
  50: hslToHex(228, 67, 33),
  60: hslToHex(228, 68, 39),
  70: lightPalette.accentHover,
  80: lightPalette.accent,
  90: hslToHex(228, 66, 60),
  100: hslToHex(228, 60, 66),
  110: hslToHex(228, 54, 72),
  120: hslToHex(228, 46, 78),
  130: hslToHex(228, 38, 84),
  140: hslToHex(228, 30, 89),
  150: hslToHex(228, 22, 93),
  160: hslToHex(228, 14, 97),
};

// Suggested per-project tag colors, generated at the same saturation/lightness as the
// app's own accent color (hslToHex(228, 68, 54)) so they read as "part of the same palette"
// no matter which hue a project picks. Custom colors are still allowed on top of this list.
export const suggestedProjectColors: { name: string; hex: string }[] = [
  { name: 'Indigo', hex: hslToHex(228, 68, 54) },
  { name: 'Rot', hex: hslToHex(4, 68, 54) },
  { name: 'Orange', hex: hslToHex(28, 68, 54) },
  { name: 'Gelb', hex: hslToHex(48, 68, 50) },
  { name: 'Grün', hex: hslToHex(142, 55, 42) },
  { name: 'Türkis', hex: hslToHex(172, 55, 40) },
  { name: 'Blau', hex: hslToHex(205, 68, 50) },
  { name: 'Violett', hex: hslToHex(265, 55, 56) },
  { name: 'Pink', hex: hslToHex(330, 60, 56) },
  { name: 'Grau', hex: hslToHex(228, 8, 45) },
];

const fontFamilyBase =
  "'Proxima Nova', 'Segoe UI', -apple-system, BlinkMacSystemFont, Roboto, Helvetica, Arial, sans-serif";

const sharedOverrides = {
  fontFamilyBase,
  fontFamilyNumeric: fontFamilyBase,
};

export const paletteLightTheme: Theme = {
  ...createLightTheme(brand),
  ...sharedOverrides,
  colorNeutralBackground1: lightPalette.surface,
  colorNeutralBackground2: lightPalette.background,
  colorNeutralBackground3: lightPalette.surface2,
  colorNeutralForeground1: lightPalette.text,
  colorNeutralForeground3: lightPalette.text2,
  colorNeutralStroke1: lightPalette.border,
  colorNeutralStroke2: lightPalette.border,
  colorPaletteRedBackground2: `color-mix(in srgb, ${lightPalette.error} 14%, white)`,
  colorPaletteRedForeground2: lightPalette.error,
};

export const paletteDarkTheme: Theme = {
  ...createDarkTheme(brand),
  ...sharedOverrides,
  colorNeutralBackground1: darkPalette.surface,
  colorNeutralBackground2: darkPalette.background,
  colorNeutralBackground3: darkPalette.surface2,
  colorNeutralForeground1: darkPalette.text,
  colorNeutralForeground3: darkPalette.text2,
  colorNeutralStroke1: darkPalette.border,
  colorNeutralStroke2: darkPalette.border,
  colorBrandBackground: darkPalette.accent,
  colorBrandBackgroundHover: darkPalette.accentHover,
  colorCompoundBrandBackground: darkPalette.accent,
  colorCompoundBrandBackgroundHover: darkPalette.accentHover,
  colorBrandForeground1: darkPalette.accent,
  colorBrandStroke1: darkPalette.accent,
  colorPaletteRedBackground2: `color-mix(in srgb, ${darkPalette.error} 25%, ${darkPalette.surface})`,
  colorPaletteRedForeground2: darkPalette.error,
};
