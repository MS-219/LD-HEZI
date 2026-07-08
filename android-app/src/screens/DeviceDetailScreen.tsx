/**
 * 设备详情（对应 pages/device-detail）：基本信息、近 7 日收益趋势图、解绑。
 * 趋势图用纯 View 柱状图实现（小程序为 canvas 折线图），无额外依赖，鸿蒙可用。
 */
import React, { useCallback, useEffect, useState } from 'react';
import { Alert, RefreshControl, ScrollView, StyleSheet, Text, View } from 'react-native';
import { request } from '../api';
import { Badge, Button, Card, InfoRow, NavBar } from '../components/common';
import { copyText } from '../native/clipboard';
import { useNavigation, useRouteParams } from '../navigation';
import { colors } from '../theme';
import { formatTime } from '../utils/format';

interface ChartData {
  dates: string[];
  earnings: number[];
}

export default function DeviceDetailScreen() {
  const nav = useNavigation();
  const { id } = useRouteParams<{ id: number }>();
  const [device, setDevice] = useState<any>({});
  const [chart, setChart] = useState<ChartData>({ dates: [], earnings: [] });
  const [loading, setLoading] = useState(false);

  const load = useCallback(async () => {
    if (!id) return;
    setLoading(true);
    try {
      const [detailRes, chartRes] = await Promise.all([
        request<any>({ url: `/api/device/detail/${id}` }),
        request<ChartData>({ url: `/api/device/chart-data/${id}` }),
      ]);
      if (detailRes.code === 200 && detailRes.data) {
        setDevice(detailRes.data);
      } else {
        Alert.alert('提示', detailRes.msg || '获取详情失败');
      }
      if (chartRes.code === 200 && chartRes.data) {
        setChart({ dates: chartRes.data.dates || [], earnings: chartRes.data.earnings || [] });
      }
    } catch (err) {
      Alert.alert('提示', err instanceof Error ? err.message : '网络错误');
    } finally {
      setLoading(false);
    }
  }, [id]);

  useEffect(() => {
    load();
  }, [load]);

  const unbind = () => {
    Alert.alert('确认解绑', '解绑后设备将从您的账户移除，确定要解绑吗？', [
      { text: '取消', style: 'cancel' },
      {
        text: '解绑',
        style: 'destructive',
        onPress: async () => {
          try {
            const res = await request({ url: '/api/device/unbind', method: 'POST', data: { id } });
            if (res.code === 200) {
              Alert.alert('解绑成功');
              nav.back();
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

  const maxEarning = Math.max(...chart.earnings, 0.01);

  return (
    <View style={styles.page}>
      <NavBar title="设备详情" />
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
          <InfoRow label="绑定码" value={device.bindCode} />
          <InfoRow label="绑定时间" value={formatTime(device.bindTime)} />
          <InfoRow label="最后心跳" value={formatTime(device.lastHeartbeat)} />
          <InfoRow label="今日收益" value={`${device.todayEarnings ?? device.earnings ?? '0.00'} U`} valueColor={colors.orange} />
          <InfoRow label="累计收益" value={`${device.totalEarnings ?? '0.00'} U`} valueColor={colors.green} />
          {!!device.sn && (
            <Button title="复制设备号" type="secondary" style={{ marginTop: 10 }} onPress={() => copyText(device.sn)} />
          )}
        </Card>

        <Card>
          <Text style={styles.sectionTitle}>近 7 日收益趋势</Text>
          {chart.dates.length === 0 ? (
            <Text style={styles.chartEmpty}>暂无收益数据</Text>
          ) : (
            <View style={styles.chart}>
              {chart.dates.map((date, i) => {
                const value = chart.earnings[i] || 0;
                const height = Math.max((value / maxEarning) * 120, 2);
                const isLast = i === chart.dates.length - 1;
                return (
                  <View key={date} style={styles.chartCol}>
                    <Text style={[styles.chartValue, isLast && { color: colors.orange }]}>
                      {value > 0 ? value.toFixed(2) : ''}
                    </Text>
                    <View
                      style={[
                        styles.chartBar,
                        { height },
                        isLast && { backgroundColor: colors.orange },
                      ]}
                    />
                    <Text style={styles.chartDate}>{date.split('-')[2] || date}</Text>
                  </View>
                );
              })}
            </View>
          )}
        </Card>

        <Button title="解绑设备" type="danger" onPress={unbind} />
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  page: { flex: 1, backgroundColor: colors.bg },
  content: { padding: 16, paddingBottom: 32 },
  head: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 8 },
  name: { fontSize: 17, fontWeight: '800', color: colors.text, flex: 1, marginRight: 8 },
  sectionTitle: { fontSize: 15, fontWeight: '700', color: colors.text, marginBottom: 14 },
  chart: { flexDirection: 'row', alignItems: 'flex-end', height: 170 },
  chartCol: { flex: 1, alignItems: 'center', justifyContent: 'flex-end' },
  chartValue: { fontSize: 10, color: colors.textSecondary, marginBottom: 4 },
  chartBar: { width: 16, borderRadius: 4, backgroundColor: colors.blue },
  chartDate: { fontSize: 11, color: colors.muted, marginTop: 6 },
  chartEmpty: { color: colors.muted, textAlign: 'center', paddingVertical: 24 },
});
