import React from 'react';
import { ActivityIndicator, Pressable, Text, TextInput, View, ViewStyle, TextInputProps } from 'react-native';
import { formatINR } from '@mandimart/shared';
import { useTheme } from './theme';

export const Screen = ({ children, style }: { children: React.ReactNode; style?: ViewStyle }) => {
  const { c, spacing } = useTheme();
  return <View style={[{ flex: 1, backgroundColor: c.bg, padding: spacing.lg }, style]}>{children}</View>;
};
export const Card = ({ children, style }: { children: React.ReactNode; style?: ViewStyle }) => {
  const { c, radius, spacing } = useTheme();
  return <View style={[{ backgroundColor: c.surface, borderRadius: radius.lg, padding: spacing.lg, borderWidth: 1, borderColor: c.border }, style]}>{children}</View>;
};
export const T = ({ children, size = 'md', bold, muted, color }: { children: React.ReactNode; size?: 'xs' | 'sm' | 'md' | 'lg' | 'xl' | 'xxl'; bold?: boolean; muted?: boolean; color?: string }) => {
  const { c, fontSize } = useTheme();
  return <Text style={{ fontSize: fontSize[size], color: color ?? (muted ? c.muted : c.text), fontWeight: bold ? '700' : '400' }}>{children}</Text>;
};
export const Button = ({ label, onPress, kind = 'primary', loading, disabled }: { label: string; onPress: () => void; kind?: 'primary' | 'ghost' | 'danger'; loading?: boolean; disabled?: boolean }) => {
  const { c, radius } = useTheme();
  const bg = kind === 'primary' ? c.primary : kind === 'danger' ? c.danger : 'transparent';
  return (
    <Pressable accessibilityRole="button" accessibilityLabel={label} disabled={disabled || loading} onPress={onPress}
      style={({ pressed }) => ({ minHeight: 48, borderRadius: radius.md, backgroundColor: bg, borderWidth: kind === 'ghost' ? 1 : 0, borderColor: c.border, alignItems: 'center', justifyContent: 'center', opacity: disabled ? 0.5 : pressed ? 0.85 : 1, paddingHorizontal: 16 })}>
      {loading ? <ActivityIndicator color="#fff" /> : <Text style={{ color: kind === 'ghost' ? c.text : '#fff', fontWeight: '600', fontSize: 16 }}>{label}</Text>}
    </Pressable>
  );
};
export const Field = ({ label, error, ...p }: TextInputProps & { label: string; error?: string }) => {
  const { c, radius } = useTheme();
  return (
    <View style={{ gap: 4 }}>
      <Text style={{ color: c.muted, fontSize: 13 }}>{label}</Text>
      <TextInput accessibilityLabel={label} placeholderTextColor={c.muted} {...p}
        style={{ minHeight: 48, borderRadius: radius.md, borderWidth: 1, borderColor: error ? c.danger : c.border, backgroundColor: c.surface, color: c.text, paddingHorizontal: 12, fontSize: 16 }} />
      {!!error && <Text accessibilityRole="alert" style={{ color: c.danger, fontSize: 12 }}>{error}</Text>}
    </View>
  );
};
/** Amount coloured by Dr/Cr: positive (receivable) green, negative (payable) red. */
export const Amount = ({ paise, size = 'md', bold }: { paise: number; size?: 'sm' | 'md' | 'lg' | 'xl'; bold?: boolean }) => {
  const { c } = useTheme();
  return <T size={size} bold={bold} color={paise > 0 ? c.primary : paise < 0 ? c.danger : c.text}>{formatINR(Math.abs(paise))}{paise > 0 ? ' Dr' : paise < 0 ? ' Cr' : ''}</T>;
};
export const Banner = ({ text, tone = 'warn' }: { text: string; tone?: 'warn' | 'error' }) => {
  const { c, radius } = useTheme();
  return <View accessibilityRole="alert" style={{ backgroundColor: tone === 'error' ? '#FEE2E2' : c.soft, padding: 10, borderRadius: radius.md }}><Text style={{ color: '#111827' }}>{text}</Text></View>;
};
