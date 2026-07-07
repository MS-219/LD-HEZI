/**
 * 成员设备（对应 pages/member-devices）：某团队成员名下设备列表，支持在线/离线筛选。
 */
import React, { useCallback, useEffect, useState } from 'react';
import { FlatList, RefreshControl, StyleSheet, Text, View } from 'react-native';
import { request } from '../api';
import { Badge, Card, Empty, NavBar, SegmentTabs } from '../components/common';
import { useNavigation, useRouteParams } from '../navigation';
import { useSession } from '../session';
import { colors } from '../theme';
import { formatTime } from '../utils/format';

export default function MemberDevicesScreen() {
  const nav = useNavigation();
  const { userId } = useSession();
  const { memberId, status } = useRouteParams<{ memberId: number; status?: string }>();
  const [filter, setFilter] = useState<string>(status || 'all');
  const [member, setMember] = useState({ nickname: '', level: 0 });
  const [devices, setDevices] = useState<any[]>([]);
  const [counts, setCounts] = useState({ total: 0, online: 0, offline: 0 });
  const [loading, setLoading] = useState(false);

  const load = useCallback(async () => {
    if (!userId || !memberId) return;
    setLoading(true);
    try {
      const params: any = { userId, memberId };
      if (filter !== 'all') params.status = filter;
      const res = await request<any>({ url: '/api/invite/member-devices', data: params });
      if (res.code === 200 && res.data) {
        const data = res.data;
        setMember({ nickname: data.memberNickname || '', level: data.memberLevel || 0 });
        setDevices(
          (data.devices || []).map((d: any) => ({
            ...d,
            lastHeartbeat: formatTime(d.lastHeartbeat, 16) || '-',
            createTime: formatTime(d.createTime, 16) || '-',
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
  }, [userId, memberId, filter]);

  useEffect(() => {
    load();
  }, [load]);

  return (
    <View style={styles.page}>
      <NavBar title={member.nickname ? `${member.nickname} 的设备` : '成员设备'} />
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
