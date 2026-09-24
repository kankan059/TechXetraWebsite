export const TECHXETRA_COLORS = {
  blue: "#0972AE",
  green: "#3F622D",
  red: "#8F1418",
  cream: "#F7F3DE",

  // Dark tones based on the palette sheet.
  blueDark: "#044468",
  blueBlack: "#011722",

  greenDark: "#253A1B",
  greenBlack: "#0D1309",

  redDark: "#550C0D",
  redBlack: "#1D0404",

  creamMuted: "#949285",
  creamDark: "#31312C",

  // Main website background.
  black: "#090909",
} as const;

export type TechxetraColor =
  (typeof TECHXETRA_COLORS)[keyof typeof TECHXETRA_COLORS];