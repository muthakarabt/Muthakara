import Ionicons from '@expo/vector-icons/Ionicons';
import * as Haptics from 'expo-haptics';
import { LinearGradient } from 'expo-linear-gradient';
import { router } from 'expo-router';
import type { ComponentProps, ReactNode } from 'react';
import {
  ActivityIndicator,
  Alert,
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
import { SafeAreaView } from 'react-native-safe-area-context';

import { Font, MaxContentWidth, Radius, Spacing } from '@/constants/theme';
import { useTheme } from '@/hooks/use-theme';
import { useApp, useDirection } from '@/lib/app-context';
import { playSound } from '@/lib/sound';

export type IconName = ComponentProps<typeof Ionicons>['name'];

export function haptic(kind: 'light' | 'success' | 'error' = 'light') {
  if (Platform.OS === 'web') return;
  if (kind === 'light') Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light).catch(() => {});
  else
    Haptics.notificationAsync(
      kind === 'success' ? Haptics.NotificationFeedbackType.Success : Haptics.NotificationFeedbackType.Error,
    ).catch(() => {});
}

export function Icon({ name, size = 22, color }: { name: IconName; size?: number; color?: string }) {
  const c = useTheme();
  return <Ionicons name={name} size={size} color={color ?? c.text} />;
}

/** The coloured background used behind every screen: a soft gradient with two light "sun" blobs. */
export function Backdrop() {
  const c = useTheme();
  return (
    <View pointerEvents="none" style={[StyleSheet.absoluteFill, { overflow: 'hidden' }]}>
      <LinearGradient
        colors={[c.bgTop, c.bgMid, c.bgBottom]}
        locations={[0, 0.55, 1]}
        start={{ x: 0, y: 0 }}
        end={{ x: 1, y: 1 }}
        style={StyleSheet.absoluteFill}
      />
      <View style={[styles.blob, { backgroundColor: c.blobA, top: -120, right: -90 }]} />
      <View style={[styles.blob, { backgroundColor: c.blobB, bottom: -140, left: -110, width: 340, height: 340 }]} />
    </View>
  );
}

export function IconButton({
  icon,
  onPress,
  label,
  tone = 'card',
  size = 44,
}: {
  icon: IconName;
  onPress: () => void;
  label: string;
  tone?: 'card' | 'primary';
  size?: number;
}) {
  const c = useTheme();
  return (
    <Pressable
      accessibilityRole="button"
      accessibilityLabel={label}
      onPress={() => {
        haptic();
        onPress();
      }}
      style={({ pressed }) => ({
        width: size,
        height: size,
        borderRadius: size / 2,
        backgroundColor: tone === 'primary' ? c.primary : c.card,
        borderColor: c.border,
        borderWidth: tone === 'primary' ? 0 : 1,
        alignItems: 'center',
        justifyContent: 'center',
        opacity: pressed ? 0.7 : 1,
      })}>
      <Icon name={icon} size={size * 0.48} color={tone === 'primary' ? c.primaryText : c.text} />
    </Pressable>
  );
}

/**
 * Every screen: coloured backdrop, safe areas, an optional header with a back
 * button (pointing the right way for the language) and centred, width-capped content.
 */
export function Screen({
  children,
  title,
  back = true,
  right,
  scroll = true,
  contentStyle,
  footer,
}: {
  children: ReactNode;
  title?: string;
  back?: boolean;
  right?: ReactNode;
  scroll?: boolean;
  contentStyle?: StyleProp<ViewStyle>;
  /** Pinned under the scroll area (e.g. the main action). */
  footer?: ReactNode;
}) {
  const d = useDirection();
  const { s } = useApp();
  const inner = <View style={[styles.content, contentStyle]}>{children}</View>;
  return (
    <View style={{ flex: 1, overflow: 'hidden' }}>
      <Backdrop />
      <SafeAreaView edges={['top', 'bottom']} style={{ flex: 1 }}>
        {title !== undefined ? (
          <View style={[styles.header, { flexDirection: d.row }]}>
            <View style={styles.headerSide}>
              {back ? (
                <IconButton
                  icon={d.rtl ? 'chevron-forward' : 'chevron-back'}
                  label={s.backHome}
                  onPress={() => (router.canGoBack() ? router.back() : router.replace('/'))}
                />
              ) : null}
            </View>
            <Txt variant="heading" center numberOfLines={1} style={{ flex: 1 }}>
              {title}
            </Txt>
            <View style={[styles.headerSide, { alignItems: 'flex-end' }]}>{right}</View>
          </View>
        ) : null}
        {scroll ? (
          <ScrollView keyboardShouldPersistTaps="handled" contentContainerStyle={{ flexGrow: 1 }}>
            {inner}
          </ScrollView>
        ) : (
          inner
        )}
        {footer ? <View style={styles.footer}>{footer}</View> : null}
      </SafeAreaView>
    </View>
  );
}

type TxtVariant = 'hero' | 'title' | 'heading' | 'body' | 'caption' | 'reading';

const sizes: Record<TxtVariant, TextStyle> = {
  hero: { fontSize: 28, lineHeight: 42, fontFamily: Font.bold },
  title: { fontSize: 21, lineHeight: 33, fontFamily: Font.bold },
  heading: { fontSize: 17, lineHeight: 27, fontFamily: Font.semibold },
  body: { fontSize: 16, lineHeight: 26, fontFamily: Font.regular },
  caption: { fontSize: 13, lineHeight: 21, fontFamily: Font.regular },
  // Passages to memorise: larger and airy.
  reading: { fontSize: 21, lineHeight: 38, fontFamily: Font.medium },
};

export function Txt({
  children,
  variant = 'body',
  muted,
  color,
  center,
  bold,
  style,
  numberOfLines,
  dir,
}: {
  children: ReactNode;
  variant?: TxtVariant;
  muted?: boolean;
  color?: string;
  center?: boolean;
  bold?: boolean;
  style?: StyleProp<TextStyle>;
  numberOfLines?: number;
  /** Direction of the text itself, when it differs from the app language (e.g. an English passage in the Arabic UI). */
  dir?: 'rtl' | 'ltr';
}) {
  const c = useTheme();
  const d = useDirection();
  const align = center ? 'center' : dir ? d.alignFor(dir) : d.textAlign;
  return (
    <Text
      numberOfLines={numberOfLines}
      style={[
        sizes[variant],
        bold && { fontFamily: Font.bold },
        { color: color ?? (muted ? c.textSecondary : c.text), textAlign: align },
        { writingDirection: dir ?? d.writingDirection },
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
  wrap,
}: {
  children: ReactNode;
  gap?: number;
  style?: StyleProp<ViewStyle>;
  align?: ViewStyle['alignItems'];
  wrap?: boolean;
}) {
  const d = useDirection();
  return (
    <View style={[{ flexDirection: d.row, alignItems: align, gap, flexWrap: wrap ? 'wrap' : 'nowrap' }, style]}>
      {children}
    </View>
  );
}

export type Tone = 'card' | 'primary' | 'warning' | 'accent' | 'sky' | 'danger';

export function useToneColors(tone: Tone) {
  const c = useTheme();
  const map: Record<Tone, { bg: string; fg: string }> = {
    card: { bg: c.card, fg: c.text },
    primary: { bg: c.primarySoft, fg: c.primary },
    warning: { bg: c.warningSoft, fg: c.warning },
    accent: { bg: c.accentSoft, fg: c.accent },
    sky: { bg: c.skySoft, fg: c.sky },
    danger: { bg: c.dangerSoft, fg: c.danger },
  };
  return map[tone];
}

export function Card({
  children,
  style,
  onPress,
  tone = 'card',
  selected,
}: {
  children: ReactNode;
  style?: StyleProp<ViewStyle>;
  onPress?: () => void;
  tone?: Tone;
  selected?: boolean;
}) {
  const c = useTheme();
  const t = useToneColors(tone);
  const base = [
    styles.card,
    {
      backgroundColor: tone === 'card' ? c.card : t.bg,
      borderColor: selected ? c.primary : tone === 'card' ? c.border : 'transparent',
      borderWidth: selected ? 2 : 1,
    },
    style,
  ];
  if (!onPress) return <View style={base}>{children}</View>;
  return (
    <Pressable
      accessibilityRole="button"
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
  return (
    <LinearGradient
      colors={[c.heroFrom, c.heroTo]}
      start={{ x: 0, y: 0 }}
      end={{ x: 1, y: 1 }}
      style={[styles.card, { borderWidth: 0, overflow: 'hidden' }, style]}>
      <View pointerEvents="none" style={[styles.heroLeaf, { top: -50, right: -40 }]} />
      <View pointerEvents="none" style={[styles.heroLeaf, { bottom: -70, left: -30, width: 150, height: 150 }]} />
      {children}
    </LinearGradient>
  );
}

/** A round soft-coloured badge holding an icon. */
export function IconBadge({ icon, tone = 'primary', size = 44 }: { icon: IconName; tone?: Tone; size?: number }) {
  const t = useToneColors(tone);
  return (
    <View
      style={{
        width: size,
        height: size,
        borderRadius: size / 3,
        backgroundColor: t.bg,
        alignItems: 'center',
        justifyContent: 'center',
      }}>
      <Icon name={icon} size={size * 0.52} color={t.fg} />
    </View>
  );
}

type ButtonVariant = 'primary' | 'secondary' | 'ghost' | 'danger' | 'warning' | 'accent' | 'light';

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
  icon?: IconName;
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
    ghost: { bg: c.card, fg: c.text, border: c.border },
    danger: { bg: c.dangerSoft, fg: c.danger },
    warning: { bg: c.warningSoft, fg: c.warning },
    accent: { bg: c.accent, fg: '#FFFFFF' },
    // on top of the coloured hero card
    light: { bg: 'rgba(255,255,255,0.18)', fg: '#FFFFFF' },
  };
  const p = palette[variant];
  return (
    <Pressable
      accessibilityRole="button"
      accessibilityLabel={title}
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
          opacity: disabled ? 0.45 : pressed ? 0.85 : 1,
          transform: [{ scale: pressed ? 0.98 : 1 }],
        },
        variant === 'primary' && !disabled && styles.buttonShadow,
        style,
      ]}>
      {loading ? (
        <ActivityIndicator color={p.fg} />
      ) : (
        <>
          {icon ? <Icon name={icon} size={small ? 16 : 20} color={p.fg} /> : null}
          <Text style={{ color: p.fg, fontSize: small ? 14 : 16, fontFamily: Font.semibold }}>{title}</Text>
        </>
      )}
    </Pressable>
  );
}

export function Input(props: TextInputProps & { label?: string; dir?: 'rtl' | 'ltr' }) {
  const c = useTheme();
  const d = useDirection();
  const { label, style, dir, ...rest } = props;
  return (
    <View style={{ gap: Spacing.two }}>
      {label ? (
        <Txt variant="caption" muted>
          {label}
        </Txt>
      ) : null}
      <TextInput
        placeholderTextColor={c.textSecondary}
        {...rest}
        style={[
          styles.input,
          {
            color: c.text,
            backgroundColor: c.cardSolid,
            borderColor: c.border,
            textAlign: dir ? d.alignFor(dir) : d.textAlign,
            writingDirection: dir ?? d.writingDirection,
            fontFamily: Font.regular,
          },
          rest.multiline && { minHeight: 110, textAlignVertical: 'top', lineHeight: 26 },
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

export function Pill({
  text,
  tone = 'primary',
  icon,
}: {
  text: string;
  tone?: Exclude<Tone, 'card'> | 'muted' | 'light';
  icon?: IconName;
}) {
  const c = useTheme();
  const d = useDirection();
  const map = {
    primary: [c.primarySoft, c.primary],
    warning: [c.warningSoft, c.warning],
    danger: [c.dangerSoft, c.danger],
    accent: [c.accentSoft, c.accent],
    sky: [c.skySoft, c.sky],
    muted: [c.border, c.textSecondary],
    light: ['rgba(255,255,255,0.22)', '#FFFFFF'],
  } as const;
  const [bg, fg] = map[tone];
  return (
    <View
      style={{
        backgroundColor: bg,
        paddingHorizontal: 10,
        paddingVertical: 3,
        borderRadius: 99,
        flexDirection: d.row,
        alignItems: 'center',
        gap: 4,
        alignSelf: 'flex-start',
      }}>
      {icon ? <Icon name={icon} size={13} color={fg} /> : null}
      <Text style={{ color: fg, fontSize: 12, fontFamily: Font.semibold }}>{text}</Text>
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
  const btn = (icon: IconName, next: number) => (
    <Pressable
      accessibilityRole="button"
      disabled={next < min || next > max}
      onPress={() => {
        haptic();
        onChange(next);
      }}
      style={({ pressed }) => [
        styles.stepBtn,
        { backgroundColor: c.primarySoft, opacity: next < min || next > max ? 0.4 : pressed ? 0.7 : 1 },
      ]}>
      <Icon name={icon} size={20} color={c.primary} />
    </Pressable>
  );
  return (
    <Row gap={Spacing.two}>
      {btn('remove', value - step)}
      <Text style={{ color: c.text, fontSize: 16, fontFamily: Font.semibold, minWidth: 70, textAlign: 'center' }}>
        {format ? format(value) : value}
      </Text>
      {btn('add', value + step)}
    </Row>
  );
}

/** A row of choices where one is selected. */
export function Segmented<T extends string | number>({
  options,
  value,
  onChange,
}: {
  options: { value: T; label: string }[];
  value: T;
  onChange: (v: T) => void;
}) {
  const c = useTheme();
  const d = useDirection();
  return (
    <View
      style={{
        flexDirection: d.row,
        backgroundColor: c.border,
        borderRadius: Radius.medium,
        padding: 3,
        gap: 3,
      }}>
      {options.map((o) => {
        const on = o.value === value;
        return (
          <Pressable
            key={String(o.value)}
            accessibilityRole="button"
            accessibilityState={{ selected: on }}
            onPress={() => {
              haptic();
              onChange(o.value);
            }}
            style={{
              flex: 1,
              paddingVertical: 9,
              borderRadius: Radius.medium - 3,
              alignItems: 'center',
              backgroundColor: on ? c.cardSolid : 'transparent',
            }}>
            <Text style={{ color: on ? c.primary : c.textSecondary, fontFamily: on ? Font.semibold : Font.regular, fontSize: 14 }}>
              {o.label}
            </Text>
          </Pressable>
        );
      })}
    </View>
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

export function Empty({ icon, text, tone = 'primary' }: { icon: IconName; text: string; tone?: Tone }) {
  return (
    <View style={{ alignItems: 'center', gap: Spacing.three, paddingVertical: Spacing.five }}>
      <IconBadge icon={icon} tone={tone} size={64} />
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
  header: {
    alignItems: 'center',
    paddingHorizontal: Spacing.four,
    paddingTop: Spacing.two,
    gap: Spacing.two,
    width: '100%',
    maxWidth: MaxContentWidth,
    alignSelf: 'center',
  },
  headerSide: { minWidth: 48 },
  footer: {
    paddingHorizontal: Spacing.four,
    paddingBottom: Spacing.three,
    paddingTop: Spacing.two,
    width: '100%',
    maxWidth: MaxContentWidth,
    alignSelf: 'center',
  },
  blob: { position: 'absolute', width: 300, height: 300, borderRadius: 999 },
  heroLeaf: {
    position: 'absolute',
    width: 180,
    height: 180,
    borderRadius: 999,
    backgroundColor: 'rgba(255,255,255,0.09)',
  },
  card: {
    borderRadius: Radius.large,
    borderWidth: 1,
    padding: Spacing.four,
    gap: Spacing.three,
  },
  button: {
    minHeight: 54,
    borderRadius: Radius.medium,
    paddingHorizontal: Spacing.four,
    alignItems: 'center',
    justifyContent: 'center',
    gap: Spacing.two,
    borderWidth: 1,
  },
  buttonShadow: {
    shadowColor: '#0b4f42',
    shadowOpacity: 0.22,
    shadowRadius: 10,
    shadowOffset: { width: 0, height: 4 },
    elevation: 3,
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

/** Yes/no question. React Native's Alert does nothing on the web, so the browser dialog is used there. */
export function confirmAction(opts: { title: string; message: string; ok: string; cancel: string }): Promise<boolean> {
  if (Platform.OS === 'web') {
    return Promise.resolve(window.confirm(`${opts.title}\n\n${opts.message}`));
  }
  return new Promise((resolve) =>
    Alert.alert(opts.title, opts.message, [
      { text: opts.cancel, style: 'cancel', onPress: () => resolve(false) },
      { text: opts.ok, style: 'destructive', onPress: () => resolve(true) },
    ]),
  );
}

/** A short message; uses the browser dialog on the web. */
export function notify(message: string): void {
  if (Platform.OS === 'web') window.alert(message);
  else Alert.alert(message);
}
