import React, { useEffect, useState } from 'react';
import {
  Alert,
  KeyboardAvoidingView,
  Platform,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  View,
} from 'react-native';
import { Button } from '../components/common';
import { useSession } from '../session';
import { getItem } from '../storage';
import { colors, radius } from '../theme';

const PHONE_PATTERN = /^1[3-9]\d{9}$/;

export default function PhoneLoginScreen() {
  const { sendSmsCode, login } = useSession();
  const [phone, setPhone] = useState('');
  const [code, setCode] = useState('');
  const [inviteCode, setInviteCode] = useState('');
  const [countdown, setCountdown] = useState(0);
  const [sending, setSending] = useState(false);
  const [loggingIn, setLoggingIn] = useState(false);

  useEffect(() => {
    Promise.all([getItem('lastLoginPhone'), getItem('pendingInviteCode')]).then(
      ([lastPhone, pendingInvite]) => {
        if (lastPhone) setPhone(lastPhone);
        if (pendingInvite) setInviteCode(pendingInvite);
      }
    );
  }, []);

  useEffect(() => {
    if (countdown <= 0) return;
    const timer = setInterval(() => {
      setCountdown((current) => Math.max(0, current - 1));
    }, 1000);
    return () => clearInterval(timer);
  }, [countdown]);

  const normalizedPhone = phone.replace(/\s+/g, '');
  const phoneValid = PHONE_PATTERN.test(normalizedPhone);
  const codeValid = /^\d{6}$/.test(code);

  const onSendCode = async () => {
    if (!phoneValid) {
      Alert.alert('提示', '请输入正确的11位手机号');
      return;
    }
    setSending(true);
    try {
      const seconds = await sendSmsCode(normalizedPhone);
      setCountdown(seconds);
      Alert.alert('验证码已发送', `短信已发送至 ${normalizedPhone.slice(0, 3)}****${normalizedPhone.slice(7)}`);
    } catch (err) {
      Alert.alert('发送失败', err instanceof Error ? err.message : '请稍后重试');
    } finally {
      setSending(false);
    }
  };

  const onLogin = async () => {
    if (!phoneValid) {
      Alert.alert('提示', '请输入正确的11位手机号');
      return;
    }
    if (!codeValid) {
      Alert.alert('提示', '请输入6位数字验证码');
      return;
    }
    setLoggingIn(true);
    try {
      await login(normalizedPhone, code, inviteCode.trim() || undefined);
    } catch (err) {
      Alert.alert('登录失败', err instanceof Error ? err.message : '请稍后重试');
    } finally {
      setLoggingIn(false);
    }
  };

  return (
    <KeyboardAvoidingView
      style={styles.page}
      behavior={Platform.OS === 'ios' ? 'padding' : undefined}
    >
      <ScrollView
        contentContainerStyle={styles.content}
        keyboardShouldPersistTaps="handled"
        showsVerticalScrollIndicator={false}
      >
        <View style={styles.brandBlock}>
          <View style={styles.logo}>
            <Text style={styles.logoText}>联</Text>
          </View>
          <Text style={styles.title}>全球云智算</Text>
          <Text style={styles.subtitle}>登录后管理设备与查看收益</Text>
        </View>

        <View style={styles.formCard}>
          <Text style={styles.formTitle}>手机号登录</Text>
          <Text style={styles.label}>手机号码</Text>
          <View style={styles.inputRow}>
            <Text style={styles.countryCode}>+86</Text>
            <View style={styles.divider} />
            <TextInput
              value={phone}
              onChangeText={(value) => setPhone(value.replace(/\D/g, '').slice(0, 11))}
              placeholder="请输入手机号"
              placeholderTextColor={colors.muted}
              keyboardType="phone-pad"
              textContentType="telephoneNumber"
              autoComplete="tel"
              maxLength={11}
              style={styles.phoneInput}
            />
          </View>

          <Text style={styles.label}>短信验证码</Text>
          <View style={styles.inputRow}>
            <TextInput
              value={code}
              onChangeText={(value) => setCode(value.replace(/\D/g, '').slice(0, 6))}
              placeholder="请输入6位验证码"
              placeholderTextColor={colors.muted}
              keyboardType="number-pad"
              textContentType="oneTimeCode"
              autoComplete="sms-otp"
              maxLength={6}
              style={styles.codeInput}
            />
            <Pressable
              disabled={!phoneValid || sending || countdown > 0}
              onPress={onSendCode}
              style={({ pressed }) => [
                styles.sendButton,
                (!phoneValid || sending || countdown > 0) && styles.sendButtonDisabled,
                pressed && countdown === 0 && styles.sendButtonPressed,
              ]}
            >
              <Text style={styles.sendButtonText}>
                {sending ? '发送中...' : countdown > 0 ? `${countdown}秒后重发` : '获取验证码'}
              </Text>
            </Pressable>
          </View>

          <Text style={styles.label}>邀请码（选填）</Text>
          <View style={styles.inputRow}>
            <TextInput
              value={inviteCode}
              onChangeText={(value) => setInviteCode(value.trim().slice(0, 32))}
              placeholder="新用户可填写邀请人的邀请码"
              placeholderTextColor={colors.muted}
              autoCapitalize="none"
              maxLength={32}
              style={styles.fullInput}
            />
          </View>

          <Button
            title={loggingIn ? '登录中...' : '登录 / 注册'}
            onPress={onLogin}
            disabled={!phoneValid || !codeValid || loggingIn}
            style={styles.loginButton}
          />
          <Text style={styles.agreement}>登录即代表你同意平台服务协议与隐私政策</Text>
        </View>

        <Text style={styles.securityTip}>验证码由阿里云短信服务发送，请勿向他人泄露</Text>
      </ScrollView>
    </KeyboardAvoidingView>
  );
}

const styles = StyleSheet.create({
  page: { flex: 1, backgroundColor: colors.bg },
  content: { flexGrow: 1, justifyContent: 'center', padding: 24, paddingBottom: 40 },
  brandBlock: { alignItems: 'center', marginBottom: 28 },
  logo: {
    width: 68,
    height: 68,
    borderRadius: 18,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: colors.navy,
    borderWidth: 3,
    borderColor: '#d8f6fb',
  },
  logoText: { color: colors.cyan, fontSize: 30, fontWeight: '900' },
  title: { marginTop: 14, fontSize: 27, fontWeight: '900', color: colors.navy, letterSpacing: 2 },
  subtitle: { marginTop: 8, fontSize: 14, color: colors.textSecondary },
  formCard: {
    backgroundColor: colors.card,
    borderRadius: radius.xl,
    padding: 20,
    borderWidth: 1,
    borderColor: colors.border,
  },
  formTitle: { color: colors.text, fontSize: 19, fontWeight: '800', marginBottom: 20 },
  label: { color: colors.textSecondary, fontSize: 13, fontWeight: '600', marginBottom: 8, marginTop: 4 },
  inputRow: {
    minHeight: 50,
    flexDirection: 'row',
    alignItems: 'center',
    borderWidth: 1,
    borderColor: colors.border,
    borderRadius: radius.md,
    backgroundColor: '#fbfdff',
    marginBottom: 16,
    overflow: 'hidden',
  },
  countryCode: { paddingLeft: 14, paddingRight: 12, color: colors.text, fontSize: 15, fontWeight: '700' },
  divider: { width: StyleSheet.hairlineWidth, height: 22, backgroundColor: colors.border },
  phoneInput: { flex: 1, minHeight: 48, paddingHorizontal: 12, color: colors.text, fontSize: 16 },
  codeInput: { flex: 1, minHeight: 48, paddingHorizontal: 14, color: colors.text, fontSize: 16 },
  fullInput: { flex: 1, minHeight: 48, paddingHorizontal: 14, color: colors.text, fontSize: 15 },
  sendButton: {
    height: 48,
    paddingHorizontal: 14,
    alignItems: 'center',
    justifyContent: 'center',
    borderLeftWidth: StyleSheet.hairlineWidth,
    borderLeftColor: colors.border,
    backgroundColor: '#eef7ff',
  },
  sendButtonDisabled: { backgroundColor: '#f4f6f9' },
  sendButtonPressed: { opacity: 0.75 },
  sendButtonText: { color: colors.primary, fontSize: 13, fontWeight: '700' },
  loginButton: { marginTop: 8, minHeight: 48 },
  agreement: { textAlign: 'center', color: colors.muted, fontSize: 11, marginTop: 14 },
  securityTip: { textAlign: 'center', color: colors.muted, fontSize: 12, marginTop: 18 },
});
