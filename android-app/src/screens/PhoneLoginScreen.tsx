import React, { useEffect, useState } from 'react';
import { Alert, KeyboardAvoidingView, Platform, Pressable, ScrollView, StyleSheet, Text, TextInput, View } from 'react-native';
import { Button } from '../components/common';
import { useSession } from '../session';
import { getItem } from '../storage';
import { colors, radius, shadow } from '../theme';

const PHONE_PATTERN = /^1[3-9]\d{9}$/;

export default function PhoneLoginScreen() {
  const { sendSmsCode, loginWithSms, loginWithPassword } = useSession();
  const [mode, setMode] = useState<'password' | 'sms'>('password');
  const [phone, setPhone] = useState('');
  const [password, setPassword] = useState('');
  const [code, setCode] = useState('');
  const [countdown, setCountdown] = useState(0);
  const [sending, setSending] = useState(false);
  const [loggingIn, setLoggingIn] = useState(false);

  useEffect(() => { getItem('lastLoginPhone').then((v) => v && setPhone(v)); }, []);
  useEffect(() => {
    if (countdown <= 0) return;
    const timer = setInterval(() => setCountdown((v) => Math.max(0, v - 1)), 1000);
    return () => clearInterval(timer);
  }, [countdown]);

  const normalized = phone.replace(/\D/g, '');
  const phoneValid = PHONE_PATTERN.test(normalized);

  const send = async () => {
    if (!phoneValid) return Alert.alert('提示', '请输入正确的11位手机号');
    setSending(true);
    try {
      setCountdown(await sendSmsCode(normalized));
      Alert.alert('验证码已发送', `短信已发送至 ${normalized.slice(0, 3)}****${normalized.slice(7)}`);
    } catch (e) {
      Alert.alert('发送失败', e instanceof Error ? e.message : '请稍后重试');
    } finally { setSending(false); }
  };

  const submit = async () => {
    if (!phoneValid) return Alert.alert('提示', '请输入正确的11位手机号');
    if (mode === 'password' && !password) return Alert.alert('提示', '请输入密码');
    if (mode === 'sms' && !/^\d{6}$/.test(code)) return Alert.alert('提示', '请输入6位验证码');
    setLoggingIn(true);
    try {
      if (mode === 'password') await loginWithPassword(normalized, password);
      else await loginWithSms(normalized, code);
    } catch (e) {
      Alert.alert('登录失败', e instanceof Error ? e.message : '请稍后重试');
    } finally { setLoggingIn(false); }
  };

  return (
    <KeyboardAvoidingView style={styles.page} behavior={Platform.OS === 'ios' ? 'padding' : undefined}>
      <ScrollView contentContainerStyle={styles.content} keyboardShouldPersistTaps="handled" showsVerticalScrollIndicator={false}>
        <View style={styles.brand}>
          <View style={styles.logoShell}>
            <View style={styles.logo}><Text style={styles.logoText}>联</Text></View>
            <View style={styles.logoPulse} />
          </View>
          <Text style={styles.eyebrow}>GLOBAL CLOUD COMPUTING</Text>
          <Text style={styles.title}>全球云智算</Text>
          <Text style={styles.subtitle}>连接设备 · 查看收益 · 管理算力</Text>
        </View>

        <View style={styles.card}>
          <View style={styles.cardHead}>
            <View><Text style={styles.welcome}>欢迎回来</Text><Text style={styles.welcomeSub}>请选择登录方式继续</Text></View>
            <View style={styles.secureBadge}><View style={styles.secureDot} /><Text style={styles.secureText}>安全登录</Text></View>
          </View>
          <View style={styles.tabs}>
            <Pressable style={[styles.tab, mode === 'password' && styles.tabActive]} onPress={() => setMode('password')}><Text style={[styles.tabText, mode === 'password' && styles.tabTextActive]}>密码登录</Text></Pressable>
            <Pressable style={[styles.tab, mode === 'sms' && styles.tabActive]} onPress={() => setMode('sms')}><Text style={[styles.tabText, mode === 'sms' && styles.tabTextActive]}>短信登录</Text></Pressable>
          </View>

          <Text style={styles.label}>手机号码</Text>
          <View style={styles.inputRow}>
            <Text style={styles.country}>+86</Text><View style={styles.divider} />
            <TextInput value={phone} onChangeText={(v) => setPhone(v.replace(/\D/g, '').slice(0, 11))} placeholder="请输入手机号" placeholderTextColor={colors.muted} keyboardType="phone-pad" maxLength={11} style={styles.input} />
          </View>

          {mode === 'password' ? <>
            <Text style={styles.label}>登录密码</Text>
            <View style={styles.inputRow}><TextInput value={password} onChangeText={setPassword} placeholder="请输入登录密码" placeholderTextColor={colors.muted} secureTextEntry autoCapitalize="none" style={styles.input} /></View>
          </> : <>
            <Text style={styles.label}>短信验证码</Text>
            <View style={styles.inputRow}>
              <TextInput value={code} onChangeText={(v) => setCode(v.replace(/\D/g, '').slice(0, 6))} placeholder="请输入6位验证码" placeholderTextColor={colors.muted} keyboardType="number-pad" maxLength={6} style={styles.input} />
              <Pressable disabled={!phoneValid || sending || countdown > 0} onPress={send} style={[styles.send, (!phoneValid || sending || countdown > 0) && styles.sendDisabled]}><Text style={styles.sendText}>{sending ? '发送中' : countdown > 0 ? `${countdown}秒` : '获取验证码'}</Text></Pressable>
            </View>
          </>}

          <Button title={loggingIn ? '正在登录...' : '登 录'} onPress={submit} disabled={loggingIn} style={styles.login} />
          <View style={styles.tipRow}><View style={styles.tipLine} /><Text style={styles.tip}>未注册手机号验证后自动创建账号</Text><View style={styles.tipLine} /></View>
          <Text style={styles.firstTip}>后台开通的账号仍可使用密码登录</Text>
        </View>
      </ScrollView>
    </KeyboardAvoidingView>
  );
}

const styles = StyleSheet.create({
  page: { flex: 1, backgroundColor: 'transparent' },
  content: { flexGrow: 1, justifyContent: 'center', paddingHorizontal: 22, paddingTop: 30, paddingBottom: 40 },
  brand: { alignItems: 'center', marginBottom: 26 },
  logoShell: { width: 80, height: 80, alignItems: 'center', justifyContent: 'center' },
  logo: { width: 66, height: 66, borderRadius: 21, alignItems: 'center', justifyContent: 'center', backgroundColor: colors.card, borderWidth: 1, borderColor: '#C9E2F5', ...shadow.card },
  logoPulse: { position: 'absolute', right: 3, top: 8, width: 14, height: 14, borderRadius: 7, backgroundColor: colors.green, borderWidth: 3, borderColor: '#D7ECFA' },
  logoText: { color: colors.primary, fontSize: 29, fontWeight: '900' },
  eyebrow: { marginTop: 13, color: colors.primary, fontSize: 9, fontWeight: '900', letterSpacing: 2.1 },
  title: { marginTop: 5, fontSize: 29, fontWeight: '900', color: colors.navy, letterSpacing: 2 },
  subtitle: { marginTop: 8, fontSize: 13, color: colors.textSecondary, letterSpacing: 0.5 },
  card: { backgroundColor: 'rgba(255,255,255,0.96)', borderRadius: radius.xl, padding: 20, borderWidth: 1, borderColor: '#D4E6F4', ...shadow.card },
  cardHead: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: 19 },
  welcome: { color: colors.text, fontSize: 20, fontWeight: '900' }, welcomeSub: { color: colors.muted, fontSize: 12, marginTop: 4 },
  secureBadge: { flexDirection: 'row', alignItems: 'center', gap: 5, paddingHorizontal: 9, paddingVertical: 5, borderRadius: radius.pill, backgroundColor: colors.greenSoft }, secureDot: { width: 6, height: 6, borderRadius: 3, backgroundColor: colors.green }, secureText: { color: colors.green, fontSize: 10, fontWeight: '800' },
  tabs: { flexDirection: 'row', marginBottom: 22, backgroundColor: colors.surface, borderRadius: radius.md, padding: 4, borderWidth: 1, borderColor: colors.borderSoft },
  tab: { flex: 1, alignItems: 'center', paddingVertical: 10, borderRadius: radius.sm }, tabActive: { backgroundColor: colors.card, ...shadow.card }, tabText: { fontWeight: '700', color: colors.textSecondary, fontSize: 13 }, tabTextActive: { color: colors.primary, fontWeight: '900' },
  label: { color: colors.textSecondary, fontSize: 12, fontWeight: '800', marginBottom: 8, marginLeft: 2 },
  inputRow: { minHeight: 52, flexDirection: 'row', alignItems: 'center', borderWidth: 1, borderColor: colors.border, borderRadius: radius.md, backgroundColor: colors.surface, marginBottom: 16, overflow: 'hidden' },
  country: { paddingHorizontal: 14, fontWeight: '800', color: colors.text }, divider: { width: StyleSheet.hairlineWidth, height: 24, backgroundColor: colors.border }, input: { flex: 1, minHeight: 50, paddingHorizontal: 14, color: colors.text, fontSize: 15 },
  send: { height: 40, marginRight: 6, paddingHorizontal: 13, borderRadius: 10, justifyContent: 'center', backgroundColor: colors.primarySoft }, sendDisabled: { opacity: 0.5 }, sendText: { color: colors.primary, fontWeight: '800', fontSize: 12 },
  login: { marginTop: 7, minHeight: 52 },
  tipRow: { flexDirection: 'row', alignItems: 'center', gap: 10, marginTop: 17 }, tipLine: { flex: 1, height: StyleSheet.hairlineWidth, backgroundColor: colors.border }, tip: { textAlign: 'center', color: colors.textSecondary, fontSize: 11 }, firstTip: { textAlign: 'center', color: colors.muted, fontSize: 11, marginTop: 6 },
});
