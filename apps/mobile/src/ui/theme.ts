import { useColorScheme } from 'react-native';
import { palette, spacing, radius, fontSize } from '@mandimart/shared';
export const useTheme = () => {
  const dark = useColorScheme() === 'dark';
  const c = dark ? palette.dark : palette.light;
  return { dark, c: { ...c, primary: palette.primary, accent: palette.accent, danger: palette.danger, soft: dark ? '#14352A' : palette.primarySoft }, spacing, radius, fontSize };
};
