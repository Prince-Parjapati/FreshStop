export const palette = {
  primary: '#16A34A', primaryDark: '#15803D', primarySoft: '#DCFCE7',
  accent: '#F59E0B', accentSoft: '#FEF3C7',
  receivable: '#16A34A', payable: '#DC2626',
  light: { bg: '#F8FAFC', surface: '#FFFFFF', text: '#0F172A', muted: '#475569', border: '#E2E8F0' },
  dark: { bg: '#0B1220', surface: '#111A2E', text: '#F1F5F9', muted: '#94A3B8', border: '#1E293B' },
  danger: '#DC2626', warning: '#F59E0B', info: '#2563EB',
} as const;
export const spacing = { xs: 4, sm: 8, md: 12, lg: 16, xl: 24, xxl: 32 } as const;
export const radius = { sm: 8, md: 12, lg: 16, pill: 999 } as const;
export const fontSize = { xs: 12, sm: 14, md: 16, lg: 18, xl: 22, xxl: 28 } as const;
