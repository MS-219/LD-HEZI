/** 公共 UI 组件：统一白色卡片、蓝色强调、触控尺寸和信息层级。 */
import React, { useEffect, useState } from 'react';
import {
  ActivityIndicator,
  Modal,
  Pressable,
  StyleProp,
  StyleSheet,
  Text,
  TextInput,
  View,
  ViewStyle,
} from 'react-native';
import { useNavigation } from '../navigation';
import { colors, radius, shadow } from '../theme';

export function NavBar({ title, right }: { title: string; right?: React.ReactNode }) {
  const nav = useNavigation();
  return (
    <View style={styles.navBar}>
      <Pressable
        onPress={nav.back}
        hitSlop={10}
        android_ripple={{ color: colors.primarySoft, borderless: true }}
        style={({ pressed }) => [styles.navBack, pressed && styles.pressed]}
      >
        <Text style={styles.navBackText}>‹</Text>
      </Pressable>
      <Text style={styles.navTitle} numberOfLines={1}>{title}</Text>
      <View style={styles.navRight}>{right}</View>
    </View>
  );
}

export function Card({ children, style, onPress }: {
  children: React.ReactNode;
  style?: StyleProp<ViewStyle>;
  onPress?: () => void;
}) {
  if (onPress) {
    return (
      <Pressable
        onPress={onPress}
        android_ripple={{ color: colors.primarySoft }}
        style={({ pressed }) => [styles.card, style, pressed && styles.pressed]}
      >
        {children}
      </Pressable>
    );
  }
  return <View style={[styles.card, style]}>{children}</View>;
}

export function SectionHeader({ title, subtitle, right }: { title: string; subtitle?: string; right?: React.ReactNode }) {
  return (
    <View style={styles.sectionHeader}>
      <View style={styles.sectionTitleWrap}>
        <View style={styles.sectionMark} />
        <View>
          <Text style={styles.sectionTitle}>{title}</Text>
          {!!subtitle && <Text style={styles.sectionSubtitle}>{subtitle}</Text>}
        </View>
      </View>
      {right}
    </View>
  );
}

export function GlyphBadge({ text, tone = 'blue' }: { text: string; tone?: 'blue' | 'green' | 'orange' | 'red' }) {
  const toneStyle = tone === 'green' ? styles.glyphGreen : tone === 'orange' ? styles.glyphOrange : tone === 'red' ? styles.glyphRed : styles.glyphBlue;
  const textStyle = tone === 'green' ? styles.glyphTextGreen : tone === 'orange' ? styles.glyphTextOrange : tone === 'red' ? styles.glyphTextRed : styles.glyphTextBlue;
  return <View style={[styles.glyph, toneStyle]}><Text style={[styles.glyphText, textStyle]}>{text}</Text></View>;
}

export function Empty({ text = '暂无数据' }: { text?: string }) {
  return (
    <View style={styles.empty}>
      <View style={styles.emptyIcon}><View style={styles.emptyDot} /></View>
      <Text style={styles.emptyTitle}>{text}</Text>
      <Text style={styles.emptyText}>下拉刷新后再试试</Text>
    </View>
  );
}

export function LoadingView({ text = '加载中...' }: { text?: string }) {
  return (
    <View style={styles.loading}>
      <View style={styles.loadingIcon}><ActivityIndicator size="small" color={colors.primary} /></View>
      <Text style={styles.loadingText}>{text}</Text>
    </View>
  );
}

export function Button({ title, onPress, type = 'primary', disabled, style }: {
  title: string;
  onPress?: () => void;
  type?: 'primary' | 'secondary' | 'danger' | 'success';
  disabled?: boolean;
  style?: StyleProp<ViewStyle>;
}) {
  const bg = type === 'primary' ? colors.primary : type === 'danger' ? colors.red : type === 'success' ? colors.green : colors.card;
  const fg = type === 'secondary' ? colors.primary : colors.white;
  return (
    <Pressable
      onPress={disabled ? undefined : onPress}
      android_ripple={{ color: 'rgba(255,255,255,0.18)' }}
      style={({ pressed }) => [
        styles.button,
        { backgroundColor: bg },
        type === 'secondary' && styles.buttonSecondary,
        disabled && styles.disabled,
        pressed && !disabled && styles.pressed,
        style,
      ]}
    >
      <Text style={[styles.buttonText, { color: fg }]}>{title}</Text>
    </Pressable>
  );
}

export function SegmentTabs<T extends string | number>({ options, value, onChange }: {
  options: { label: string; value: T }[];
  value: T;
  onChange: (value: T) => void;
}) {
  return (
    <View style={styles.segment}>
      {options.map((opt) => {
        const active = opt.value === value;
        return (
          <Pressable key={String(opt.value)} onPress={() => onChange(opt.value)} style={[styles.segmentItem, active && styles.segmentItemOn]}>
            <Text style={[styles.segmentText, active && styles.segmentTextOn]}>{opt.label}</Text>
          </Pressable>
        );
      })}
    </View>
  );
}

export function Badge({ text, color = colors.blue }: { text: string; color?: string }) {
  return (
    <View style={[styles.badge, { backgroundColor: `${color}14`, borderColor: `${color}36` }]}>
      <View style={[styles.badgeDot, { backgroundColor: color }]} />
      <Text style={[styles.badgeText, { color }]}>{text}</Text>
    </View>
  );
}

export function InfoRow({ label, value, valueColor }: { label: string; value?: string | number; valueColor?: string }) {
  return (
    <View style={styles.infoRow}>
      <Text style={styles.infoLabel}>{label}</Text>
      <Text style={[styles.infoValue, valueColor ? { color: valueColor } : null]} numberOfLines={2}>
        {value === undefined || value === null || value === '' ? '--' : String(value)}
      </Text>
    </View>
  );
}

export function InputDialog({ visible, title, placeholder, defaultValue = '', onCancel, onConfirm }: {
  visible: boolean;
  title: string;
  placeholder?: string;
  defaultValue?: string;
  onCancel: () => void;
  onConfirm: (text: string) => void;
}) {
  const [text, setText] = useState(defaultValue);
  useEffect(() => { if (visible) setText(defaultValue); }, [visible, defaultValue]);

  return (
    <Modal visible={visible} transparent animationType="fade" onRequestClose={onCancel}>
      <View style={styles.dialogMask}>
        <View style={styles.dialog}>
          <View style={styles.dialogHandle} />
          <Text style={styles.dialogTitle}>{title}</Text>
          <TextInput value={text} onChangeText={setText} placeholder={placeholder} placeholderTextColor={colors.muted} style={styles.dialogInput} autoFocus />
          <View style={styles.dialogActions}>
            <Pressable onPress={onCancel} style={[styles.dialogButton, styles.dialogCancelButton]}><Text style={styles.dialogCancel}>取消</Text></Pressable>
            <Pressable onPress={() => onConfirm(text)} style={[styles.dialogButton, styles.dialogConfirmButton]}><Text style={styles.dialogConfirm}>确定</Text></Pressable>
          </View>
        </View>
      </View>
    </Modal>
  );
}

const styles = StyleSheet.create({
  navBar: { flexDirection: 'row', alignItems: 'center', paddingHorizontal: 16, height: 58, backgroundColor: 'rgba(255,255,255,0.82)', borderBottomWidth: StyleSheet.hairlineWidth, borderBottomColor: colors.borderSoft },
  navBack: { width: 38, height: 38, borderRadius: 19, alignItems: 'center', justifyContent: 'center', backgroundColor: colors.card, borderWidth: 1, borderColor: colors.border },
  navBackText: { fontSize: 31, lineHeight: 34, color: colors.navy, marginTop: -3 },
  navTitle: { flex: 1, textAlign: 'center', fontSize: 18, fontWeight: '800', color: colors.text, letterSpacing: 0.5 },
  navRight: { width: 38, alignItems: 'center' },
  card: { backgroundColor: colors.card, borderRadius: radius.lg, padding: 16, marginBottom: 12, borderWidth: 1, borderColor: 'rgba(214,229,241,0.92)', ...shadow.card },
  pressed: { opacity: 0.78, transform: [{ scale: 0.992 }] },
  sectionHeader: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', marginTop: 8, marginBottom: 12 },
  sectionTitleWrap: { flexDirection: 'row', alignItems: 'center', gap: 9 },
  sectionMark: { width: 4, height: 18, borderRadius: 2, backgroundColor: colors.primary },
  sectionTitle: { fontSize: 17, lineHeight: 22, fontWeight: '800', color: colors.text },
  sectionSubtitle: { color: colors.muted, fontSize: 11, marginTop: 1 },
  glyph: { width: 36, height: 36, borderRadius: 11, alignItems: 'center', justifyContent: 'center', borderWidth: 1 },
  glyphBlue: { backgroundColor: colors.primarySoft, borderColor: '#D5E9FA' }, glyphGreen: { backgroundColor: colors.greenSoft, borderColor: '#D5EFE6' }, glyphOrange: { backgroundColor: colors.orangeSoft, borderColor: '#FAE5C5' }, glyphRed: { backgroundColor: colors.redSoft, borderColor: '#F8DADD' },
  glyphText: { fontSize: 14, fontWeight: '900' }, glyphTextBlue: { color: colors.primary }, glyphTextGreen: { color: colors.green }, glyphTextOrange: { color: colors.orange }, glyphTextRed: { color: colors.red },
  empty: { paddingVertical: 42, paddingHorizontal: 24, alignItems: 'center' },
  emptyIcon: { width: 54, height: 54, borderRadius: 18, backgroundColor: colors.primarySoft, borderWidth: 1, borderColor: colors.border, alignItems: 'center', justifyContent: 'center', marginBottom: 14 },
  emptyDot: { width: 13, height: 13, borderRadius: 7, backgroundColor: '#A9CDEA' },
  emptyTitle: { color: colors.textSecondary, fontSize: 14, fontWeight: '700' }, emptyText: { color: colors.muted, fontSize: 12, marginTop: 5 },
  loading: { flex: 1, alignItems: 'center', justifyContent: 'center', gap: 12 }, loadingIcon: { width: 50, height: 50, borderRadius: 17, backgroundColor: colors.card, alignItems: 'center', justifyContent: 'center', ...shadow.card }, loadingText: { color: colors.textSecondary, fontWeight: '600' },
  button: { minHeight: 48, borderRadius: radius.md, paddingVertical: 12, paddingHorizontal: 16, alignItems: 'center', justifyContent: 'center', overflow: 'hidden' },
  buttonSecondary: { borderWidth: 1, borderColor: '#BBD9F1', backgroundColor: '#F8FCFF' }, buttonText: { fontWeight: '800', fontSize: 15, letterSpacing: 0.2 }, disabled: { opacity: 0.48 },
  segment: { flexDirection: 'row', backgroundColor: 'rgba(255,255,255,0.76)', borderRadius: radius.md, borderWidth: 1, borderColor: colors.border, marginBottom: 14, padding: 4 },
  segmentItem: { flex: 1, minHeight: 40, alignItems: 'center', justifyContent: 'center', borderRadius: radius.sm }, segmentItemOn: { backgroundColor: colors.card, ...shadow.card }, segmentText: { color: colors.textSecondary, fontWeight: '700', fontSize: 13 }, segmentTextOn: { color: colors.primary, fontWeight: '800' },
  badge: { borderRadius: radius.pill, paddingHorizontal: 9, paddingVertical: 5, alignSelf: 'flex-start', flexDirection: 'row', alignItems: 'center', gap: 5, borderWidth: 1 }, badgeDot: { width: 6, height: 6, borderRadius: 3 }, badgeText: { fontSize: 11, fontWeight: '800' },
  infoRow: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'flex-start', paddingVertical: 10, gap: 16, borderBottomWidth: StyleSheet.hairlineWidth, borderBottomColor: colors.borderSoft }, infoLabel: { color: colors.textSecondary, fontSize: 14 }, infoValue: { color: colors.text, fontSize: 14, fontWeight: '700', flex: 1, textAlign: 'right' },
  dialogMask: { flex: 1, backgroundColor: 'rgba(15,39,62,0.38)', alignItems: 'center', justifyContent: 'center', padding: 24 },
  dialog: { width: '100%', backgroundColor: colors.card, borderRadius: radius.xl, padding: 22, ...shadow.card }, dialogHandle: { width: 36, height: 4, borderRadius: 2, backgroundColor: colors.border, alignSelf: 'center', marginBottom: 17 }, dialogTitle: { fontSize: 18, fontWeight: '800', color: colors.text, textAlign: 'center' },
  dialogInput: { marginTop: 18, minHeight: 50, borderWidth: 1, borderColor: colors.border, borderRadius: radius.md, paddingHorizontal: 14, paddingVertical: 11, color: colors.text, backgroundColor: colors.surface, fontSize: 15 },
  dialogActions: { flexDirection: 'row', gap: 10, marginTop: 18 }, dialogButton: { flex: 1, minHeight: 46, borderRadius: radius.md, alignItems: 'center', justifyContent: 'center' }, dialogCancelButton: { backgroundColor: colors.surface, borderWidth: 1, borderColor: colors.border }, dialogConfirmButton: { backgroundColor: colors.primary }, dialogCancel: { color: colors.textSecondary, fontSize: 15, fontWeight: '700' }, dialogConfirm: { color: colors.white, fontSize: 15, fontWeight: '800' },
});
