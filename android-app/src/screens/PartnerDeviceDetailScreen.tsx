/**
 * 伙伴设备详情（对应 pages/partner-device-detail）：查看团队成员设备的状态与收益信息。
 */
import React, { useCallback, useEffect, useState } from 'react';
import { RefreshControl, ScrollView, StyleSheet, Text, View } from 'react-native';
import { request } from '../api';
import { Badge, Card, InfoRow, NavBar } from '../components/common';
import { useRouteParams } from '../navigation';
import { useSession } from '../session';
import { colors } from '../theme';
import { formatTime } from '../utils/format';

export default function PartnerDeviceDetailScreen() {
  const { userId } = useSession();
  const { deviceId } = useRouteParams<{ deviceId: number }>();
  const [device, setDevice] = useState<any>({});
  const [loading, setLoading] = useState(false);

  const load = useCallback(async () => {
    if (!deviceId) return;
    setLoading(true);
    try {
      const res = await request<any>({
        url: '/api/invite/partner-device-detail',
        data: { userId, deviceId },
      });
      if (res.code === 200 && res.data?.device) {
        setDevice(res.data.device);
      }
    } catch {
      // ignore
    } finally {
      setLoading(false);
    }
  }, [userId, deviceId]);

  useEffect(() => {
    load();
  }, [load]);

  return (
    <View style={styles.page}>
      <NavBar title="伙伴设备详情" />
      <ScrollView
        contentContainerStyle={styles.content}
        refreshControl={<RefreshControl refreshing={loading} onRefresh={load} />}
      >
        <Card>
          <View style={styles.head}>
            <Text style={styles.name}>{device.name || device.sn || '设备'}</Text>
            <Badge
              text={device.status === 1 ? '在线' : '离线'}
              color={device.status === 1 ? colors.online : colors.muted}
            />
          </View>
          <InfoRow label="设备号" value={device.sn} />
          <InfoRow label="归属人" value={device.ownerNickname} />
          <InfoRow label="绑定时间" value={formatTime(device.bindTime, 10)} />
          <InfoRow label="最后心跳" value={formatTime(device.lastHeartbeat)} />
          <InfoRow label="今日收益" value={`¥${device.todayEarnings ?? '0.00'}`} valueColor={colors.orange} />
          <InfoRow label="累计收益" value={`¥${device.totalEarnings ?? '0.00'}`} valueColor={colors.green} />
        </Card>
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  page: { flex: 1, backgroundColor: colors.bg },
  content: { padding: 16 },
  head: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 8 },
  name: { fontSize: 17, fontWeight: '800', color: colors.text, flex: 1, marginRight: 8 },
});
