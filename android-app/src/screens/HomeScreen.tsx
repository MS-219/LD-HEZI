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
import { Card, Empty, SectionHeader } from '../components/common';
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
      refreshControl={<RefreshControl refreshing={refreshing} onRefresh={loadAll} colors={[colors.primary]} tintColor={colors.primary} />}
      showsVerticalScrollIndicator={false}
    >
      <View style={styles.pageHead}>
        <View>
          <Text style={styles.pageEyebrow}>GLOBAL CLOUD COMPUTING</Text>
          <Text style={styles.pageTitle}>全球云智算</Text>
          <Text style={styles.pageSubtitle}>让每一台设备持续创造价值</Text>
        </View>
        <View style={styles.runningBadge}><View style={styles.runningDot} /><Text style={styles.runningText}>服务运行中</Text></View>
      </View>

      <View style={styles.bannerWrap}>
        <ScrollView ref={bannerScrollRef} horizontal pagingEnabled showsHorizontalScrollIndicator={false} onMomentumScrollEnd={(e) => setBannerIndex(Math.round(e.nativeEvent.contentOffset.x / (screenWidth - 32)))}>
          {banners.map((banner) => (
            <View key={banner.id} style={[styles.banner, { width: screenWidth - 32 }]}>
              {banner.imageUrl ? <Image source={{ uri: formatUrl(banner.imageUrl) }} style={styles.bannerImage} /> : (
                <View style={styles.bannerFallback}>
                  <View style={styles.bannerOrbLarge} /><View style={styles.bannerOrbSmall} />
                  <View style={styles.bannerTag}><Text style={styles.bannerTagText}>云端算力服务</Text></View>
                  <Text style={styles.bannerTitle}>{banner.title || '全球云智算'}</Text>
                  {!!banner.subtitle && <Text style={styles.bannerSubtitle}>{banner.subtitle}</Text>}
                  <View style={styles.bannerFoot}><View style={styles.bannerFootLine} /><Text style={styles.bannerFootText}>稳定 · 透明 · 高效</Text></View>
                </View>
              )}
            </View>
          ))}
        </ScrollView>
        {banners.length > 1 && <View style={styles.dots}>{banners.map((b, i) => <View key={b.id} style={[styles.dot, i === bannerIndex && styles.dotOn]} />)}</View>}
      </View>

      <SectionHeader title="收益概览" subtitle="数据每日自动结算" />
      <View style={styles.statRow}>
        <Card style={styles.statCard}><View style={[styles.statAccent, styles.statAccentBlue]} /><Text style={styles.statLabel}>昨日收益</Text><View style={styles.amountRow}><Text style={styles.statValue}>{earnings.yesterday}</Text><Text style={styles.statUnit}> U</Text></View></Card>
        <Card style={styles.statCard}><View style={[styles.statAccent, styles.statAccentGreen]} /><Text style={styles.statLabel}>累计收益</Text><View style={styles.amountRow}><Text style={styles.statValue}>{earnings.total}</Text><Text style={styles.statUnit}> U</Text></View></Card>
      </View>

      <SectionHeader title="我的节点" subtitle="设备实时运行状态" />
      <Card style={styles.nodeCard}>
        <View style={styles.nodeRow}>
          <Pressable style={styles.nodeItem} onPress={() => nav.switchTab('device')}><Text style={styles.nodeValue}>{nodeStats.total}</Text><Text style={styles.nodeLabel}>全部设备</Text></Pressable><View style={styles.nodeDivider} />
          <Pressable style={styles.nodeItem} onPress={() => nav.switchTab('device')}><Text style={[styles.nodeValue, { color: colors.online }]}>{nodeStats.online}</Text><Text style={styles.nodeLabel}>在线</Text></Pressable><View style={styles.nodeDivider} />
          <Pressable style={styles.nodeItem} onPress={() => nav.switchTab('device')}><Text style={[styles.nodeValue, { color: colors.offline }]}>{nodeStats.offline}</Text><Text style={styles.nodeLabel}>离线</Text></Pressable><View style={styles.nodeDivider} />
          <Pressable style={styles.nodeItem} onPress={() => nav.navigate('partner-devices')}><Text style={[styles.nodeValue, { color: colors.primary }]}>{nodeStats.partnerDevices}</Text><Text style={styles.nodeLabel}>伙伴设备</Text></Pressable>
        </View>
      </Card>

      <SectionHeader title="平台公告" subtitle="及时了解平台动态" />
      {notices.map((notice) => (
        <Card key={notice.id} onPress={() => nav.navigate('notice-detail', { id: notice.id })} style={styles.noticeCard}>
          <View style={styles.noticeIcon}><Text style={styles.noticeIconText}>告</Text></View>
          <View style={styles.noticeBody}><Text style={styles.noticeTitle} numberOfLines={1}>{notice.title}</Text>{!!notice.content && <Text style={styles.noticeContent} numberOfLines={2}>{notice.content}</Text>}{!!notice.time && <Text style={styles.noticeTime}>{formatTime(notice.time, 16)}</Text>}</View>
          <Text style={styles.noticeArrow}>›</Text>
        </Card>
      ))}
      {notices.length === 0 && <Empty text="暂无公告" />}
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  page: { flex: 1, backgroundColor: 'transparent' }, content: { padding: 16, paddingBottom: 34 },
  pageHead: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', paddingTop: 8, marginBottom: 18 }, pageEyebrow: { color: colors.primary, fontSize: 8, fontWeight: '900', letterSpacing: 1.6 }, pageTitle: { color: colors.navy, fontSize: 25, fontWeight: '900', marginTop: 3, letterSpacing: 1 }, pageSubtitle: { color: colors.textSecondary, fontSize: 12, marginTop: 5 },
  runningBadge: { flexDirection: 'row', alignItems: 'center', gap: 6, paddingHorizontal: 10, paddingVertical: 7, borderRadius: radius.pill, backgroundColor: 'rgba(255,255,255,0.8)', borderWidth: 1, borderColor: colors.border }, runningDot: { width: 7, height: 7, borderRadius: 4, backgroundColor: colors.green }, runningText: { color: colors.green, fontSize: 10, fontWeight: '800' },
  bannerWrap: { marginBottom: 9 }, banner: { height: 164, borderRadius: radius.xl, overflow: 'hidden' }, bannerImage: { width: '100%', height: '100%', borderRadius: radius.xl },
  bannerFallback: { flex: 1, backgroundColor: 'rgba(255,255,255,0.93)', borderRadius: radius.xl, padding: 21, justifyContent: 'center', borderWidth: 1, borderColor: '#CFE3F3', overflow: 'hidden' }, bannerOrbLarge: { position: 'absolute', width: 170, height: 170, borderRadius: 85, right: -54, top: -60, backgroundColor: '#D8ECFA' }, bannerOrbSmall: { position: 'absolute', width: 74, height: 74, borderRadius: 37, right: 52, bottom: -34, backgroundColor: '#EAF6FD' },
  bannerTag: { alignSelf: 'flex-start', backgroundColor: colors.primarySoft, paddingHorizontal: 9, paddingVertical: 5, borderRadius: radius.pill, marginBottom: 9 }, bannerTagText: { color: colors.primary, fontSize: 10, fontWeight: '900' }, bannerTitle: { color: colors.navy, fontSize: 25, fontWeight: '900', letterSpacing: 1.2 }, bannerSubtitle: { color: colors.textSecondary, marginTop: 7, fontSize: 13 }, bannerFoot: { flexDirection: 'row', alignItems: 'center', gap: 8, marginTop: 13 }, bannerFootLine: { width: 22, height: 2, borderRadius: 1, backgroundColor: colors.primary }, bannerFootText: { color: colors.muted, fontSize: 10, fontWeight: '700' },
  dots: { flexDirection: 'row', justifyContent: 'center', gap: 6, marginTop: 9 }, dot: { width: 6, height: 6, borderRadius: 3, backgroundColor: '#BFD3E3' }, dotOn: { backgroundColor: colors.primary, width: 18 },
  statRow: { flexDirection: 'row', gap: 10 }, statCard: { flex: 1, minHeight: 102, padding: 16, overflow: 'hidden' }, statAccent: { position: 'absolute', width: 4, height: 34, left: 0, top: 18, borderTopRightRadius: 3, borderBottomRightRadius: 3 }, statAccentBlue: { backgroundColor: colors.primary }, statAccentGreen: { backgroundColor: colors.green }, statLabel: { color: colors.textSecondary, fontSize: 12, fontWeight: '700' }, amountRow: { flexDirection: 'row', alignItems: 'baseline', marginTop: 10 }, statValue: { fontSize: 23, fontWeight: '900', color: colors.text, letterSpacing: -0.4 }, statUnit: { fontSize: 12, fontWeight: '800', color: colors.primary },
  nodeCard: { paddingVertical: 19 }, nodeRow: { flexDirection: 'row', alignItems: 'center' }, nodeItem: { flex: 1, minHeight: 50, alignItems: 'center', justifyContent: 'center' }, nodeDivider: { width: StyleSheet.hairlineWidth, height: 32, backgroundColor: colors.border }, nodeValue: { fontSize: 20, fontWeight: '900', color: colors.text }, nodeLabel: { color: colors.textSecondary, marginTop: 5, fontSize: 11 },
  noticeCard: { flexDirection: 'row', alignItems: 'center', paddingVertical: 15 }, noticeIcon: { width: 38, height: 38, borderRadius: 12, backgroundColor: colors.primarySoft, alignItems: 'center', justifyContent: 'center', marginRight: 12 }, noticeIconText: { color: colors.primary, fontSize: 13, fontWeight: '900' }, noticeBody: { flex: 1 }, noticeTitle: { fontSize: 14, fontWeight: '800', color: colors.text }, noticeContent: { color: colors.textSecondary, marginTop: 5, lineHeight: 18, fontSize: 12 }, noticeTime: { color: colors.muted, marginTop: 6, fontSize: 10 }, noticeArrow: { color: colors.muted, fontSize: 24, marginLeft: 8 },
});
