/**
 * 伙伴设备（对应 pages/partner-devices）：团队成员列表及各自设备统计；
 * 点统计跳全部伙伴设备列表，点成员跳成员设备列表。
 */
import React, { useCallback, useEffect, useState } from 'react';
import { FlatList, Image, Pressable, RefreshControl, StyleSheet, Text, View } from 'react-native';
import { request } from '../api';
import { Card, Empty, NavBar } from '../components/common';
import { useNavigation } from '../navigation';
import { useSession } from '../session';
import { colors } from '../theme';
import { formatTime } from '../utils/format';

interface PartnerMember {
  id: number;
  nickname: string;
  avatarUrl: string;
  createTime: string;
  level: number;
  deviceCount: number;
  onlineCount: number;
  offlineCount: number;
}

export default function PartnerDevicesScreen() {
  const nav = useNavigation();
  const { userId } = useSession();
  const [members, setMembers] = useState<PartnerMember[]>([]);
  const [totals, setTotals] = useState({ members: 0, devices: 0, online: 0, offline: 0 });
  const [loading, setLoading] = useState(false);

  const load = useCallback(async () => {
    if (!userId) return;
    setLoading(true);
    try {
      const res = await request<any>({ url: '/api/invite/partner-devices', data: { userId } });
      if (res.code === 200 && res.data) {
        const data = res.data;
        setMembers(
          (data.members || []).map((m: any) => ({
            id: m.id,
            nickname: m.nickname || '用户' + m.id,
            avatarUrl: m.avatarUrl || '',
            createTime: formatTime(m.createTime, 10),
            level: m.level || 0,
            deviceCount: m.deviceCount || 0,
            onlineCount: m.onlineCount || 0,
            offlineCount: m.offlineCount || 0,
          }))
        );
        setTotals({
          members: data.totalMembers || 0,
          devices: data.totalDevices || 0,
          online: data.totalOnline || 0,
          offline: data.totalOffline || 0,
        });
      }
    } catch {
      // ignore
    } finally {
      setLoading(false);
    }
  }, [userId]);

  useEffect(() => {
    load();
  }, [load]);

  return (
    <View style={styles.page}>
      <NavBar title="伙伴设备" />
      <FlatList
        data={members}
        keyExtractor={(item) => String(item.id)}
        contentContainerStyle={styles.content}
        refreshControl={<RefreshControl refreshing={loading} onRefresh={load} />}
        ListHeaderComponent={
          <Card>
            <View style={styles.statRow}>
              <View style={styles.statItem}>
                <Text style={styles.statValue}>{totals.members}</Text>
                <Text style={styles.statLabel}>团队成员</Text>
              </View>
              <Pressable style={styles.statItem} onPress={() => nav.navigate('all-partner-devices', { status: 'all' })}>
                <Text style={styles.statValue}>{totals.devices}</Text>
                <Text style={styles.statLabel}>全部设备</Text>
              </Pressable>
              <Pressable style={styles.statItem} onPress={() => nav.navigate('all-partner-devices', { status: 'online' })}>
                <Text style={[styles.statValue, { color: colors.online }]}>{totals.online}</Text>
                <Text style={styles.statLabel}>在线</Text>
              </Pressable>
              <Pressable style={styles.statItem} onPress={() => nav.navigate('all-partner-devices', { status: 'offline' })}>
                <Text style={[styles.statValue, { color: colors.muted }]}>{totals.offline}</Text>
                <Text style={styles.statLabel}>离线</Text>
              </Pressable>
            </View>
          </Card>
        }
        ListEmptyComponent={<Empty text="暂无团队成员" />}
        renderItem={({ item }) => (
          <Card onPress={() => nav.navigate('member-devices', { memberId: item.id })}>
            <View style={styles.memberRow}>
              {item.avatarUrl ? (
                <Image source={{ uri: item.avatarUrl }} style={styles.avatar} />
              ) : (
                <View style={[styles.avatar, styles.avatarFallback]}>
                  <Text style={styles.avatarText}>{item.nickname.slice(0, 1)}</Text>
                </View>
              )}
              <View style={{ flex: 1 }}>
                <Text style={styles.memberName}>
                  {item.nickname} <Text style={styles.memberLevel}>Lv.{item.level}</Text>
                </Text>
                <Text style={styles.memberMeta}>加入：{item.createTime}</Text>
              </View>
              <View style={{ alignItems: 'flex-end' }}>
                <Text style={styles.deviceCount}>{item.deviceCount} 台</Text>
                <Text style={styles.deviceMeta}>
                  在线 {item.onlineCount} / 离线 {item.offlineCount}
                </Text>
              </View>
            </View>
          </Card>
        )}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  page: { flex: 1, backgroundColor: colors.bg },
  content: { padding: 16, paddingBottom: 32 },
  statRow: { flexDirection: 'row' },
  statItem: { flex: 1, alignItems: 'center' },
  statValue: { fontSize: 17, fontWeight: '800', color: colors.text },
  statLabel: { color: colors.textSecondary, fontSize: 12, marginTop: 4 },
  memberRow: { flexDirection: 'row', alignItems: 'center', gap: 12 },
  avatar: { width: 42, height: 42, borderRadius: 21, backgroundColor: colors.border },
  avatarFallback: { alignItems: 'center', justifyContent: 'center', backgroundColor: colors.blue },
  avatarText: { color: '#ffffff', fontWeight: '700' },
  memberName: { fontSize: 14, fontWeight: '700', color: colors.text },
  memberLevel: { fontSize: 12, color: colors.primary },
  memberMeta: { color: colors.muted, fontSize: 12, marginTop: 3 },
  deviceCount: { fontSize: 15, fontWeight: '800', color: colors.text },
  deviceMeta: { color: colors.muted, fontSize: 11, marginTop: 3 },
});
