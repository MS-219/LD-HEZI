/**
 * 我的（对应 pages/my）：用户信息、钱包卡片（余额/累计收益/算力值）、
 * 提现入口、功能菜单（收益明细/收款信息/邀请/兑换/帮助/反馈）、
 * 修改昵称、上传头像、退出登录。
 */
import React, { useCallback, useEffect, useState } from 'react';
import {
  Alert,
  Image,
  Pressable,
  RefreshControl,
  ScrollView,
  StyleSheet,
  Text,
  View,
} from 'react-native';
import { formatUrl, request, uploadImage } from '../api';
import { Button, Card, InputDialog } from '../components/common';
import { imagePickerAvailable, pickImages } from '../native/imagePicker';
import { useNavigation } from '../navigation';
import { useSession } from '../session';
import { colors, radius } from '../theme';
import { displayUserId } from '../utils/format';

interface MenuItem {
  id: string;
  icon: string;
  text: string;
}

// 与小程序 my 页 menuList 一致，去掉 AI 相关的“我的创作”
const menuGroups: MenuItem[][] = [
  [
    { id: 'earnings', icon: '📊', text: '收益明细' },
    { id: 'devices', icon: '📱', text: '我的设备' },
    { id: 'payment', icon: '💳', text: '收款信息设置' },
    { id: 'invite', icon: '🎁', text: '邀请好友' },
    { id: 'exchange', icon: '📦', text: '兑换设备' },
    { id: 'exchange-orders', icon: '📋', text: '兑换订单' },
    { id: 'address', icon: '📍', text: '收货地址' },
  ],
  [
    { id: 'help', icon: '❓', text: '帮助中心' },
    { id: 'feedback', icon: '💬', text: '意见反馈' },
  ],
];

export default function MyScreen() {
  const nav = useNavigation();
  const { isLoggedIn, userId, userInfo, login, logout, refreshUser, patchUser } = useSession();
  const [hashrateRate, setHashrateRate] = useState(100);
  const [wallet, setWallet] = useState({ balance: '0.00', totalEarnings: '0.00', displayHashrate: 0 });
  const [deviceStats, setDeviceStats] = useState({ total: 0, online: 0, offline: 0 });
  const [refreshing, setRefreshing] = useState(false);
  const [editNickname, setEditNickname] = useState(false);
  const [loggingIn, setLoggingIn] = useState(false);

  const fetchSettings = useCallback(async () => {
    try {
      const res = await request<string>({ url: '/api/settings/hashrate-rate' });
      if (res.code === 200) {
        const rate = parseInt(String(res.data), 10);
        if (!isNaN(rate)) setHashrateRate(rate);
      }
    } catch {
      // ignore
    }
  }, []);

  const fetchStats = useCallback(async () => {
    if (!userId) return;
    try {
      const res = await request<any>({ url: '/api/statistics/earnings', data: { userId } });
      if (res.code === 200 && res.data) {
        const data = res.data;
        setWallet({
          balance: data.currentBalance || '0.00',
          totalEarnings: data.totalEarnings || data.total || '0.00',
          displayHashrate: Math.round((parseFloat(data.currentBalance) || 0) * (hashrateRate || 100)),
        });
        setDeviceStats({
          total: data.deviceCount || 0,
          online: data.onlineCount || 0,
          offline: (data.deviceCount || 0) - (data.onlineCount || 0),
        });
      }
    } catch {
      // ignore
    }
  }, [userId, hashrateRate]);

  const loadAll = useCallback(async () => {
    setRefreshing(true);
    await Promise.all([fetchSettings(), fetchStats(), refreshUser().catch(() => undefined)]);
    setRefreshing(false);
  }, [fetchSettings, fetchStats, refreshUser]);

  useEffect(() => {
    if (isLoggedIn) loadAll();
  }, [isLoggedIn, loadAll]);

  const onLogin = async () => {
    setLoggingIn(true);
    try {
      await login();
    } catch (err) {
      Alert.alert('登录失败', err instanceof Error ? err.message : '请检查网络');
    } finally {
      setLoggingIn(false);
    }
  };

  const onLogout = () => {
    Alert.alert('确认退出', '确定要退出登录吗？', [
      { text: '取消', style: 'cancel' },
      { text: '退出', style: 'destructive', onPress: () => logout() },
    ]);
  };

  const updateProfile = async (data: { nickname?: string; avatarUrl?: string }) => {
    try {
      const res = await request({
        url: '/api/user/updateProfile',
        method: 'POST',
        data: { userId, ...data },
      });
      if (res.code === 200) {
        patchUser({
          ...(data.nickname ? { nickname: data.nickname } : {}),
          ...(data.avatarUrl ? { avatarUrl: formatUrl(data.avatarUrl) } : {}),
        });
        Alert.alert('修改成功');
      } else {
        Alert.alert('保存失败', res.msg || '请稍后重试');
      }
    } catch (err) {
      Alert.alert('保存失败', err instanceof Error ? err.message : '网络错误');
    }
  };

  const onChooseAvatar = async () => {
    if (!imagePickerAvailable) {
      Alert.alert('提示', '当前平台暂不支持选择图片');
      return;
    }
    const uris = await pickImages(1);
    if (!uris.length) return;
    try {
      const url = await uploadImage(uris[0]);
      await updateProfile({ avatarUrl: formatUrl(url) });
    } catch (err) {
      Alert.alert('上传失败', err instanceof Error ? err.message : '网络错误');
    }
  };

  const onMenuTap = (id: string) => {
    switch (id) {
      case 'devices':
        nav.switchTab('device');
        break;
      case 'earnings':
        nav.navigate('earnings-detail');
        break;
      case 'payment':
        nav.navigate('edit-payment');
        break;
      case 'invite':
        nav.navigate('invite');
        break;
      case 'exchange':
        nav.navigate('exchange');
        break;
      case 'exchange-orders':
        nav.navigate('exchange-orders');
        break;
      case 'address':
        nav.navigate('address-manage');
        break;
      case 'help':
        nav.navigate('help');
        break;
      case 'feedback':
        nav.navigate('feedback');
        break;
      default:
        Alert.alert('功能开发中');
    }
  };

  const onWithdraw = () => {
    if (parseFloat(wallet.balance) <= 0) {
      Alert.alert('提示', '暂无可提现余额');
      return;
    }
    nav.navigate('withdraw');
  };

  if (!isLoggedIn) {
    return (
      <View style={styles.loginPage}>
        <Text style={styles.loginTitle}>全球云智算</Text>
        <Text style={styles.loginTip}>登录后查看设备与收益</Text>
        <Button
          title={loggingIn ? '登录中...' : '一键登录'}
          onPress={onLogin}
          disabled={loggingIn}
          style={styles.loginButton}
        />
      </View>
    );
  }

  const needCompleteInfo = !userInfo.avatarUrl || !userInfo.nickname || userInfo.nickname === '微信用户';

  return (
    <ScrollView
      style={styles.page}
      contentContainerStyle={styles.content}
      refreshControl={<RefreshControl refreshing={refreshing} onRefresh={loadAll} />}
    >
      {/* 用户信息 */}
      <Card style={styles.userCard}>
        <Pressable onPress={onChooseAvatar}>
          {userInfo.avatarUrl ? (
            <Image source={{ uri: userInfo.avatarUrl }} style={styles.avatar} />
          ) : (
            <View style={[styles.avatar, styles.avatarFallback]}>
              <Text style={styles.avatarText}>{(userInfo.nickname || '用').slice(0, 1)}</Text>
            </View>
          )}
        </Pressable>
        <View style={styles.userMeta}>
          <Pressable onPress={() => setEditNickname(true)}>
            <Text style={styles.nickname}>
              {userInfo.nickname || '点击设置昵称'} <Text style={styles.editHint}>✎</Text>
            </Text>
          </Pressable>
          <Text style={styles.userId}>ID：{displayUserId(userId)}</Text>
          {!!userInfo.phone && <Text style={styles.userId}>手机：{userInfo.phone}</Text>}
        </View>
        <View style={styles.levelBadge}>
          <Text style={styles.levelText}>Lv.{userInfo.level || 0}</Text>
        </View>
      </Card>
      {needCompleteInfo && (
        <Pressable onPress={() => nav.navigate('complete-profile')}>
          <Text style={styles.completeTip}>资料不完整，点此完善头像和昵称 ›</Text>
        </Pressable>
      )}

      {/* 钱包卡片 */}
      <Card style={styles.walletCard}>
        <View style={styles.walletRow}>
          <View style={styles.walletItem}>
            <Text style={[styles.walletValue, styles.onDark]}>{wallet.balance} U</Text>
            <Text style={[styles.walletLabel, styles.onDarkMuted]}>可提现余额</Text>
          </View>
          <View style={styles.walletItem}>
            <Text style={[styles.walletValue, styles.onDark]}>{wallet.totalEarnings} U</Text>
            <Text style={[styles.walletLabel, styles.onDarkMuted]}>累计收益</Text>
          </View>
          <View style={styles.walletItem}>
            <Text style={[styles.walletValue, styles.onDark]}>{wallet.displayHashrate}</Text>
            <Text style={[styles.walletLabel, styles.onDarkMuted]}>算力值</Text>
          </View>
        </View>
        <View style={styles.walletActions}>
          <Button title="申请提现" type="success" style={styles.walletButton} onPress={onWithdraw} />
          <Button
            title="提现记录"
            type="secondary"
            style={styles.walletButton}
            onPress={() => nav.navigate('withdraw-record')}
          />
          <Button
            title="收益明细"
            type="secondary"
            style={styles.walletButton}
            onPress={() => nav.navigate('earnings-detail')}
          />
        </View>
      </Card>

      {/* 设备统计 */}
      <Card>
        <View style={styles.walletRow}>
          <Pressable style={styles.walletItem} onPress={() => nav.switchTab('device')}>
            <Text style={styles.walletValue}>{deviceStats.total}</Text>
            <Text style={styles.walletLabel}>我的设备</Text>
          </Pressable>
          <View style={styles.walletItem}>
            <Text style={[styles.walletValue, { color: colors.online }]}>{deviceStats.online}</Text>
            <Text style={styles.walletLabel}>在线</Text>
          </View>
          <View style={styles.walletItem}>
            <Text style={[styles.walletValue, { color: colors.muted }]}>{deviceStats.offline}</Text>
            <Text style={styles.walletLabel}>离线</Text>
          </View>
        </View>
      </Card>

      {/* 功能菜单 */}
      {menuGroups.map((group, gi) => (
        <Card key={gi} style={styles.menuCard}>
          {group.map((item, index) => (
            <Pressable
              key={item.id}
              onPress={() => onMenuTap(item.id)}
              style={[styles.menuRow, index < group.length - 1 && styles.menuRowBorder]}
            >
              <Text style={styles.menuIcon}>{item.icon}</Text>
              <Text style={styles.menuText}>{item.text}</Text>
              <Text style={styles.menuArrow}>›</Text>
            </Pressable>
          ))}
        </Card>
      ))}

      <Button title="退出登录" type="secondary" onPress={onLogout} style={{ marginTop: 4 }} />

      <InputDialog
        visible={editNickname}
        title="修改昵称"
        placeholder="请输入新昵称"
        defaultValue={userInfo.nickname}
        onCancel={() => setEditNickname(false)}
        onConfirm={(text) => {
          setEditNickname(false);
          if (text.trim() && text.trim() !== userInfo.nickname) {
            updateProfile({ nickname: text.trim() });
          }
        }}
      />
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  page: { flex: 1, backgroundColor: colors.bg },
  content: { padding: 16, paddingBottom: 32 },
  loginPage: { flex: 1, alignItems: 'center', justifyContent: 'center', backgroundColor: colors.bg, padding: 32 },
  loginTitle: { fontSize: 28, fontWeight: '800', color: colors.text },
  loginTip: { color: colors.textSecondary, marginTop: 10, marginBottom: 24 },
  loginButton: { alignSelf: 'stretch' },
  userCard: { flexDirection: 'row', alignItems: 'center', gap: 14 },
  avatar: { width: 60, height: 60, borderRadius: 30, backgroundColor: colors.border },
  avatarFallback: { alignItems: 'center', justifyContent: 'center', backgroundColor: colors.primary },
  avatarText: { color: '#ffffff', fontSize: 24, fontWeight: '700' },
  userMeta: { flex: 1 },
  nickname: { fontSize: 18, fontWeight: '800', color: colors.text },
  editHint: { fontSize: 13, color: colors.muted },
  userId: { color: colors.textSecondary, marginTop: 4, fontSize: 13 },
  levelBadge: {
    backgroundColor: '#e7f2fb',
    borderRadius: 999,
    paddingHorizontal: 12,
    paddingVertical: 5,
  },
  levelText: { color: colors.primary, fontWeight: '800', fontSize: 13 },
  completeTip: { color: colors.orange, fontSize: 13, marginBottom: 10, marginLeft: 4 },
  walletCard: { backgroundColor: '#0f2a5c', borderColor: '#0f2a5c' },
  onDark: { color: '#ffffff' },
  onDarkMuted: { color: '#9fd2f5' },
  walletRow: { flexDirection: 'row' },
  walletItem: { flex: 1, alignItems: 'center' },
  walletValue: { fontSize: 18, fontWeight: '800', color: colors.text },
  walletLabel: { marginTop: 4, fontSize: 12, color: colors.textSecondary },
  walletActions: { flexDirection: 'row', gap: 8, marginTop: 16 },
  walletButton: { flex: 1, paddingVertical: 9 },
  menuCard: { paddingVertical: 4 },
  menuRow: { flexDirection: 'row', alignItems: 'center', paddingVertical: 13 },
  menuRowBorder: { borderBottomWidth: StyleSheet.hairlineWidth, borderBottomColor: colors.border },
  menuIcon: { fontSize: 18, width: 32 },
  menuText: { flex: 1, fontSize: 15, color: colors.text },
  menuArrow: { fontSize: 20, color: colors.muted },
});
