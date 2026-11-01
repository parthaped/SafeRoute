/**
 * Design tokens — mirrors the mobile app's src/theme/colors.ts exactly.
 * Pure black base + #E10600 red accent. Apple-level restraint.
 */

export const surface = {
  base: '#000000',
  raised: 'rgba(15, 15, 15, 0.95)',
  overlay: 'rgba(28, 28, 30, 0.85)',
  glass: 'rgba(28, 28, 30, 0.65)',
  border: 'rgba(255, 255, 255, 0.08)',
  borderLight: 'rgba(255, 255, 255, 0.12)',
  hover: 'rgba(255, 255, 255, 0.04)',
} as const;

export const text = {
  primary: '#FFFFFF',
  secondary: 'rgba(255, 255, 255, 0.7)',
  tertiary: 'rgba(255, 255, 255, 0.5)',
  quaternary: 'rgba(255, 255, 255, 0.3)',
  inverse: '#000000',
} as const;

export const accent = {
  red: '#E10600',
  redMuted: 'rgba(225, 6, 0, 0.75)',
  redSubtle: 'rgba(225, 6, 0, 0.15)',
  redGlow: 'rgba(225, 6, 0, 0.25)',
  blue: '#007AFF',
  blueMuted: 'rgba(0, 122, 255, 0.15)',
  green: '#2ECC71',
  greenMuted: 'rgba(46, 204, 113, 0.15)',
} as const;

export const risk = {
  low: '#2ECC71',
  lowMuted: 'rgba(46, 204, 113, 0.15)',
  medium: '#FFD60A',
  mediumMuted: 'rgba(255, 214, 10, 0.15)',
  high: '#E10600',
  highMuted: 'rgba(225, 6, 0, 0.15)',
  critical: '#FF3B30',
  criticalMuted: 'rgba(255, 59, 48, 0.15)',
} as const;

export const status = {
  online: '#2ECC71',
  degraded: '#FFD60A',
  offline: '#E10600',
} as const;

export type RiskLevel = 'low' | 'medium' | 'high' | 'critical';

export const riskColor: Record<RiskLevel, string> = {
  low: risk.low,
  medium: risk.medium,
  high: risk.high,
  critical: risk.critical,
};
