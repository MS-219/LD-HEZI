/**
 * 设备页（对应 pages/device）：设备列表、在线/离线筛选、搜索、
 * 绑定码添加设备（query-by-code → 确认 → bind）、编辑备注、解绑、复制设备号。
 */
import React, { useCallback, useEffect, useState } from 'react';
import {
  Alert,
  FlatList,
  Pressable,
  RefreshControl,
  StyleSheet,
  Text,
  TextInput,
  View,
} from 'react-native';
import { request } from '../api';
import { Badge, Button, Card, Empty, InputDialog, SegmentTabs } from '../components/common';
import { copyText } from '../native/clipboard';
import { useNavigation } from '../navigation';
import { useSession } from '../session';
import { colors, radius } from '../theme';
import { formatDate } from '../utils/format';

interface DeviceItem {
  id: number;
  sn: string;
  bindCode?: string;
  businessId?: string;
  name?: string;
  online: boolean;
  statusText: string;
  earnings: string;
  bindDate: string;
  location?: string;
}

export default function DeviceScreen() {
  const nav = useNavigation();
  const { userId, isLoggedIn } = useSession();
  const [allDevices, setAllDevices] = useState<DeviceItem[]>([]);
  const [filter, setFilter] = useState<'all' | 'online' | 'offline'>('all');
  const [keyword, setKeyword] = useState('');
  const [loading, setLoading] = useState(false);
  const [showBind, setShowBind] = useState(false);
  const [editTarget, setEditTarget] = useState<DeviceItem | null>(null);

  const fetchDevices = useCallback(async () => {
    if (!userId) return;
    setLoading(true);
    try {
      const res = await request<any[]>({ url: '/api/device/list', data: { userId } });
      if (res.code === 200) {
        setAllDevices(
          (res.data || []).map((item) => ({
            id: item.id,
            sn: item.sn,
            bindCode: item.bindCode,
            businessId: item.businessId,
            name: item.name,
            online: item.status === 1,
            statusText: item.status === 1 ? '服务中' : '已离线',
            earnings: item.earnings || '0.00',
            bindDate: formatDate(item.bindTime),
            location: item.location,
          }))
        );
      } else {
        Alert.alert('提示', res.msg || '获取列表失败');
      }
    } catch {
      // 网络错误已由 request 抛出统一文案
    } finally {
      setLoading(false);
    }
  }, [userId]);

  useEffect(() => {
    fetchDevices();
  }, [fetchDevices, isLoggedIn]);

  const onlineCount = allDevices.filter((d) => d.online).length;
  const offlineCount = allDevices.length - onlineCount;

  const kw = keyword.trim().toLowerCase();
  const devices = allDevices
    .filter((d) => (filter === 'all' ? true : filter === 'online' ? d.online : !d.online))
    .filter((d) =>
      !kw
        ? true
        : [d.sn, d.bindCode, d.businessId, d.name]
            .filter(Boolean)
            .some((v) => String(v).toLowerCase().includes(kw))
    );

  // 绑定流程：输入绑定码 → 查询设备 → 确认 → 绑定
  const startBind = async (rawCode: string) => {
    const code = rawCode.trim().toUpperCase();
    if (!code) {
      Alert.alert('提示', '请输入设备绑定码');
      return;
    }
    setShowBind(false);
    try {
      const res = await request<any>({ url: '/api/device/query-by-code', data: { code } });
      if (res.code !== 200 || !res.data) {
        Alert.alert('提示', res.msg || '设备不存在');
        return;
      }
      const device = res.data;
      if (device.bound) {
        Alert.alert('设备已绑定', `该设备(${code})已被其他用户绑定，无法重复绑定。`);
        return;
      }
      Alert.alert(
        '确认绑定设备',
        `设备码: ${code}\n设备名称: ${device.name}\n状态: ${device.status === 1 ? '在线' : '离线'}\n\n确定要绑定此设备吗？`,
        [
          { text: '取消', style: 'cancel' },
          { text: '绑定', onPress: () => doBind(code) },
        ]
      );
    } catch (err) {
      Alert.alert('提示', err instanceof Error ? err.message : '查询失败');
    }
  };

  const doBind = async (code: string) => {
    try {
      const res = await request({ url: '/api/device/bind', method: 'POST', data: { code, userId } });
      if (res.code === 200) {
        Alert.alert('绑定成功');
        setTimeout(fetchDevices, 800);
      } else {
        Alert.alert('绑定失败', res.msg || '请稍后重试');
      }
    } catch (err) {
      Alert.alert('绑定失败', err instanceof Error ? err.message : '网络错误');
    }
  };

  const saveDeviceName = async (name: string) => {
    const target = editTarget;
    setEditTarget(null);
    if (!target || !name.trim()) return;
    try {
      const res = await request({
        url: '/api/device/update',
        method: 'POST',
        data: { id: target.id, name: name.trim() },
      });
      if (res.code === 200) {
        Alert.alert('更新成功');
        fetchDevices();
      } else {
        Alert.alert('更新失败', res.msg || '请稍后重试');
      }
    } catch (err) {
      Alert.alert('更新失败', err instanceof Error ? err.message : '网络错误');
    }
  };

  const unbindDevice = (device: DeviceItem) => {
    Alert.alert('确认解绑', '解绑后设备将从您的账户移除，确定要解绑吗？', [
      { text: '取消', style: 'cancel' },
      {
        text: '解绑',
        style: 'destructive',
        onPress: async () => {
          try {
            const res = await request({ url: '/api/device/unbind', method: 'POST', data: { id: device.id } });
            if (res.code === 200) {
              Alert.alert('解绑成功');
              fetchDevices();
            } else {
              Alert.alert('解绑失败', res.msg || '请稍后重试');
            }
          } catch (err) {
            Alert.alert('解绑失败', err instanceof Error ? err.message : '网络错误');
          }
        },
      },
    ]);
  };

  return (
    <View style={styles.page}>
      <View style={styles.header}>
        <TextInput
          value={keyword}
          onChangeText={setKeyword}
          placeholder="搜索设备号 / 绑定码 / 备注"
          placeholderTextColor={colors.muted}
          style={styles.search}
        />
        <Pressable style={styles.addButton} onPress={() => setShowBind(true)}>
          <Text style={styles.addButtonText}>＋ 添加</Text>
        </Pressable>
      </View>

      <SegmentTabs
        options={[
          { label: `全部 ${allDevices.length}`, value: 'all' as const },
          { label: `在线 ${onlineCount}`, value: 'online' as const },
          { label: `离线 ${offlineCount}`, value: 'offline' as const },
        ]}
        value={filter}
        onChange={setFilter}
      />

      <FlatList
        data={devices}
        keyExtractor={(item) => String(item.id)}
        refreshControl={<RefreshControl refreshing={loading} onRefresh={fetchDevices} />}
        ListEmptyComponent={<Empty text={allDevices.length ? '没有匹配设备' : '暂无设备，点击右上角添加'} />}
        contentContainerStyle={{ paddingBottom: 24 }}
        renderItem={({ item }) => (
          <Card onPress={() => nav.navigate('device-detail', { id: item.id })}>
            <View style={styles.cardHead}>
              <Text style={styles.deviceName}>{item.name || item.sn}</Text>
              <Badge text={item.statusText} color={item.online ? colors.online : colors.muted} />
            </View>
            <Pressable onPress={() => copyText(item.sn)}>
              <Text style={styles.deviceMeta}>设备号：{item.sn}（点击复制）</Text>
            </Pressable>
            <Text style={styles.deviceMeta}>绑定日期：{item.bindDate}</Text>
            <Text style={styles.deviceMeta}>
              今日收益：<Text style={styles.earning}>¥{item.earnings}</Text>
            </Text>
            <View style={styles.actions}>
              <Button
                title="详情"
                type="secondary"
                style={styles.actionButton}
                onPress={() => nav.navigate('device-detail', { id: item.id })}
              />
              <Button
                title="编辑备注"
                type="secondary"
                style={styles.actionButton}
                onPress={() => setEditTarget(item)}
              />
              <Button title="解绑" type="danger" style={styles.actionButton} onPress={() => unbindDevice(item)} />
            </View>
          </Card>
        )}
      />

      <InputDialog
        visible={showBind}
        title="添加设备"
        placeholder="请输入设备绑定码（如 JXHG762Y）"
        onCancel={() => setShowBind(false)}
        onConfirm={startBind}
      />
      <InputDialog
        visible={!!editTarget}
        title="编辑备注"
        placeholder="请输入设备备注"
        defaultValue={editTarget?.name || ''}
        onCancel={() => setEditTarget(null)}
        onConfirm={saveDeviceName}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  page: { flex: 1, backgroundColor: colors.bg, padding: 16 },
  header: { flexDirection: 'row', gap: 10, marginBottom: 12 },
  search: {
    flex: 1,
    backgroundColor: colors.card,
    borderRadius: radius.md,
    borderWidth: 1,
    borderColor: colors.border,
    paddingHorizontal: 12,
    paddingVertical: 9,
    color: colors.text,
  },
  addButton: {
    backgroundColor: colors.primary,
    borderRadius: radius.md,
    paddingHorizontal: 14,
    justifyContent: 'center',
  },
  addButtonText: { color: '#ffffff', fontWeight: '700' },
  cardHead: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' },
  deviceName: { fontSize: 16, fontWeight: '700', color: colors.text, flex: 1, marginRight: 8 },
  deviceMeta: { color: colors.textSecondary, marginTop: 6, fontSize: 13 },
  earning: { color: colors.orange, fontWeight: '700' },
  actions: { flexDirection: 'row', gap: 8, marginTop: 12 },
  actionButton: { flex: 1, paddingVertical: 8 },
});
