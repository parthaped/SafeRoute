export const fontSizes = {
  caption2: 11,
  footnote: 13,
  caption: 15,
  body: 17,
  title3: 20,
  title2: 28,
  title1: 34,
} as const;

export const fontWeights = {
  regular: '400' as const,
  medium: '500' as const,
  semibold: '600' as const,
  bold: '700' as const,
};

export const letterSpacing = {
  tight: -0.4,
  normal: 0,
  wide: 0.5,
  caps: 1.2,
} as const;
