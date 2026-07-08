/**
 * 申请提现（对应 pages/withdraw）：钱包余额/算力值、提现方式（支付宝/银行卡/微信收款码）、
 * 金额快捷选择、收款信息自动回填、收款码上传、提交申请。
 */
import React, { useCallback, useEffect, useState } from 'react';
import {
  Alert,
  Image,
  Pressable,
  RefreshControl,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  View,
} from 'react-native';
import { formatUrl, request, uploadImage } from '../api';
import { Button, Card, NavBar } from '../components/common';
import { imagePickerAvailable, pickImages } from '../native/imagePicker';
import { useNavigation } from '../navigation';
import { useSession } from '../session';
import { colors, radius } from '../theme';

const typeOptions = [
  { value: 3, label: '银行卡' },
  { value: 2, label: '支付宝' },
  { value: 1, label: '微信' },
];

export default function WithdrawScreen() {
  const nav = useNavigation();
  const { userId } = useSession();
  const [hashratePerYuan, setHashratePerYuan] = useState(100);
  const [minWithdraw, setMinWithdraw] = useState(10);
  const [wallet, setWallet] = useState({
    available: '0.00',
    total: '0.00',
    pending: '0.00',
    withdrawn: '0.00',
    hashrateBalance: 0,
    totalHashrate: 0,
  });
  const [canWithdraw, setCanWithdraw] = useState(true);
  const [withdrawMessage, setWithdrawMessage] = useState('');
  const [saved, setSaved] = useState({ wxQrCode: '', aliQrCode: '', bankCardNo: '', alipayAccount: '', realName: '' });
  const [form, setForm] = useState({ type: 3, amount: '', account: '', realName: '', qrCode: '' });
  const [submitting, setSubmitting] = useState(false);
  const [walletLoading, setWalletLoading] = useState(false);
  const [walletReady, setWalletReady] = useState(false);

  const fetchConfig = useCallback(async () => {
    try {
      const [statusRes, configRes] = await Promise.all([
        request<any>({ url: '/api/settings/withdraw-status' }),
        request<any>({ url: '/api/settings/earnings-config' }),
      ]);
      if (statusRes.code === 200 && statusRes.data) {
        setCanWithdraw(statusRes.data.canWithdraw);
        setWithdrawMessage(statusRes.data.message || '');
      }
      if (configRes.code === 200 && configRes.data) {
        setHashratePerYuan(parseInt(configRes.data.hashratePerYuan || 100, 10) || 100);
        setMinWithdraw(configRes.data.minWithdraw || 10);
      }
    } catch {
      // ignore
    }
  }, []);

  const fetchWallet = useCallback(async () => {
    if (!userId) return;
    setWalletLoading(true);
    setWalletReady(false);
    try {
      const res = await request<any>({ url: '/api/withdraw/wallet', data: { userId } });
      if (res.code === 200 && res.data) {
        const data = res.data;
        const available = parseFloat(data.available) || 0;
        const total = parseFloat(data.total) || 0;
        setWallet({
          available: available.toFixed(2),
          total: data.total || '0.00',
          pending: data.pending || '0.00',
          withdrawn: data.withdrawn || '0.00',
          hashrateBalance: Math.round(available * hashratePerYuan),
          totalHashrate: Math.round(total * hashratePerYuan),
        });
        const realName = data.bankHolderName || data.savedRealName || '';
        setSaved({
          wxQrCode: data.wxQrCode || '',
          aliQrCode: data.aliQrCode || '',
          bankCardNo: data.bankCardNo || '',
          alipayAccount: data.alipayAccount || '',
          realName,
        });
        // 按当前提现方式自动回填收款信息
        setForm((prev) => ({
          ...prev,
          realName,
          account: prev.type === 3 ? data.bankCardNo || '' : prev.type === 2 ? data.alipayAccount || '' : '',
          qrCode: prev.type === 1 ? data.wxQrCode || '' : prev.type === 2 ? data.aliQrCode || '' : '',
        }));
        setWalletReady(true);
      }
    } catch {
      // ignore
    } finally {
      setWalletLoading(false);
    }
  }, [userId, hashratePerYuan]);

  useEffect(() => {
    fetchConfig();
  }, [fetchConfig]);

  useEffect(() => {
    fetchWallet();
  }, [fetchWallet]);

  const selectType = (type: number) => {
    setForm((prev) => ({
      ...prev,
      type,
      account: type === 3 ? saved.bankCardNo : type === 2 ? saved.alipayAccount : '',
      qrCode: type === 1 ? saved.wxQrCode : type === 2 ? saved.aliQrCode : '',
    }));
  };

  const uploadQrCode = async () => {
    if (!imagePickerAvailable) {
      Alert.alert('提示', '当前平台暂不支持上传收款码');
      return;
    }
    const uris = await pickImages(1);
    if (!uris.length) return;
    try {
      const url = await uploadImage(uris[0]);
      setForm((prev) => ({ ...prev, qrCode: url }));
      // 立即保存到后端（与小程序一致）
      const res = await request({
        url: '/api/withdraw/save-payment-info',
        method: 'POST',
        data: { userId, type: form.type, qrCode: url },
      });
      if (res.code === 200) {
        setSaved((prev) =>
          form.type === 1 ? { ...prev, wxQrCode: url } : form.type === 2 ? { ...prev, aliQrCode: url } : prev
        );
        Alert.alert('上传成功');
      }
    } catch (err) {
      Alert.alert('上传失败', err instanceof Error ? err.message : '网络错误');
    }
  };

  const submit = async () => {
    if (!walletReady) {
      Alert.alert('提示', '余额刷新中，请稍后');
      return;
    }
    const amount = parseFloat(form.amount) || 0;
    const available = parseFloat(wallet.available) || 0;
    if (amount < minWithdraw) {
      Alert.alert('提示', `最低提现金额为${minWithdraw}U`);
      return;
    }
    if (amount > available) {
      Alert.alert('提示', '提现金额超过可用余额');
      return;
    }
    if (form.type === 3) {
      const cardNo = (form.account || '').replace(/\s/g, '');
      if (!/^\d{15,19}$/.test(cardNo)) {
        Alert.alert('提示', '请输入正确的银行卡号（15-19位数字）');
        return;
      }
    }
    setSubmitting(true);
    try {
      const res = await request({
        url: '/api/withdraw/apply',
        method: 'POST',
        data: {
          userId,
          amount: form.amount,
          type: form.type,
          account: form.account,
          realName: form.realName,
          qrCode: form.qrCode,
        },
      });
      if (res.code === 200) {
        Alert.alert('提现申请已提交', '', [{ text: '好的', onPress: () => nav.back() }]);
      } else {
        Alert.alert('提交失败', res.msg || '请稍后重试');
      }
    } catch (err) {
      Alert.alert('提交失败', err instanceof Error ? err.message : '网络错误');
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <View style={styles.page}>
      <NavBar
        title="申请提现"
        right={
          <Pressable onPress={() => nav.navigate('withdraw-record')}>
            <Text style={styles.navRecord}>记录</Text>
          </Pressable>
        }
      />
      <ScrollView
        contentContainerStyle={styles.content}
        refreshControl={<RefreshControl refreshing={walletLoading} onRefresh={fetchWallet} />}
      >
        {/* 钱包概览 */}
        <Card style={styles.walletCard}>
          <Text style={styles.walletLabel}>可提现余额（U）</Text>
          <Text style={styles.walletBalance}>{wallet.available} U</Text>
          <View style={styles.walletMetaRow}>
            <Text style={styles.walletMeta}>算力值 {wallet.hashrateBalance}</Text>
            <Text style={styles.walletMeta}>待审核 {wallet.pending} U</Text>
            <Text style={styles.walletMeta}>已提现 {wallet.withdrawn} U</Text>
          </View>
        </Card>

        {!canWithdraw && !!withdrawMessage && (
          <Card style={styles.warnCard}>
            <Text style={styles.warnText}>{withdrawMessage}</Text>
          </Card>
        )}

        {/* 提现方式 */}
        <Card>
          <Text style={styles.sectionTitle}>提现方式</Text>
          <View style={styles.typeRow}>
            {typeOptions.map((opt) => {
              const active = form.type === opt.value;
              return (
                <Pressable
                  key={opt.value}
                  onPress={() => selectType(opt.value)}
                  style={[styles.typeItem, active && styles.typeItemOn]}
                >
                  <Text style={[styles.typeText, active && styles.typeTextOn]}>{opt.label}</Text>
                </Pressable>
              );
            })}
          </View>

          <Text style={styles.fieldLabel}>提现金额（最低 {minWithdraw} U）</Text>
          <TextInput
            value={form.amount}
            onChangeText={(text) => setForm((prev) => ({ ...prev, amount: text }))}
            placeholder="请输入提现金额"
            placeholderTextColor={colors.muted}
            keyboardType="decimal-pad"
            style={styles.input}
          />
          <View style={styles.amountQuick}>
            {[50, 100, 200].map((v) => (
              <Pressable key={v} style={styles.quickItem} onPress={() => setForm((p) => ({ ...p, amount: String(v) }))}>
                <Text style={styles.quickText}>{v}U</Text>
              </Pressable>
            ))}
            <Pressable style={styles.quickItem} onPress={() => setForm((p) => ({ ...p, amount: wallet.available }))}>
              <Text style={styles.quickText}>全部</Text>
            </Pressable>
          </View>

          <Text style={styles.fieldLabel}>真实姓名</Text>
          <TextInput
            value={form.realName}
            onChangeText={(text) => setForm((prev) => ({ ...prev, realName: text }))}
            placeholder="请输入收款人真实姓名"
            placeholderTextColor={colors.muted}
            style={styles.input}
          />

          {form.type !== 1 && (
            <>
              <Text style={styles.fieldLabel}>{form.type === 3 ? '银行卡号' : '支付宝账号'}</Text>
              <TextInput
                value={form.account}
                onChangeText={(text) => setForm((prev) => ({ ...prev, account: text }))}
                placeholder={form.type === 3 ? '请输入银行卡号' : '请输入支付宝账号'}
                placeholderTextColor={colors.muted}
                keyboardType={form.type === 3 ? 'number-pad' : 'default'}
                style={styles.input}
              />
            </>
          )}

          {form.type !== 3 && (
            <>
              <Text style={styles.fieldLabel}>收款码（选填）</Text>
              {form.qrCode ? (
                <Pressable onPress={uploadQrCode}>
                  <Image source={{ uri: formatUrl(form.qrCode) }} style={styles.qrImage} />
                  <Text style={styles.qrTip}>点击更换收款码</Text>
                </Pressable>
              ) : (
                <Button title="上传收款码" type="secondary" onPress={uploadQrCode} />
              )}
            </>
          )}
        </Card>

        <Button
          title={submitting ? '提交中...' : `确认提现 ${(parseFloat(form.amount) || 0).toFixed(2)} U`}
          type="success"
          disabled={submitting || !canWithdraw}
          onPress={submit}
        />
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  page: { flex: 1, backgroundColor: colors.bg },
  content: { padding: 16, paddingBottom: 32 },
  navRecord: { color: colors.primary, fontSize: 14, fontWeight: '600' },
  walletCard: { backgroundColor: colors.navy, borderColor: colors.navy, alignItems: 'center', paddingVertical: 22 },
  walletLabel: { color: '#9fd2f5', fontSize: 13 },
  walletBalance: { color: '#ffffff', fontSize: 34, fontWeight: '800', marginTop: 6 },
  walletMetaRow: { flexDirection: 'row', gap: 14, marginTop: 12 },
  walletMeta: { color: '#9fd2f5', fontSize: 12 },
  warnCard: { backgroundColor: '#fef3c7', borderColor: '#fde68a' },
  warnText: { color: '#92400e', fontSize: 13, lineHeight: 19 },
  sectionTitle: { fontSize: 15, fontWeight: '700', color: colors.text, marginBottom: 12 },
  typeRow: { flexDirection: 'row', gap: 8, marginBottom: 6 },
  typeItem: {
    flex: 1,
    borderWidth: 1,
    borderColor: colors.border,
    borderRadius: radius.md,
    paddingVertical: 10,
    alignItems: 'center',
  },
  typeItemOn: { borderColor: colors.green, backgroundColor: '#f0fdf4' },
  typeText: { color: colors.textSecondary, fontWeight: '600' },
  typeTextOn: { color: colors.green, fontWeight: '700' },
  fieldLabel: { color: colors.text, fontWeight: '600', marginTop: 14, marginBottom: 8, fontSize: 14 },
  input: {
    borderWidth: 1,
    borderColor: colors.border,
    borderRadius: radius.md,
    paddingHorizontal: 12,
    paddingVertical: 11,
    color: colors.text,
  },
  amountQuick: { flexDirection: 'row', gap: 8, marginTop: 10 },
  quickItem: {
    borderWidth: 1,
    borderColor: colors.border,
    borderRadius: 999,
    paddingHorizontal: 14,
    paddingVertical: 6,
  },
  quickText: { color: colors.textSecondary, fontSize: 13 },
  qrImage: { width: 120, height: 120, borderRadius: 10, backgroundColor: colors.border },
  qrTip: { color: colors.muted, fontSize: 12, marginTop: 6 },
});
