/**
 * 收益明细（对应 pages/earnings-detail）：
 * 概览（累计/昨日/本月/在线设备）+ 筛选（明细/按日/按月）+ 明细子筛选（设备收益/分润收益）。
 */
import React, { useCallback, useEffect, useRef, useState } from 'react';
import { FlatList, RefreshControl, StyleSheet, Text, View } from 'react-native';
import { request } from '../api';
import { Card, Empty, NavBar, SegmentTabs } from '../components/common';
import { useSession } from '../session';
import { colors } from '../theme';
import { formatTime } from '../utils/format';

const PAGE_SIZE = 20;

type Filter = 'all' | 'day' | 'month';
type SubFilter = 'device' | 'reward';

export default function EarningsDetailScreen() {
  const { userId } = useSession();
  const [overview, setOverview] = useState({ total: '0.00', yesterday: '0.00', month: '0.00', deviceCount: 0 });
  const [filter, setFilter] = useState<Filter>('all');
  const [subFilter, setSubFilter] = useState<SubFilter>('device');
  const [records, setRecords] = useState<any[]>([]);
  const [rewards, setRewards] = useState<any[]>([]);
  const [monthlyData, setMonthlyData] = useState<any[]>([]);
  const [dailyData, setDailyData] = useState<any[]>([]);
  const [loading, setLoading] = useState(false);
  const pageRef = useRef(1);
  const hasMoreRef = useRef(true);

  const fetchOverview = useCallback(async () => {
    if (!userId) return;
    try {
      const res = await request<any>({ url: '/api/statistics/earnings', data: { userId } });
      if (res.code === 200 && res.data) {
        setOverview({
          total: res.data.total || '0.00',
          yesterday: res.data.yesterday || '0.00',
          month: res.data.month || '0.00',
          deviceCount: res.data.onlineCount || 0,
        });
      }
    } catch {
      // ignore
    }
  }, [userId]);

  const fetchRecords = useCallback(
    async (reset: boolean) => {
      if (!userId) return;
      if (reset) {
        pageRef.current = 1;
        hasMoreRef.current = true;
      }
      if (!hasMoreRef.current && !reset) return;
      setLoading(true);
      try {
        const res = await request<any>({
          url: '/api/earnings/user/list',
          data: { userId, page: pageRef.current, size: PAGE_SIZE },
        });
        if (res.code === 200 && res.data) {
          const formatted = (res.data.records || []).map((item: any) => ({
            ...item,
            createTimeFormatted: formatTime(item.createTime),
          }));
          setRecords((prev) => (pageRef.current === 1 ? formatted : [...prev, ...formatted]));
          hasMoreRef.current = !!res.data.hasMore;
          pageRef.current += 1;
        }
      } catch {
        // ignore
      } finally {
        setLoading(false);
      }
    },
    [userId]
  );

  const fetchRewards = useCallback(async () => {
    if (!userId) return;
    try {
      const res = await request<any>({ url: '/api/earnings/user/rewards', data: { userId, page: 1, size: 50 } });
      if (res.code === 200 && res.data) {
        setRewards(
          (res.data.records || []).map((item: any) => ({
            ...item,
            createTime: item.createTime ? item.createTime.split('T')[0] : '',
          }))
        );
      }
    } catch {
      // ignore
    }
  }, [userId]);

  const fetchMonthly = useCallback(async () => {
    if (!userId) return;
    setLoading(true);
    try {
      const res = await request<any[]>({ url: '/api/earnings/user/monthly', data: { userId } });
      if (res.code === 200) setMonthlyData(res.data || []);
    } catch {
      // ignore
    } finally {
      setLoading(false);
    }
  }, [userId]);

  const fetchDaily = useCallback(async () => {
    if (!userId) return;
    setLoading(true);
    try {
      const res = await request<any>({ url: '/api/earnings/user/daily', data: { userId, page: 1, size: 1000 } });
      if (res.code === 200 && res.data) setDailyData(res.data.records || []);
    } catch {
      // ignore
    } finally {
      setLoading(false);
    }
  }, [userId]);

  useEffect(() => {
    fetchOverview();
    fetchRecords(true);
    fetchRewards();
  }, [fetchOverview, fetchRecords, fetchRewards]);

  const onFilterChange = (next: Filter) => {
    setFilter(next);
    if (next === 'month') fetchMonthly();
    else if (next === 'day') fetchDaily();
    else fetchRecords(true);
  };

  const refresh = () => {
    fetchOverview();
    if (filter === 'month') fetchMonthly();
    else if (filter === 'day') fetchDaily();
    else {
      fetchRecords(true);
      fetchRewards();
    }
  };

  const listData =
    filter === 'month' ? monthlyData : filter === 'day' ? dailyData : subFilter === 'device' ? records : rewards;

  return (
    <View style={styles.page}>
      <NavBar title="收益明细" />
      <FlatList
        data={listData}
        keyExtractor={(item, index) => String(item.id ?? item.month ?? item.date ?? index)}
        contentContainerStyle={styles.content}
        refreshControl={<RefreshControl refreshing={loading} onRefresh={refresh} />}
        onEndReached={() => filter === 'all' && subFilter === 'device' && !loading && fetchRecords(false)}
        onEndReachedThreshold={0.3}
        ListHeaderComponent={
          <View>
            <Card style={styles.overviewCard}>
              <View style={styles.overviewMain}>
                <Text style={styles.overviewLabel}>累计收益（U）</Text>
                <Text style={styles.overviewTotal}>{overview.total} U</Text>
              </View>
              <View style={styles.overviewRow}>
                <View style={styles.overviewItem}>
                  <Text style={styles.overviewValue}>{overview.yesterday} U</Text>
                  <Text style={styles.overviewMeta}>昨日收益</Text>
                </View>
                <View style={styles.overviewItem}>
                  <Text style={styles.overviewValue}>{overview.month} U</Text>
                  <Text style={styles.overviewMeta}>本月收益</Text>
                </View>
                <View style={styles.overviewItem}>
                  <Text style={styles.overviewValue}>{overview.deviceCount}</Text>
                  <Text style={styles.overviewMeta}>在线设备</Text>
                </View>
              </View>
            </Card>

            <SegmentTabs
              options={[
                { label: '收益明细', value: 'all' as const },
                { label: '按日汇总', value: 'day' as const },
                { label: '按月汇总', value: 'month' as const },
              ]}
              value={filter}
              onChange={onFilterChange}
            />
            {filter === 'all' && (
              <SegmentTabs
                options={[
                  { label: '设备收益', value: 'device' as const },
                  { label: '分润收益', value: 'reward' as const },
                ]}
                value={subFilter}
                onChange={setSubFilter}
              />
            )}
          </View>
        }
        ListEmptyComponent={<Empty text="暂无收益记录" />}
        renderItem={({ item }) => {
          if (filter === 'month') {
            return (
              <Card>
                <View style={styles.recordRow}>
                  <Text style={styles.recordTitle}>{item.month || item.date}</Text>
                  <Text style={styles.recordAmount}>+{item.amount ?? item.total ?? '0.00'} U</Text>
                </View>
              </Card>
            );
          }
          if (filter === 'day') {
            return (
              <Card>
                <View style={styles.recordRow}>
                  <Text style={styles.recordTitle}>{item.date || item.day}</Text>
                  <Text style={styles.recordAmount}>+{item.amount ?? item.total ?? '0.00'} U</Text>
                </View>
              </Card>
            );
          }
          if (subFilter === 'reward') {
            return (
              <Card>
                <View style={styles.recordRow}>
                  <View style={{ flex: 1 }}>
                    <Text style={styles.recordTitle}>{item.remark || item.sourceNickname || '团队分润'}</Text>
                    <Text style={styles.recordMeta}>{item.createTime}</Text>
                  </View>
                  <Text style={[styles.recordAmount, { color: colors.blue }]}>+{item.amount ?? '0.00'} U</Text>
                </View>
              </Card>
            );
          }
          return (
            <Card>
              <View style={styles.recordRow}>
                <View style={{ flex: 1 }}>
                  <Text style={styles.recordTitle}>{item.deviceName || item.deviceSn || '设备收益'}</Text>
                  <Text style={styles.recordMeta}>{item.createTimeFormatted}</Text>
                </View>
                <Text style={styles.recordAmount}>+{item.amount ?? '0.00'} U</Text>
              </View>
            </Card>
          );
        }}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  page: { flex: 1, backgroundColor: colors.bg },
  content: { padding: 16, paddingBottom: 32 },
  overviewCard: { backgroundColor: colors.navy, borderColor: colors.navy },
  overviewMain: { alignItems: 'center', paddingVertical: 8 },
  overviewLabel: { color: '#c9e4fa', fontSize: 13 },
  overviewTotal: { color: '#ffffff', fontSize: 32, fontWeight: '800', marginTop: 6 },
  overviewRow: { flexDirection: 'row', marginTop: 12 },
  overviewItem: { flex: 1, alignItems: 'center' },
  overviewValue: { color: '#ffffff', fontSize: 15, fontWeight: '700' },
  overviewMeta: { color: '#9fd2f5', fontSize: 12, marginTop: 3 },
  recordRow: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', gap: 10 },
  recordTitle: { fontSize: 14, fontWeight: '600', color: colors.text },
  recordMeta: { color: colors.muted, fontSize: 12, marginTop: 4 },
  recordAmount: { fontSize: 16, fontWeight: '800', color: colors.green },
});
