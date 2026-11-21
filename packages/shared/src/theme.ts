export const palette = {
  primary: '#0F8A4F', primaryDark: '#0A6B3C', primarySoft: '#E3F5EA',
  accent: '#F59E0B', accentSoft: '#FEF3C7',
  receivable: '#0F8A4F', payable: '#D92D20',
  light: { bg: '#F3F6F4', surface: '#FFFFFF', text: '#0B1B13', muted: '#566A5F', border: '#E3EAE5', hero: '#0A5C35', heroText: '#FFFFFF' },
  dark: { bg: '#08100B', surface: '#111B15', text: '#EEF5F0', muted: '#9DB1A5', border: '#1E2C24', hero: '#0B3D25', heroText: '#FFFFFF' },
  danger: '#D92D20', warning: '#F59E0B', info: '#2563EB', purple: '#7C3AED', sky: '#0284C7',
} as const;
export const spacing = { xs: 4, sm: 8, md: 12, lg: 16, xl: 24, xxl: 32 } as const;
export const radius = { sm: 10, md: 14, lg: 20, pill: 999 } as const;
export const fontSize = { xs: 12, sm: 14, md: 16, lg: 18, xl: 22, xxl: 30 } as const;
