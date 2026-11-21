import { useColorScheme } from 'react-native';
import { palette, spacing, radius, fontSize } from '@mandimart/shared';
export const useTheme = () => {
  const dark = useColorScheme() === 'dark';
  const c = dark ? palette.dark : palette.light;
  const shadow = dark ? {} : { shadowColor: '#0B1B13', shadowOpacity: 0.07, shadowRadius: 12, shadowOffset: { width: 0, height: 4 }, elevation: 2 };
  return { dark, shadow, c: { ...c, primary: palette.primary, primaryDark: palette.primaryDark, accent: palette.accent, danger: palette.danger, info: palette.info, purple: palette.purple, sky: palette.sky, soft: dark ? '#173323' : palette.primarySoft, dangerSoft: dark ? '#3A1713' : '#FDECEA', accentSoft: dark ? '#3A2E0B' : palette.accentSoft }, spacing, radius, fontSize };
};
