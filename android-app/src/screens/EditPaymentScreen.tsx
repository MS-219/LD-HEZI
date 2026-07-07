/**
 * 收款信息设置（对应 pages/edit-payment）：查看当前银行卡（脱敏）并修改。
 */
import React, { useCallback, useEffect, useState } from 'react';
import { Alert, ScrollView, StyleSheet, Text, TextInput, View } from 'react-native';
import { request } from '../api';
import { Button, Card, InfoRow, NavBar } from '../components/common';
import { useNavigation } from '../navigation';
import { useSession } from '../session';
import { colors, radius } from '../theme';
import { maskCardNo } from '../utils/format';

export default function EditPaymentScreen() {
  const nav = useNavigation();
  const { userId } = useSession();
  const [current, setCurrent] = useState({ realName: '', bankCardNo: '' });
  const [cardNo, setCardNo] = useState('');
  const [submitting, setSubmitting] = useState(false);

  const load = useCallback(async () => {
    if (!userId) return;
    try {
      const res = await request<any>({ url: '/api/withdraw/wallet', data: { userId } });
      if (res.code === 200 && res.data) {
        setCurrent({
          realName: res.data.bankHolderName || res.data.savedRealName || '',
          bankCardNo: res.data.bankCardNo || '',
        });
      }
    } catch {
      // ignore
    }
  }, [userId]);

  useEffect(() => {
    load();
  }, [load]);

  const canSubmit = /^\d{15,19}$/.test(cardNo.replace(/\s/g, ''));

  const submit = () => {
    if (!canSubmit || submitting) return;
    Alert.alert('确认修改', `确定将银行卡号修改为：${cardNo}？`, [
      { text: '取消', style: 'cancel' },
      {
        text: '确定',
        onPress: async () => {
          setSubmitting(true);
          try {
            const res = await request({
              url: '/api/withdraw/save-payment-info',
              method: 'POST',
              data: { userId, type: 3, bankCardNo: cardNo.trim(), bankHolderName: current.realName },
            });
            if (res.code === 200) {
              Alert.alert('修改成功', '', [{ text: '好的', onPress: () => nav.back() }]);
            } else {
              Alert.alert('修改失败', res.msg || '请稍后重试');
            }
          } catch (err) {
            Alert.alert('修改失败', err instanceof Error ? err.message : '网络错误');
          } finally {
            setSubmitting(false);
          }
        },
      },
    ]);
  };

  return (
    <View style={styles.page}>
      <NavBar title="收款信息设置" />
      <ScrollView contentContainerStyle={styles.content}>
        <Card>
          <Text style={styles.sectionTitle}>当前收款信息</Text>
          <InfoRow label="收款人" value={current.realName || '未设置'} />
          <InfoRow label="银行卡号" value={current.bankCardNo ? maskCardNo(current.bankCardNo) : '未设置'} />
        </Card>
        <Card>
          <Text style={styles.sectionTitle}>修改银行卡号</Text>
          <TextInput
            value={cardNo}
            onChangeText={setCardNo}
            placeholder="请输入新的银行卡号（15-19位数字）"
            placeholderTextColor={colors.muted}
            keyboardType="number-pad"
            style={styles.input}
          />
          <Button
            title={submitting ? '提交中...' : '确认修改'}
            disabled={!canSubmit || submitting}
            onPress={submit}
            style={{ marginTop: 14 }}
          />
        </Card>
        <Text style={styles.tip}>提示：收款人姓名以提现时填写的真实姓名为准；微信/支付宝收款码可在申请提现页上传。</Text>
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  page: { flex: 1, backgroundColor: colors.bg },
  content: { padding: 16 },
  sectionTitle: { fontSize: 15, fontWeight: '700', color: colors.text, marginBottom: 10 },
  input: {
    borderWidth: 1,
    borderColor: colors.border,
    borderRadius: radius.md,
    paddingHorizontal: 12,
    paddingVertical: 11,
    color: colors.text,
  },
  tip: { color: colors.muted, fontSize: 12, lineHeight: 18, marginTop: 4, paddingHorizontal: 4 },
});
