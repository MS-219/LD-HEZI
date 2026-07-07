/**
 * 全部伙伴设备（对应 pages/all-partner-devices）：团队所有设备汇总列表，含归属人，支持状态筛选。
 */
import React, { useCallback, useEffect, useState } from 'react';
import { FlatList, RefreshControl, StyleSheet, Text, View } from 'react-native';
import { request } from '../api';
import { Badge, Card, Empty, NavBar, SegmentTabs } from '../components/common';
import { useNavigation, useRouteParams } from '../navigation';
import { useSession } from '../session';
import { colors } from '../theme';
import { formatTime } from '../utils/format';

export default function AllPartnerDevicesScreen() {
  const nav = useNavigation();
  const { userId } = useSession();
  const { status } = useRouteParams<{ status?: string }>();
  const [filter, setFilter] = useState<string>(status || 'all');
  const [devices, setDevices] = useState<any[]>([]);
  const [counts, setCounts] = useState({ total: 0, online: 0, offline: 0 });
  const [loading, setLoading] = useState(false);

  const load = useCallback(async () => {
    if (!userId) return;
    setLoading(true);
    try {
      const res = await request<any>({
        url: '/api/invite/all-partner-devices',
        data: { userId, status: filter },
      });
      if (res.code === 200 && res.data) {
        const data = res.data;
        setDevices(
          (data.devices || []).map((d: any) => ({
            ...d,
            lastHeartbeat: formatTime(d.lastHeartbeat, 16) || '-',
          }))
        );
        setCounts({
          total: data.totalCount || 0,
          online: data.onlineCount || 0,
          offline: data.offlineCount || 0,
        });
      }
    } catch {
      // ignore
    } finally {
      setLoading(false);
    }
  }, [userId, filter]);

  useEffect(() => {
    load();
  }, [load]);

  const title = filter === 'online' ? '在线设备' : filter === 'offline' ? '离线设备' : '全部设备';

  return (
    <View style={styles.page}>
      <NavBar title={title} />
      <View style={styles.body}>
        <SegmentTabs
          options={[
            { label: `全部 ${counts.total}`, value: 'all' },
            { label: `在线 ${counts.online}`, value: 'online' },
            { label: `离线 ${counts.offline}`, value: 'offline' },
          ]}
          value={filter}
          onChange={setFilter}
        />
        <FlatList
          data={devices}
          keyExtractor={(item) => String(item.id)}
          refreshControl={<RefreshControl refreshing={loading} onRefresh={load} />}
          ListEmptyComponent={<Empty text="暂无设备" />}
          contentContainerStyle={{ paddingBottom: 24 }}
          renderItem={({ item }) => (
            <Card onPress={() => nav.navigate('partner-device-detail', { deviceId: item.id })}>
              <View style={styles.row}>
                <Text style={styles.name}>{item.name || item.sn}</Text>
                <Badge
                  text={item.status === 1 ? '在线' : '离线'}
                  color={item.status === 1 ? colors.online : colors.muted}
                />
              </View>
              <Text style={styles.meta}>归属：{item.ownerNickname || `用户${item.ownerId || ''}`}</Text>
              <Text style={styles.meta}>设备号：{item.sn}</Text>
              <Text style={styles.meta}>最后心跳：{item.lastHeartbeat}</Text>
            </Card>
          )}
        />
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  page: { flex: 1, backgroundColor: colors.bg },
  body: { flex: 1, padding: 16 },
  row: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' },
  name: { fontSize: 15, fontWeight: '700', color: colors.text, flex: 1, marginRight: 8 },
  meta: { color: colors.textSecondary, fontSize: 13, marginTop: 6 },
});
