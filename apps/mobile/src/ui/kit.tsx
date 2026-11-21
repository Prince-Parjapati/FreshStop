import React from 'react';
import { ActivityIndicator, Pressable, ScrollView, Text, TextInput, View, ViewStyle, TextInputProps, StyleProp } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { formatINR } from '@mandimart/shared';
import { useTheme } from './theme';

type IconName = React.ComponentProps<typeof Ionicons>['name'];

/** Page container. `top` adds the status-bar/notch inset for screens without a native header. */
export const Screen = ({ children, style, top }: { children: React.ReactNode; style?: ViewStyle; top?: boolean }) => {
  const { c } = useTheme(); const ins = useSafeAreaInsets();
  const { paddingTop: _ignored, ...rest } = (style ?? {}) as ViewStyle;
  return <View style={[{ flex: 1, backgroundColor: c.bg, paddingHorizontal: 16, paddingTop: top ? ins.top + 12 : 12 }, rest]}>{children}</View>;
};
/** Soft elevated surface (no hard border). */
export const Card = ({ children, style }: { children: React.ReactNode; style?: StyleProp<ViewStyle> }) => {
  const { c, radius, shadow } = useTheme();
  return <View style={[{ backgroundColor: c.surface, borderRadius: radius.lg, padding: 16, ...shadow }, style]}>{children}</View>;
};
export const T = ({ children, size = 'md', bold, muted, color, center, numberOfLines }: { children: React.ReactNode; size?: 'xs' | 'sm' | 'md' | 'lg' | 'xl' | 'xxl'; bold?: boolean; muted?: boolean; color?: string; center?: boolean; numberOfLines?: number }) => {
  const { c, fontSize } = useTheme();
  return <Text numberOfLines={numberOfLines} style={{ fontSize: fontSize[size], color: color ?? (muted ? c.muted : c.text), fontWeight: bold ? '700' : '400', textAlign: center ? 'center' : undefined }}>{children}</Text>;
};
export const Button = ({ label, onPress, kind = 'primary', loading, disabled, icon }: { label: string; onPress: () => void; kind?: 'primary' | 'ghost' | 'danger'; loading?: boolean; disabled?: boolean; icon?: IconName }) => {
  const { c, radius } = useTheme();
  const bg = kind === 'primary' ? c.primary : kind === 'danger' ? c.dangerSoft : c.soft;
  const fg = kind === 'primary' ? '#fff' : kind === 'danger' ? c.danger : c.primary;
  return (
    <Pressable accessibilityRole="button" accessibilityLabel={label} accessibilityState={{ disabled: !!disabled }} disabled={disabled || loading} onPress={onPress} android_ripple={{ color: '#0002' }}
      style={({ pressed }) => ({ minHeight: 50, borderRadius: radius.md, backgroundColor: bg, alignItems: 'center', justifyContent: 'center', opacity: disabled ? 0.5 : pressed ? 0.85 : 1, paddingHorizontal: 16, paddingVertical: 8 })}>
      {loading ? <ActivityIndicator color={fg} /> : <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8 }}>{!!icon && <Ionicons name={icon} size={20} color={fg} accessible={false} />}<Text style={{ color: fg, fontWeight: '700', fontSize: 15, textAlign: 'center' }}>{label}</Text></View>}
    </Pressable>
  );
};
export const Field = ({ label, error, ...p }: TextInputProps & { label: string; error?: string }) => {
  const { c, radius } = useTheme();
  return (
    <View style={{ gap: 6 }}>
      {!!label.trim() && <Text style={{ color: c.muted, fontSize: 13, fontWeight: '600' }}>{label}</Text>}
      <TextInput accessibilityLabel={label.trim() || undefined} placeholderTextColor={c.muted} {...p}
        style={{ minHeight: 50, borderRadius: radius.md, borderWidth: 1.5, borderColor: error ? c.danger : c.border, backgroundColor: c.surface, color: c.text, paddingHorizontal: 14, fontSize: 16 }} />
      {!!error && <Text accessibilityRole="alert" style={{ color: c.danger, fontSize: 12 }}>{error}</Text>}
    </View>
  );
};
/** Amount coloured by Dr/Cr: positive (receivable) green, negative (payable) red. */
export const Amount = ({ paise, size = 'md', bold }: { paise: number; size?: 'sm' | 'md' | 'lg' | 'xl' | 'xxl'; bold?: boolean }) => {
  const { c } = useTheme();
  return <T size={size} bold={bold} color={paise > 0 ? c.primary : paise < 0 ? c.danger : c.muted}>{formatINR(Math.abs(paise))}{paise > 0 ? ' Dr' : paise < 0 ? ' Cr' : ''}</T>;
};
export const Banner = ({ text, tone = 'warn' }: { text: string; tone?: 'warn' | 'error' }) => {
  const { c, radius } = useTheme();
  return <View accessibilityRole="alert" style={{ backgroundColor: tone === 'error' ? c.dangerSoft : c.accentSoft, padding: 12, borderRadius: radius.md, flexDirection: 'row', gap: 8, alignItems: 'center' }}><Ionicons name={tone === 'error' ? 'alert-circle' : 'information-circle'} size={20} color={tone === 'error' ? c.danger : '#B45309'} /><Text style={{ color: c.text, flex: 1 }}>{text}</Text></View>;
};
/** Round tinted icon container used in tiles and list rows. */
export const IconBadge = ({ name, color, size = 44 }: { name: IconName; color: string; size?: number }) => (
  <View style={{ width: size, height: size, borderRadius: size / 2.6, backgroundColor: color + '1F', alignItems: 'center', justifyContent: 'center' }}><Ionicons name={name} size={size * 0.5} color={color} accessible={false} /></View>
);
/** Pill filter chip. */
export const Chip = ({ label, on, onPress }: { label: string; on: boolean; onPress: () => void }) => {
  const { c } = useTheme();
  return <Pressable accessibilityRole="button" accessibilityState={{ selected: on }} onPress={onPress} style={{ paddingHorizontal: 16, minHeight: 40, justifyContent: 'center', borderRadius: 999, backgroundColor: on ? c.primary : c.surface, borderWidth: 1.5, borderColor: on ? c.primary : c.border }}><Text style={{ color: on ? '#fff' : c.text, fontWeight: '600' }}>{label}</Text></Pressable>;
};
/** Horizontally scrolling chip row. */
export const ChipRow = ({ children }: { children: React.ReactNode }) => <ScrollView horizontal showsHorizontalScrollIndicator={false} style={{ flexGrow: 0 }} contentContainerStyle={{ gap: 8, paddingVertical: 2 }}>{children}</ScrollView>;
/** Segmented control (equal-width options). */
export const Segmented = <K extends string>({ value, options, onChange }: { value: K; options: { key: K; label: string }[]; onChange: (k: K) => void }) => {
  const { c } = useTheme();
  return <View style={{ flexDirection: 'row', backgroundColor: c.soft, borderRadius: 14, padding: 4 }}>{options.map((o) => <Pressable key={o.key} accessibilityRole="button" accessibilityState={{ selected: value === o.key }} onPress={() => onChange(o.key)} style={{ flex: 1, minHeight: 42, borderRadius: 10, alignItems: 'center', justifyContent: 'center', backgroundColor: value === o.key ? c.surface : 'transparent' }}><Text style={{ fontWeight: '700', color: value === o.key ? c.primary : c.muted }}>{o.label}</Text></Pressable>)}</View>;
};
export const Section = ({ title, action, onAction }: { title: string; action?: string; onAction?: () => void }) => {
  const { c } = useTheme();
  return <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginTop: 8 }}><Text style={{ fontSize: 18, fontWeight: '800', color: c.text }}>{title}</Text>{!!action && <Pressable onPress={onAction} hitSlop={8}><Text style={{ color: c.primary, fontWeight: '700' }}>{action}</Text></Pressable>}</View>;
};
/** Standard tappable list row card: icon + title/subtitle + trailing content. */
export const Row = ({ icon, tint, title, sub, right, onPress, onLongPress, selected }: { icon?: IconName; tint?: string; title: string; sub?: string; right?: React.ReactNode; onPress?: () => void; onLongPress?: () => void; selected?: boolean }) => {
  const { c, radius, shadow } = useTheme();
  return (
    <Pressable accessibilityRole="button" onPress={onPress} onLongPress={onLongPress} style={({ pressed }) => ({ backgroundColor: c.surface, borderRadius: radius.lg, padding: 14, flexDirection: 'row', alignItems: 'center', gap: 12, borderWidth: 2, borderColor: selected ? c.primary : 'transparent', opacity: pressed ? 0.9 : 1, ...shadow })}>
      {!!icon && <IconBadge name={icon} color={tint ?? c.primary} />}
      <View style={{ flex: 1 }}><Text numberOfLines={1} style={{ color: c.text, fontWeight: '700', fontSize: 16 }}>{title}</Text>{!!sub && <Text numberOfLines={1} style={{ color: c.muted, fontSize: 13, marginTop: 2 }}>{sub}</Text>}</View>
      {right}
    </Pressable>
  );
};
export const SearchBar = ({ value, onChangeText, placeholder = 'Search' }: { value: string; onChangeText: (v: string) => void; placeholder?: string }) => {
  const { c, radius } = useTheme();
  return (
    <View style={{ flexDirection: 'row', alignItems: 'center', backgroundColor: c.surface, borderRadius: radius.md, paddingHorizontal: 12, borderWidth: 1.5, borderColor: c.border }}>
      <Ionicons name="search" size={20} color={c.muted} accessible={false} />
      <TextInput accessibilityLabel={placeholder} placeholder={placeholder} placeholderTextColor={c.muted} value={value} onChangeText={onChangeText} style={{ flex: 1, minHeight: 48, color: c.text, fontSize: 16, paddingHorizontal: 8 }} />
    </View>
  );
};
export const Empty = ({ icon = 'file-tray-outline', text }: { icon?: IconName; text: string }) => {
  const { c } = useTheme();
  return <View style={{ alignItems: 'center', padding: 36, gap: 10 }}><Ionicons name={icon} size={46} color={c.muted} /><Text style={{ color: c.muted, textAlign: 'center' }}>{text}</Text></View>;
};
