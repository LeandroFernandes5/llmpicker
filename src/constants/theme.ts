import { Platform } from 'react-native';

export const Colors = {
  light: {
    text: '#000000',
    background: '#ffffff',
    backgroundElement: '#F0F0F3',
    backgroundSelected: '#E0E1E6',
    textSecondary: '#60646C',
    accent: '#3c87f7',
    accentText: '#ffffff',
    border: '#E0E1E6',
    userBubble: '#3c87f7',
    userBubbleText: '#ffffff',
    assistantBubble: '#F0F0F3',
    assistantBubbleText: '#000000',
    inputBg: '#F0F0F3',
    error: '#d33b27',
    success: '#2ea050',
    warning: '#c77b00',
    placeholder: '#9ca0a8',
  },
  dark: {
    text: '#ffffff',
    background: '#000000',
    backgroundElement: '#212225',
    backgroundSelected: '#2E3135',
    textSecondary: '#B0B4BA',
    accent: '#0a84ff',
    accentText: '#ffffff',
    border: '#2E3135',
    userBubble: '#0a84ff',
    userBubbleText: '#ffffff',
    assistantBubble: '#212225',
    assistantBubbleText: '#ffffff',
    inputBg: '#1c1e21',
    error: '#ff6b5a',
    success: '#4ed886',
    warning: '#ffb02e',
    placeholder: '#6b7078',
  },
} as const;

export type ThemeColor = keyof typeof Colors.light & keyof typeof Colors.dark;

export const Fonts = Platform.select({
  ios: {
    sans: 'system-ui',
    serif: 'ui-serif',
    rounded: 'ui-rounded',
    mono: 'ui-monospace',
  },
  default: {
    sans: 'normal',
    serif: 'serif',
    rounded: 'normal',
    mono: 'monospace',
  },
  web: {
    sans: 'var(--font-display)',
    serif: 'var(--font-serif)',
    rounded: 'var(--font-rounded)',
    mono: 'var(--font-mono)',
  },
});

export const Spacing = {
  half: 2,
  one: 4,
  two: 8,
  three: 16,
  four: 24,
  five: 32,
  six: 64,
} as const;

export const Radius = {
  none: 0,
  small: 6,
  medium: 12,
  large: 18,
  xl: 24,
  pill: 999,
} as const;

export const BottomTabInset = Platform.select({ ios: 50, android: 80 }) ?? 0;
export const MaxContentWidth = 800;
