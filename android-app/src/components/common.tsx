/**
 * 公共 UI 组件：页面导航栏、卡片、空态、按钮、分段筛选、输入弹窗等。
 * 全部基于 RN 核心组件实现，安卓 / 鸿蒙通用。
 */
import React, { useEffect, useState } from 'react';
import {
  ActivityIndicator,
  Modal,
  Pressable,
  StyleSheet,
  Text,
  TextInput,
  View,
} from 'react-native';
import { useNavigation } from '../navigation';
import { colors, radius } from '../theme';

/** 二级页面顶部导航栏（对应小程序自定义 navBar + 返回按钮） */
export function NavBar({ title, right }: { title: string; right?: React.ReactNode }) {
  const nav = useNavigation();
  return (
    <View style={styles.navBar}>
      <Pressable onPress={nav.back} hitSlop={10} style={styles.navBack}>
        <Text style={styles.navBackText}>‹</Text>
      </Pressable>
      <Text style={styles.navTitle} numberOfLines={1}>
        {title}
      </Text>
      <View style={styles.navRight}>{right}</View>
    </View>
  );
}

export function Card({
  children,
  style,
  onPress,
}: {
  children: React.ReactNode;
  style?: any;
  onPress?: () => void;
}) {
  if (onPress) {
    return (
      <Pressable onPress={onPress} style={({ pressed }) => [styles.card, style, pressed && { opacity: 0.85 }]}>
        {children}
      </Pressable>
    );
  }
  return <View style={[styles.card, style]}>{children}</View>;
}

export function Empty({ text = '暂无数据' }: { text?: string }) {
  return (
    <View style={styles.empty}>
      <Text style={styles.emptyText}>{text}</Text>
    </View>
  );
}

export function LoadingView({ text = '加载中...' }: { text?: string }) {
  return (
    <View style={styles.loading}>
      <ActivityIndicator size="large" color={colors.primary} />
      <Text style={styles.loadingText}>{text}</Text>
    </View>
  );
}

export function Button({
  title,
  onPress,
  type = 'primary',
  disabled,
  style,
}: {
  title: string;
  onPress?: () => void;
  type?: 'primary' | 'secondary' | 'danger' | 'success';
  disabled?: boolean;
  style?: any;
}) {
  const bg =
    type === 'primary'
      ? colors.primary
      : type === 'danger'
        ? colors.red
        : type === 'success'
          ? colors.green
          : colors.card;
  const fg = type === 'secondary' ? colors.primary : '#ffffff';
  return (
    <Pressable
      onPress={disabled ? undefined : onPress}
      style={({ pressed }) => [
        styles.button,
        { backgroundColor: bg },
        type === 'secondary' && styles.buttonSecondary,
        disabled && { opacity: 0.5 },
        pressed && !disabled && { opacity: 0.85 },
        style,
      ]}
    >
      <Text style={[styles.buttonText, { color: fg }]}>{title}</Text>
    </Pressable>
  );
}

/** 分段筛选（对应小程序的 tab 筛选条） */
export function SegmentTabs<T extends string | number>({
  options,
  value,
  onChange,
}: {
  options: { label: string; value: T }[];
  value: T;
  onChange: (value: T) => void;
}) {
  return (
    <View style={styles.segment}>
      {options.map((opt) => {
        const active = opt.value === value;
        return (
          <Pressable
            key={String(opt.value)}
            onPress={() => onChange(opt.value)}
            style={[styles.segmentItem, active && styles.segmentItemOn]}
          >
            <Text style={[styles.segmentText, active && styles.segmentTextOn]}>{opt.label}</Text>
          </Pressable>
        );
      })}
    </View>
  );
}

/** 状态徽标（在线/离线/订单状态等） */
export function Badge({ text, color = colors.blue }: { text: string; color?: string }) {
  return (
    <View style={[styles.badge, { backgroundColor: `${color}1a` }]}>
      <Text style={[styles.badgeText, { color }]}>{text}</Text>
    </View>
  );
}

/** 键值行（详情页字段展示） */
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

/**
 * 输入弹窗（替代 wx.showModal({ editable: true })；
 * RN 的 Alert.prompt 仅 iOS 可用，这里自实现，安卓/鸿蒙通用）
 */
export function InputDialog({
  visible,
  title,
  placeholder,
  defaultValue = '',
  onCancel,
  onConfirm,
}: {
  visible: boolean;
  title: string;
  placeholder?: string;
  defaultValue?: string;
  onCancel: () => void;
  onConfirm: (text: string) => void;
}) {
  const [text, setText] = useState(defaultValue);
  useEffect(() => {
    if (visible) setText(defaultValue);
  }, [visible, defaultValue]);

  return (
    <Modal visible={visible} transparent animationType="fade" onRequestClose={onCancel}>
      <View style={styles.dialogMask}>
        <View style={styles.dialog}>
          <Text style={styles.dialogTitle}>{title}</Text>
          <TextInput
            value={text}
            onChangeText={setText}
            placeholder={placeholder}
            placeholderTextColor={colors.muted}
            style={styles.dialogInput}
            autoFocus
          />
          <View style={styles.dialogActions}>
            <Pressable onPress={onCancel} style={styles.dialogButton}>
              <Text style={styles.dialogCancel}>取消</Text>
            </Pressable>
            <Pressable onPress={() => onConfirm(text)} style={styles.dialogButton}>
              <Text style={styles.dialogConfirm}>确定</Text>
            </Pressable>
          </View>
        </View>
      </View>
    </Modal>
  );
}

const styles = StyleSheet.create({
  navBar: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 8,
    height: 48,
    backgroundColor: colors.card,
    borderBottomWidth: StyleSheet.hairlineWidth,
    borderBottomColor: colors.border,
  },
  navBack: { width: 40, alignItems: 'center', justifyContent: 'center' },
  navBackText: { fontSize: 30, color: colors.text, marginTop: -4 },
  navTitle: { flex: 1, textAlign: 'center', fontSize: 17, fontWeight: '700', color: colors.text },
  navRight: { width: 40, alignItems: 'center' },
  card: {
    backgroundColor: colors.card,
    borderRadius: radius.lg,
    padding: 14,
    marginBottom: 10,
    borderWidth: 1,
    borderColor: colors.border,
  },
  empty: { padding: 32, alignItems: 'center' },
  emptyText: { color: colors.muted },
  loading: { flex: 1, alignItems: 'center', justifyContent: 'center', gap: 10 },
  loadingText: { color: colors.textSecondary },
  button: {
    borderRadius: radius.md,
    paddingVertical: 12,
    paddingHorizontal: 16,
    alignItems: 'center',
    justifyContent: 'center',
  },
  buttonSecondary: { borderWidth: 1, borderColor: colors.primary },
  buttonText: { fontWeight: '700', fontSize: 15 },
  segment: {
    flexDirection: 'row',
    backgroundColor: '#e8ecf4',
    borderRadius: radius.md,
    padding: 4,
    marginBottom: 12,
  },
  segmentItem: { flex: 1, alignItems: 'center', paddingVertical: 8, borderRadius: radius.sm },
  segmentItemOn: { backgroundColor: colors.card },
  segmentText: { color: colors.textSecondary, fontWeight: '600', fontSize: 13 },
  segmentTextOn: { color: colors.primary, fontWeight: '700' },
  badge: {
    borderRadius: 999,
    paddingHorizontal: 10,
    paddingVertical: 3,
    alignSelf: 'flex-start',
  },
  badgeText: { fontSize: 12, fontWeight: '600' },
  infoRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    paddingVertical: 7,
    gap: 16,
  },
  infoLabel: { color: colors.textSecondary, fontSize: 14 },
  infoValue: { color: colors.text, fontSize: 14, fontWeight: '600', flex: 1, textAlign: 'right' },
  dialogMask: {
    flex: 1,
    backgroundColor: 'rgba(15, 23, 42, 0.45)',
    alignItems: 'center',
    justifyContent: 'center',
    padding: 32,
  },
  dialog: {
    width: '100%',
    backgroundColor: colors.card,
    borderRadius: radius.lg,
    padding: 20,
  },
  dialogTitle: { fontSize: 16, fontWeight: '700', color: colors.text, textAlign: 'center' },
  dialogInput: {
    marginTop: 16,
    borderWidth: 1,
    borderColor: colors.border,
    borderRadius: radius.md,
    paddingHorizontal: 12,
    paddingVertical: 10,
    color: colors.text,
  },
  dialogActions: { flexDirection: 'row', marginTop: 16 },
  dialogButton: { flex: 1, alignItems: 'center', paddingVertical: 10 },
  dialogCancel: { color: colors.textSecondary, fontSize: 15 },
  dialogConfirm: { color: colors.primary, fontSize: 15, fontWeight: '700' },
});
