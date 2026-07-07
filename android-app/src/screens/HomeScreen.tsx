/**
 * 首页（对应 pages/index）：轮播 Banner、收益/节点统计、伙伴设备入口、公告列表。
 */
import React, { useCallback, useEffect, useRef, useState } from 'react';
import {
  Dimensions,
  Image,
  Pressable,
  RefreshControl,
  ScrollView,
  StyleSheet,
  Text,
  View,
} from 'react-native';
import { formatUrl, request } from '../api';
import { Card, Empty } from '../components/common';
import { useNavigation } from '../navigation';
import { useSession } from '../session';
import { colors, radius } from '../theme';
import { formatTime } from '../utils/format';

interface Banner {
  id: number;
  imageUrl?: string;
  title?: string;
  subtitle?: string;
}

interface Notice {
  id: number;
  title: string;
  content?: string;
  time?: string;
  imageUrl?: string;
}

const screenWidth = Dimensions.get('window').width;

export default function HomeScreen() {
  const nav = useNavigation();
  const { userId, isLoggedIn } = useSession();
  const [banners, setBanners] = useState<Banner[]>([]);
  const [notices, setNotices] = useState<Notice[]>([]);
  const [earnings, setEarnings] = useState({ yesterday: '0.00', total: '0.00' });
  const [nodeStats, setNodeStats] = useState({ total: 0, online: 0, offline: 0, partnerDevices: 0 });
  const [refreshing, setRefreshing] = useState(false);
  const [bannerIndex, setBannerIndex] = useState(0);
  const bannerScrollRef = useRef<ScrollView>(null);

  const fetchBanners = useCallback(async () => {
    try {
      const res = await request<{ banners: Banner[] }>({ url: '/api/settings/banners' });
      if (res.code === 200 && res.data?.banners?.length) {
        setBanners(res.data.banners.map((item, index) => ({ ...item, id: index + 1 })));
        return;
      }
    } catch {
      // 走默认 banner
    }
    setBanners((prev) =>
      prev.length
        ? prev
        : [{ id: 1, imageUrl: '', title: '全球云智算', subtitle: '管道收入 | 轻松躺赚 | 流量变现' }]
    );
  }, []);

  const fetchNotices = useCallback(async () => {
    try {
      const res = await request<any[]>({ url: '/api/notice/list', data: { limit: 5 } });
      if (res.code === 200) {
        setNotices(
          (res.data || []).map((item) => ({
            id: item.id,
            title: item.title,
            content: item.content,
            time: item.publishTime || item.createTime,
            imageUrl: item.imageUrl || '',
          }))
        );
      }
    } catch {
      // 忽略，保留旧数据
    }
  }, []);

  const fetchStatistics = useCallback(async () => {
    if (!userId) return;
    try {
      const res = await request<any>({ url: '/api/statistics/earnings', data: { userId } });
      if (res.code === 200 && res.data) {
        const data = res.data;
        setEarnings({ yesterday: data.yesterday || '0.00', total: data.total || '0.00' });
        setNodeStats((prev) => ({
          ...prev,
          total: data.deviceCount || 0,
          online: data.onlineCount || 0,
          offline: (data.deviceCount || 0) - (data.onlineCount || 0),
        }));
      }
    } catch {
      // ignore
    }
  }, [userId]);

  const fetchPartnerDevices = useCallback(async () => {
    if (!userId) return;
    try {
      const res = await request<any>({ url: '/api/invite/stats', data: { userId } });
      if (res.code === 200 && res.data) {
        setNodeStats((prev) => ({ ...prev, partnerDevices: res.data.teamDeviceCount || 0 }));
      }
    } catch {
      // ignore
    }
  }, [userId]);

  const loadAll = useCallback(async () => {
    setRefreshing(true);
    await Promise.all([fetchBanners(), fetchNotices(), fetchStatistics(), fetchPartnerDevices()]);
    setRefreshing(false);
  }, [fetchBanners, fetchNotices, fetchStatistics, fetchPartnerDevices]);

  useEffect(() => {
    loadAll();
  }, [loadAll, isLoggedIn]);

  // Banner 自动轮播
  useEffect(() => {
    if (banners.length <= 1) return;
    const timer = setInterval(() => {
      setBannerIndex((prev) => {
        const next = (prev + 1) % banners.length;
        bannerScrollRef.current?.scrollTo({ x: next * (screenWidth - 32), animated: true });
        return next;
      });
    }, 4000);
    return () => clearInterval(timer);
  }, [banners.length]);

  return (
    <ScrollView
      style={styles.page}
      contentContainerStyle={styles.content}
      refreshControl={<RefreshControl refreshing={refreshing} onRefresh={loadAll} />}
    >
      {/* Banner 轮播 */}
      <View style={styles.bannerWrap}>
        <ScrollView
          ref={bannerScrollRef}
          horizontal
          pagingEnabled
          showsHorizontalScrollIndicator={false}
          onMomentumScrollEnd={(e) =>
            setBannerIndex(Math.round(e.nativeEvent.contentOffset.x / (screenWidth - 32)))
          }
        >
          {banners.map((banner) => (
            <View key={banner.id} style={[styles.banner, { width: screenWidth - 32 }]}>
              {banner.imageUrl ? (
                <Image source={{ uri: formatUrl(banner.imageUrl) }} style={styles.bannerImage} />
              ) : (
                <View style={styles.bannerFallback}>
                  <Text style={styles.bannerTitle}>{banner.title || '全球云智算'}</Text>
                  {!!banner.subtitle && <Text style={styles.bannerSubtitle}>{banner.subtitle}</Text>}
                </View>
              )}
            </View>
          ))}
        </ScrollView>
        {banners.length > 1 && (
          <View style={styles.dots}>
            {banners.map((b, i) => (
              <View key={b.id} style={[styles.dot, i === bannerIndex && styles.dotOn]} />
            ))}
          </View>
        )}
      </View>

      {/* 收益统计 */}
      <View style={styles.statRow}>
        <Card style={styles.statCard}>
          <Text style={styles.statValue}>¥{earnings.yesterday}</Text>
          <Text style={styles.statLabel}>昨日收益</Text>
        </Card>
        <Card style={styles.statCard}>
          <Text style={styles.statValue}>¥{earnings.total}</Text>
          <Text style={styles.statLabel}>累计收益</Text>
        </Card>
      </View>

      {/* 节点统计 */}
      <Card>
        <Text style={styles.sectionTitle}>我的节点</Text>
        <View style={styles.nodeRow}>
          <Pressable style={styles.nodeItem} onPress={() => nav.switchTab('device')}>
            <Text style={styles.nodeValue}>{nodeStats.total}</Text>
            <Text style={styles.nodeLabel}>全部设备</Text>
          </Pressable>
          <Pressable style={styles.nodeItem} onPress={() => nav.switchTab('device')}>
            <Text style={[styles.nodeValue, { color: colors.online }]}>{nodeStats.online}</Text>
            <Text style={styles.nodeLabel}>在线</Text>
          </Pressable>
          <Pressable style={styles.nodeItem} onPress={() => nav.switchTab('device')}>
            <Text style={[styles.nodeValue, { color: colors.muted }]}>{nodeStats.offline}</Text>
            <Text style={styles.nodeLabel}>离线</Text>
          </Pressable>
          <Pressable style={styles.nodeItem} onPress={() => nav.navigate('partner-devices')}>
            <Text style={[styles.nodeValue, { color: colors.blue }]}>{nodeStats.partnerDevices}</Text>
            <Text style={styles.nodeLabel}>伙伴设备</Text>
          </Pressable>
        </View>
      </Card>

      {/* 公告 */}
      <Text style={styles.sectionHeader}>平台公告</Text>
      {notices.map((notice) => (
        <Card key={notice.id} onPress={() => nav.navigate('notice-detail', { id: notice.id })}>
          <Text style={styles.noticeTitle} numberOfLines={1}>
            {notice.title}
          </Text>
          {!!notice.content && (
            <Text style={styles.noticeContent} numberOfLines={2}>
              {notice.content}
            </Text>
          )}
          {!!notice.time && <Text style={styles.noticeTime}>{formatTime(notice.time, 16)}</Text>}
        </Card>
      ))}
      {notices.length === 0 && <Empty text="暂无公告" />}
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  page: { flex: 1, backgroundColor: colors.bg },
  content: { padding: 16, paddingBottom: 32 },
  bannerWrap: { marginBottom: 12 },
  banner: { height: 140, borderRadius: radius.lg, overflow: 'hidden' },
  bannerImage: { width: '100%', height: '100%', borderRadius: radius.lg },
  bannerFallback: {
    flex: 1,
    backgroundColor: colors.primary,
    borderRadius: radius.lg,
    padding: 20,
    justifyContent: 'center',
  },
  bannerTitle: { color: '#ffffff', fontSize: 24, fontWeight: '800' },
  bannerSubtitle: { color: '#e0e7ff', marginTop: 8, fontSize: 14 },
  dots: { flexDirection: 'row', justifyContent: 'center', gap: 6, marginTop: 8 },
  dot: { width: 6, height: 6, borderRadius: 3, backgroundColor: colors.border },
  dotOn: { backgroundColor: colors.primary, width: 16 },
  statRow: { flexDirection: 'row', gap: 10 },
  statCard: { flex: 1, alignItems: 'center', paddingVertical: 18 },
  statValue: { fontSize: 20, fontWeight: '800', color: colors.text },
  statLabel: { color: colors.textSecondary, marginTop: 4, fontSize: 13 },
  sectionTitle: { fontSize: 15, fontWeight: '700', color: colors.text, marginBottom: 12 },
  nodeRow: { flexDirection: 'row' },
  nodeItem: { flex: 1, alignItems: 'center' },
  nodeValue: { fontSize: 18, fontWeight: '800', color: colors.text },
  nodeLabel: { color: colors.textSecondary, marginTop: 4, fontSize: 12 },
  sectionHeader: { fontSize: 16, fontWeight: '800', color: colors.text, marginTop: 6, marginBottom: 10 },
  noticeTitle: { fontSize: 15, fontWeight: '700', color: colors.text },
  noticeContent: { color: colors.textSecondary, marginTop: 6, lineHeight: 19, fontSize: 13 },
  noticeTime: { color: colors.muted, marginTop: 8, fontSize: 12 },
});
