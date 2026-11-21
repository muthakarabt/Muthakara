import * as Haptics from 'expo-haptics';
import { LinearGradient } from 'expo-linear-gradient';
import type { ReactNode } from 'react';
import {
  ActivityIndicator,
  Platform,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  View,
  type StyleProp,
  type TextInputProps,
  type TextStyle,
  type ViewStyle,
} from 'react-native';
import { SafeAreaView, type Edge } from 'react-native-safe-area-context';

import { MaxContentWidth, Radius, Spacing } from '@/constants/theme';
import { useTheme } from '@/hooks/use-theme';
import { useDirection } from '@/lib/app-context';
import { playSound } from '@/lib/sound';

export function haptic(kind: 'light' | 'success' | 'error' = 'light') {
  if (Platform.OS === 'web') return;
  if (kind === 'light') Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light).catch(() => {});
  else
    Haptics.notificationAsync(
      kind === 'success' ? Haptics.NotificationFeedbackType.Success : Haptics.NotificationFeedbackType.Error,
    ).catch(() => {});
}

export function Screen({
  children,
  scroll = true,
  edges = ['bottom'],
  contentStyle,
}: {
  children: ReactNode;
  scroll?: boolean;
  edges?: Edge[];
  contentStyle?: StyleProp<ViewStyle>;
}) {
  const c = useTheme();
  const inner = <View style={[styles.content, contentStyle]}>{children}</View>;
  return (
    <SafeAreaView edges={edges} style={{ flex: 1, backgroundColor: c.background }}>
      {scroll ? (
        <ScrollView keyboardShouldPersistTaps="handled" contentContainerStyle={{ flexGrow: 1 }}>
          {inner}
        </ScrollView>
      ) : (
        inner
      )}
    </SafeAreaView>
  );
}

type TxtVariant = 'hero' | 'title' | 'heading' | 'body' | 'caption';

const sizes: Record<TxtVariant, TextStyle> = {
  hero: { fontSize: 30, fontWeight: '800', lineHeight: 40 },
  title: { fontSize: 22, fontWeight: '700', lineHeight: 30 },
  heading: { fontSize: 17, fontWeight: '700', lineHeight: 24 },
  body: { fontSize: 16, lineHeight: 25 },
  caption: { fontSize: 13, lineHeight: 19 },
};

export function Txt({
  children,
  variant = 'body',
  muted,
  color,
  center,
  style,
  numberOfLines,
}: {
  children: ReactNode;
  variant?: TxtVariant;
  muted?: boolean;
  color?: string;
  center?: boolean;
  style?: StyleProp<TextStyle>;
  numberOfLines?: number;
}) {
  const c = useTheme();
  const d = useDirection();
  return (
    <Text
      numberOfLines={numberOfLines}
      style={[
        sizes[variant],
        { color: color ?? (muted ? c.textSecondary : c.text), textAlign: center ? 'center' : d.textAlign },
        { writingDirection: d.writingDirection },
        style,
      ]}>
      {children}
    </Text>
  );
}

export function Row({
  children,
  gap = Spacing.three,
  style,
  align = 'center',
}: {
  children: ReactNode;
  gap?: number;
  style?: StyleProp<ViewStyle>;
  align?: ViewStyle['alignItems'];
}) {
  const d = useDirection();
  return <View style={[{ flexDirection: d.row, alignItems: align, gap }, style]}>{children}</View>;
}

export function Card({
  children,
  style,
  onPress,
  tone = 'card',
}: {
  children: ReactNode;
  style?: StyleProp<ViewStyle>;
  onPress?: () => void;
  tone?: 'card' | 'primary' | 'warning';
}) {
  const c = useTheme();
  const bg = tone === 'primary' ? c.primarySoft : tone === 'warning' ? c.warningSoft : c.card;
  const base = [styles.card, { backgroundColor: bg, borderColor: tone === 'card' ? c.border : 'transparent' }, style];
  if (!onPress) return <View style={base}>{children}</View>;
  return (
    <Pressable
      onPress={() => {
        haptic();
        onPress();
      }}
      style={({ pressed }) => [base, pressed && { opacity: 0.85, transform: [{ scale: 0.99 }] }]}>
      {children}
    </Pressable>
  );
}

export function GradientCard({ children, style }: { children: ReactNode; style?: StyleProp<ViewStyle> }) {
  const c = useTheme();
  const dark = c.background !== '#F7F7FA';
  return (
    <LinearGradient
      colors={dark ? ['#16584E', '#1F3F66'] : ['#1F7A6B', '#2E5C9A']}
      start={{ x: 0, y: 0 }}
      end={{ x: 1, y: 1 }}
      style={[styles.card, { borderWidth: 0 }, style]}>
      {children}
    </LinearGradient>
  );
}

type ButtonVariant = 'primary' | 'secondary' | 'ghost' | 'danger' | 'warning';

export function Button({
  title,
  onPress,
  variant = 'primary',
  icon,
  disabled,
  loading,
  style,
  small,
}: {
  title: string;
  onPress: () => void;
  variant?: ButtonVariant;
  icon?: string;
  disabled?: boolean;
  loading?: boolean;
  style?: StyleProp<ViewStyle>;
  small?: boolean;
}) {
  const c = useTheme();
  const d = useDirection();
  const palette: Record<ButtonVariant, { bg: string; fg: string; border?: string }> = {
    primary: { bg: c.primary, fg: c.primaryText },
    secondary: { bg: c.primarySoft, fg: c.primary },
    ghost: { bg: 'transparent', fg: c.text, border: c.border },
    danger: { bg: c.dangerSoft, fg: c.danger },
    warning: { bg: c.warningSoft, fg: c.warning },
  };
  const p = palette[variant];
  return (
    <Pressable
      accessibilityRole="button"
      disabled={disabled || loading}
      onPress={() => {
        haptic();
        playSound('tap');
        onPress();
      }}
      style={({ pressed }) => [
        styles.button,
        small && styles.buttonSmall,
        {
          backgroundColor: p.bg,
          borderColor: p.border ?? 'transparent',
          flexDirection: d.row,
          opacity: disabled ? 0.45 : pressed ? 0.8 : 1,
          transform: [{ scale: pressed ? 0.98 : 1 }],
        },
        style,
      ]}>
      {loading ? (
        <ActivityIndicator color={p.fg} />
      ) : (
        <>
          {icon ? <Text style={{ fontSize: small ? 15 : 18 }}>{icon}</Text> : null}
          <Text style={{ color: p.fg, fontSize: small ? 14 : 16, fontWeight: '700' }}>{title}</Text>
        </>
      )}
    </Pressable>
  );
}

export function Input(props: TextInputProps & { label?: string }) {
  const c = useTheme();
  const d = useDirection();
  const { label, style, ...rest } = props;
  return (
    <View style={{ gap: Spacing.two }}>
      {label ? <Txt variant="caption" muted>{label}</Txt> : null}
      <TextInput
        placeholderTextColor={c.textSecondary}
        {...rest}
        style={[
          styles.input,
          {
            color: c.text,
            backgroundColor: c.card,
            borderColor: c.border,
            textAlign: d.textAlign,
            writingDirection: d.writingDirection,
          },
          rest.multiline && { minHeight: 90, textAlignVertical: 'top' },
          style,
        ]}
      />
    </View>
  );
}

export function ProgressBar({
  value,
  color,
  track,
  height = 10,
}: {
  value: number;
  color?: string;
  track?: string;
  height?: number;
}) {
  const c = useTheme();
  const d = useDirection();
  const pct = Math.max(0, Math.min(1, value)) * 100;
  return (
    <View
      style={{
        height,
        borderRadius: height,
        backgroundColor: track ?? c.border,
        overflow: 'hidden',
        flexDirection: d.row,
      }}>
      <View style={{ width: `${pct}%`, backgroundColor: color ?? c.primary, borderRadius: height }} />
    </View>
  );
}

export function Pill({ text, tone = 'primary' }: { text: string; tone?: 'primary' | 'warning' | 'danger' | 'muted' }) {
  const c = useTheme();
  const map = {
    primary: [c.primarySoft, c.primary],
    warning: [c.warningSoft, c.warning],
    danger: [c.dangerSoft, c.danger],
    muted: [c.border, c.textSecondary],
  } as const;
  const [bg, fg] = map[tone];
  return (
    <View style={{ backgroundColor: bg, paddingHorizontal: 10, paddingVertical: 3, borderRadius: 99 }}>
      <Text style={{ color: fg, fontSize: 12, fontWeight: '700' }}>{text}</Text>
    </View>
  );
}

export function Stepper({
  value,
  onChange,
  min,
  max,
  step = 1,
  format,
}: {
  value: number;
  onChange: (v: number) => void;
  min: number;
  max: number;
  step?: number;
  format?: (v: number) => string;
}) {
  const c = useTheme();
  const btn = (label: string, next: number) => (
    <Pressable
      disabled={next < min || next > max}
      onPress={() => {
        haptic();
        onChange(next);
      }}
      style={({ pressed }) => [
        styles.stepBtn,
        { backgroundColor: c.primarySoft, opacity: next < min || next > max ? 0.4 : pressed ? 0.7 : 1 },
      ]}>
      <Text style={{ color: c.primary, fontSize: 20, fontWeight: '800' }}>{label}</Text>
    </Pressable>
  );
  return (
    <Row gap={Spacing.two}>
      {btn('−', value - step)}
      <Text style={{ color: c.text, fontSize: 17, fontWeight: '700', minWidth: 64, textAlign: 'center' }}>
        {format ? format(value) : value}
      </Text>
      {btn('+', value + step)}
    </Row>
  );
}

export function Section({ title, children, action }: { title: string; children: ReactNode; action?: ReactNode }) {
  return (
    <View style={{ gap: Spacing.three }}>
      <Row style={{ justifyContent: 'space-between' }}>
        <Txt variant="heading">{title}</Txt>
        {action}
      </Row>
      {children}
    </View>
  );
}

export function Empty({ icon, text }: { icon: string; text: string }) {
  return (
    <View style={{ alignItems: 'center', gap: Spacing.three, paddingVertical: Spacing.five }}>
      <Text style={{ fontSize: 44 }}>{icon}</Text>
      <Txt center muted>
        {text}
      </Txt>
    </View>
  );
}

const styles = StyleSheet.create({
  content: {
    padding: Spacing.four,
    gap: Spacing.five,
    width: '100%',
    maxWidth: MaxContentWidth,
    alignSelf: 'center',
  },
  card: {
    borderRadius: Radius.large,
    borderWidth: StyleSheet.hairlineWidth,
    padding: Spacing.four,
    gap: Spacing.three,
  },
  button: {
    minHeight: 52,
    borderRadius: Radius.medium,
    paddingHorizontal: Spacing.four,
    alignItems: 'center',
    justifyContent: 'center',
    gap: Spacing.two,
    borderWidth: 1,
  },
  buttonSmall: { minHeight: 40, paddingHorizontal: Spacing.three },
  input: {
    borderWidth: 1,
    borderRadius: Radius.medium,
    paddingHorizontal: Spacing.four,
    paddingVertical: Spacing.three,
    fontSize: 16,
  },
  stepBtn: { width: 40, height: 40, borderRadius: 20, alignItems: 'center', justifyContent: 'center' },
});
