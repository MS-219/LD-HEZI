/**
 * 收货地址管理（对应 pages/address-manage）：列表、新增/编辑表单、删除、设为默认。
 * 小程序的省市区 picker 在 App 端改为三个文本输入。
 */
import React, { useCallback, useEffect, useState } from 'react';
import {
  Alert,
  Modal,
  Pressable,
  RefreshControl,
  ScrollView,
  StyleSheet,
  Switch,
  Text,
  TextInput,
  View,
} from 'react-native';
import { request } from '../api';
import { Badge, Button, Card, Empty, NavBar } from '../components/common';
import { useSession } from '../session';
import { colors, radius } from '../theme';

const emptyForm = {
  receiverName: '',
  phone: '',
  province: '',
  city: '',
  district: '',
  detailAddress: '',
  isDefault: 0,
};

export default function AddressManageScreen() {
  const { userId } = useSession();
  const [addresses, setAddresses] = useState<any[]>([]);
  const [loading, setLoading] = useState(false);
  const [showForm, setShowForm] = useState(false);
  const [editingId, setEditingId] = useState<number | null>(null);
  const [form, setForm] = useState({ ...emptyForm });

  const fetchAddresses = useCallback(async () => {
    if (!userId) return;
    setLoading(true);
    try {
      const res = await request<any[]>({ url: `/api/address/list?userId=${userId}` });
      if (res.code === 200) setAddresses(res.data || []);
    } catch {
      // ignore
    } finally {
      setLoading(false);
    }
  }, [userId]);

  useEffect(() => {
    fetchAddresses();
  }, [fetchAddresses]);

  const openAdd = () => {
    setEditingId(null);
    setForm({ ...emptyForm });
    setShowForm(true);
  };

  const openEdit = (addr: any) => {
    setEditingId(addr.id);
    setForm({
      receiverName: addr.receiverName || '',
      phone: addr.phone || '',
      province: addr.province || '',
      city: addr.city || '',
      district: addr.district || '',
      detailAddress: addr.detailAddress || '',
      isDefault: addr.isDefault || 0,
    });
    setShowForm(true);
  };

  const save = async () => {
    if (!form.receiverName.trim()) return Alert.alert('提示', '请输入收货人');
    if (!form.phone.trim()) return Alert.alert('提示', '请输入电话');
    if (!form.province.trim()) return Alert.alert('提示', '请输入省份');
    if (!form.detailAddress.trim()) return Alert.alert('提示', '请输入详细地址');
    try {
      const data: any = { userId, ...form };
      if (editingId) data.id = editingId;
      const res = await request({ url: '/api/address/save', method: 'POST', data });
      if (res.code === 200) {
        Alert.alert('保存成功');
        setShowForm(false);
        fetchAddresses();
      } else {
        Alert.alert('保存失败', res.msg || '请稍后重试');
      }
    } catch (err) {
      Alert.alert('保存失败', err instanceof Error ? err.message : '网络错误');
    }
  };

  const remove = (id: number) => {
    Alert.alert('删除地址', '确定删除该收货地址？', [
      { text: '取消', style: 'cancel' },
      {
        text: '删除',
        style: 'destructive',
        onPress: async () => {
          try {
            const res = await request({ url: `/api/address/${id}?userId=${userId}`, method: 'DELETE' });
            if (res.code === 200) {
              Alert.alert('已删除');
              fetchAddresses();
            }
          } catch (err) {
            Alert.alert('删除失败', err instanceof Error ? err.message : '网络错误');
          }
        },
      },
    ]);
  };

  const setDefault = async (id: number) => {
    try {
      const res = await request({
        url: '/api/address/setDefault',
        method: 'POST',
        data: { userId, addressId: id },
      });
      if (res.code === 200) {
        Alert.alert('设置成功');
        fetchAddresses();
      }
    } catch (err) {
      Alert.alert('设置失败', err instanceof Error ? err.message : '网络错误');
    }
  };

  const updateField = (field: keyof typeof emptyForm, value: string | number) =>
    setForm((prev) => ({ ...prev, [field]: value }));

  return (
    <View style={styles.page}>
      <NavBar
        title="收货地址"
        right={
          <Pressable onPress={openAdd}>
            <Text style={styles.navAdd}>＋</Text>
          </Pressable>
        }
      />
      <ScrollView
        contentContainerStyle={styles.content}
        refreshControl={<RefreshControl refreshing={loading} onRefresh={fetchAddresses} />}
      >
        {addresses.map((addr) => (
          <Card key={addr.id}>
            <View style={styles.row}>
              <Text style={styles.name}>
                {addr.receiverName} {addr.phone}
              </Text>
              {addr.isDefault === 1 && <Badge text="默认" color={colors.green} />}
            </View>
            <Text style={styles.detail}>
              {addr.province}
              {addr.city}
              {addr.district}
              {addr.detailAddress}
            </Text>
            <View style={styles.actions}>
              {addr.isDefault !== 1 && (
                <Button title="设为默认" type="secondary" style={styles.actionButton} onPress={() => setDefault(addr.id)} />
              )}
              <Button title="编辑" type="secondary" style={styles.actionButton} onPress={() => openEdit(addr)} />
              <Button title="删除" type="danger" style={styles.actionButton} onPress={() => remove(addr.id)} />
            </View>
          </Card>
        ))}
        {addresses.length === 0 && <Empty text="暂无收货地址，点击右上角添加" />}
        <Button title="新增收货地址" onPress={openAdd} style={{ marginTop: 8 }} />
      </ScrollView>

      {/* 新增/编辑表单 */}
      <Modal visible={showForm} transparent animationType="slide" onRequestClose={() => setShowForm(false)}>
        <View style={styles.formMask}>
          <View style={styles.form}>
            <Text style={styles.formTitle}>{editingId ? '编辑地址' : '新增地址'}</Text>
            <ScrollView>
              <TextInput
                value={form.receiverName}
                onChangeText={(t) => updateField('receiverName', t)}
                placeholder="收货人"
                placeholderTextColor={colors.muted}
                style={styles.input}
              />
              <TextInput
                value={form.phone}
                onChangeText={(t) => updateField('phone', t)}
                placeholder="联系电话"
                placeholderTextColor={colors.muted}
                keyboardType="phone-pad"
                style={styles.input}
              />
              <View style={styles.regionRow}>
                <TextInput
                  value={form.province}
                  onChangeText={(t) => updateField('province', t)}
                  placeholder="省"
                  placeholderTextColor={colors.muted}
                  style={[styles.input, styles.regionInput]}
                />
                <TextInput
                  value={form.city}
                  onChangeText={(t) => updateField('city', t)}
                  placeholder="市"
                  placeholderTextColor={colors.muted}
                  style={[styles.input, styles.regionInput]}
                />
                <TextInput
                  value={form.district}
                  onChangeText={(t) => updateField('district', t)}
                  placeholder="区/县"
                  placeholderTextColor={colors.muted}
                  style={[styles.input, styles.regionInput]}
                />
              </View>
              <TextInput
                value={form.detailAddress}
                onChangeText={(t) => updateField('detailAddress', t)}
                placeholder="详细地址（街道、门牌号等）"
                placeholderTextColor={colors.muted}
                multiline
                style={[styles.input, styles.textarea]}
              />
              <View style={styles.defaultRow}>
                <Text style={styles.defaultLabel}>设为默认地址</Text>
                <Switch
                  value={form.isDefault === 1}
                  onValueChange={(v) => updateField('isDefault', v ? 1 : 0)}
                  trackColor={{ true: colors.primary }}
                />
              </View>
            </ScrollView>
            <View style={styles.formActions}>
              <Button title="取消" type="secondary" style={{ flex: 1 }} onPress={() => setShowForm(false)} />
              <Button title="保存" style={{ flex: 1 }} onPress={save} />
            </View>
          </View>
        </View>
      </Modal>
    </View>
  );
}

const styles = StyleSheet.create({
  page: { flex: 1, backgroundColor: colors.bg },
  content: { padding: 16, paddingBottom: 32 },
  navAdd: { fontSize: 24, color: colors.primary },
  row: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' },
  name: { fontSize: 15, fontWeight: '700', color: colors.text },
  detail: { color: colors.textSecondary, marginTop: 6, lineHeight: 19, fontSize: 13 },
  actions: { flexDirection: 'row', gap: 8, marginTop: 12 },
  actionButton: { flex: 1, paddingVertical: 8 },
  formMask: { flex: 1, backgroundColor: 'rgba(15, 23, 42, 0.45)', justifyContent: 'flex-end' },
  form: {
    backgroundColor: colors.card,
    borderTopLeftRadius: 20,
    borderTopRightRadius: 20,
    padding: 20,
    paddingBottom: 32,
    maxHeight: '85%',
  },
  formTitle: { fontSize: 16, fontWeight: '800', color: colors.text, textAlign: 'center', marginBottom: 14 },
  input: {
    borderWidth: 1,
    borderColor: colors.border,
    borderRadius: radius.md,
    paddingHorizontal: 12,
    paddingVertical: 11,
    color: colors.text,
    marginBottom: 10,
  },
  regionRow: { flexDirection: 'row', gap: 8 },
  regionInput: { flex: 1 },
  textarea: { minHeight: 70, textAlignVertical: 'top' },
  defaultRow: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', paddingVertical: 6 },
  defaultLabel: { color: colors.text, fontSize: 14 },
  formActions: { flexDirection: 'row', gap: 10, marginTop: 14 },
});
