/**
 * 邀请好友（对应 pages/invite）：我的邀请码（复制/分享）、等级进度、
 * 邀请统计、我的邀请人、填写邀请码绑定、已邀请用户列表。
 */
import React, { useCallback, useEffect, useState } from 'react';
import {
  Alert,
  Image,
  RefreshControl,
  ScrollView,
  Share,
  StyleSheet,
  Text,
  View,
} from 'react-native';
import { request } from '../api';
import { Badge, Button, Card, Empty, InputDialog, NavBar } from '../components/common';
import { copyText } from '../native/clipboard';
import { useSession } from '../session';
import { colors } from '../theme';
import { displayUserId, formatTime } from '../utils/format';

interface InvitedUser {
  id: number;
  nickname: string;
  avatarUrl: string;
  registerTime: string;
  deviceCount: number;
  reward: string;
}

export default function InviteScreen() {
  const { userId } = useSession();
  const inviteCode = 'JX' + displayUserId(userId);
  const inviteUrl = `https://hz.shandongliandong.com/invite?code=${inviteCode}`;

  const [stats, setStats] = useState({ inviteCount: 0, totalReward: '0.00', totalDeviceCount: 0, onlineDeviceCount: 0 });
  const [invitedUsers, setInvitedUsers] = useState<InvitedUser[]>([]);
  const [levelName, setLevelName] = useState('普通用户');
  const [nextLevelDesc, setNextLevelDesc] = useState('');
  const [inviter, setInviter] = useState({ has: false, nickname: '', avatar: '' });
  const [showBind, setShowBind] = useState(false);
  const [loading, setLoading] = useState(false);

  const loadStats = useCallback(async () => {
    if (!userId) return;
    setLoading(true);
    try {
      const res = await request<any>({ url: '/api/invite/stats', data: { userId } });
      if (res.code === 200 && res.data) {
        const data = res.data;
        setStats({
          inviteCount: data.inviteCount || 0,
          totalReward: data.totalReward || '0.00',
          totalDeviceCount: data.totalDeviceCount || 0,
          onlineDeviceCount: data.teamOnlineDeviceCount || 0,
        });
        setInvitedUsers(
          (data.invitedUsers || []).map((u: any) => ({
            id: u.id,
            nickname: u.nickname || '用户' + String(u.id).slice(-4),
            avatarUrl: u.avatarUrl || '',
            registerTime: formatTime(u.registerTime || u.createTime, 10),
            deviceCount: u.deviceCount || 0,
            reward: u.reward || '0.00',
          }))
        );
        if (data.levelConfigs) {
          const level = data.level || 0;
          const totalDevices = data.totalDeviceCount || 0;
          const current = data.levelConfigs.find((lc: any) => lc.index === level);
          const next = data.levelConfigs.find((lc: any) => lc.index === level + 1);
          setLevelName(current ? current.name : '普通用户');
          if (next) {
            const diff = next.threshold - totalDevices;
            setNextLevelDesc(`距离升级 ${next.name} 还差 ${diff > 0 ? diff : 0} 台设备`);
          } else {
            setNextLevelDesc('您已达到最高等级');
          }
        }
      }
    } catch {
      // ignore
    } finally {
      setLoading(false);
    }
  }, [userId]);

  const loadInviter = useCallback(async () => {
    if (!userId) return;
    try {
      const res = await request<any>({ url: '/api/invite/inviter', data: { userId } });
      if (res.code === 200 && res.data) {
        setInviter({
          has: res.data.hasInviter || false,
          nickname: res.data.inviterNickname || '',
          avatar: res.data.inviterAvatar || '',
        });
      }
    } catch {
      // ignore
    }
  }, [userId]);

  useEffect(() => {
    loadStats();
    loadInviter();
  }, [loadStats, loadInviter]);

  const shareInvite = async () => {
    try {
      await Share.share({
        message: `全球云智算 - 邀请你一起赚收益！我的邀请码：${inviteCode}，注册链接：${inviteUrl}`,
      });
    } catch {
      // 平台不支持分享时降级为复制链接
      copyText(inviteUrl, '链接已复制');
    }
  };

  const bindInviteCode = async (code: string) => {
    setShowBind(false);
    const trimmed = code.trim().toUpperCase();
    if (!trimmed || trimmed.length < 3) {
      Alert.alert('提示', '请输入正确的邀请码');
      return;
    }
    try {
      const res = await request({
        url: '/api/invite/bind',
        method: 'POST',
        data: { userId, inviteCode: trimmed },
      });
      if (res.code === 200) {
        Alert.alert('绑定成功');
        loadInviter();
      } else {
        Alert.alert('绑定失败', res.msg || '请稍后重试');
      }
    } catch (err) {
      Alert.alert('绑定失败', err instanceof Error ? err.message : '网络错误');
    }
  };

  return (
    <View style={styles.page}>
      <NavBar title="邀请好友" />
      <ScrollView
        contentContainerStyle={styles.content}
        refreshControl={<RefreshControl refreshing={loading} onRefresh={loadStats} />}
      >
        {/* 邀请码卡片 */}
        <Card style={styles.codeCard}>
          <Text style={styles.codeLabel}>我的邀请码</Text>
          <Text style={styles.code}>{inviteCode}</Text>
          <Text style={styles.levelName}>
            {levelName}
            {nextLevelDesc ? ` · ${nextLevelDesc}` : ''}
          </Text>
          <View style={styles.codeActions}>
            <Button title="复制邀请码" type="secondary" style={styles.codeButton} onPress={() => copyText(inviteCode, '邀请码已复制')} />
            <Button title="分享给好友" style={styles.codeButton} onPress={shareInvite} />
          </View>
        </Card>

        {/* 邀请统计 */}
        <Card>
          <View style={styles.statRow}>
            <View style={styles.statItem}>
              <Text style={styles.statValue}>{stats.inviteCount}</Text>
              <Text style={styles.statLabel}>已邀请</Text>
            </View>
            <View style={styles.statItem}>
              <Text style={[styles.statValue, { color: colors.orange }]}>{stats.totalReward} U</Text>
              <Text style={styles.statLabel}>累计奖励</Text>
            </View>
            <View style={styles.statItem}>
              <Text style={styles.statValue}>{stats.totalDeviceCount}</Text>
              <Text style={styles.statLabel}>团队设备</Text>
            </View>
            <View style={styles.statItem}>
              <Text style={[styles.statValue, { color: colors.online }]}>{stats.onlineDeviceCount}</Text>
              <Text style={styles.statLabel}>团队在线</Text>
            </View>
          </View>
        </Card>

        {/* 我的邀请人 */}
        <Card>
          <Text style={styles.sectionTitle}>我的邀请人</Text>
          {inviter.has ? (
            <View style={styles.inviterRow}>
              {inviter.avatar ? (
                <Image source={{ uri: inviter.avatar }} style={styles.avatar} />
              ) : (
                <View style={[styles.avatar, styles.avatarFallback]}>
                  <Text style={styles.avatarText}>{(inviter.nickname || '友').slice(0, 1)}</Text>
                </View>
              )}
              <Text style={styles.inviterName}>{inviter.nickname || '神秘好友'}</Text>
            </View>
          ) : (
            <View>
              <Text style={styles.noInviter}>暂未绑定邀请人</Text>
              <Button title="填写邀请码" type="secondary" onPress={() => setShowBind(true)} style={{ marginTop: 10 }} />
            </View>
          )}
        </Card>

        {/* 已邀请用户 */}
        <Text style={styles.listHeader}>已邀请的好友（{stats.inviteCount}）</Text>
        {invitedUsers.map((user) => (
          <Card key={user.id}>
            <View style={styles.userRow}>
              {user.avatarUrl ? (
                <Image source={{ uri: user.avatarUrl }} style={styles.avatar} />
              ) : (
                <View style={[styles.avatar, styles.avatarFallback]}>
                  <Text style={styles.avatarText}>{user.nickname.slice(0, 1)}</Text>
                </View>
              )}
              <View style={{ flex: 1 }}>
                <Text style={styles.userName}>{user.nickname}</Text>
                <Text style={styles.userMeta}>注册：{user.registerTime}</Text>
              </View>
              <View style={{ alignItems: 'flex-end' }}>
                <Badge text={`${user.deviceCount} 台设备`} color={colors.blue} />
                <Text style={styles.userReward}>奖励 {user.reward} U</Text>
              </View>
            </View>
          </Card>
        ))}
        {invitedUsers.length === 0 && <Empty text="还没有邀请任何好友" />}
      </ScrollView>

      <InputDialog
        visible={showBind}
        title="填写邀请码"
        placeholder="请输入好友的邀请码"
        onCancel={() => setShowBind(false)}
        onConfirm={bindInviteCode}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  page: { flex: 1, backgroundColor: colors.bg },
  content: { padding: 16, paddingBottom: 32 },
  codeCard: { alignItems: 'center', paddingVertical: 22, backgroundColor: 'rgba(255,255,255,0.96)', borderColor: colors.border },
  codeLabel: { color: colors.textSecondary, fontSize: 13 },
  code: { fontSize: 32, fontWeight: '800', color: colors.primary, marginTop: 8, letterSpacing: 2 },
  levelName: { color: colors.textSecondary, fontSize: 12, marginTop: 8 },
  codeActions: { flexDirection: 'row', gap: 10, marginTop: 16, alignSelf: 'stretch' },
  codeButton: { flex: 1 },
  statRow: { flexDirection: 'row' },
  statItem: { flex: 1, alignItems: 'center' },
  statValue: { fontSize: 17, fontWeight: '800', color: colors.text },
  statLabel: { color: colors.textSecondary, fontSize: 12, marginTop: 4 },
  sectionTitle: { fontSize: 15, fontWeight: '700', color: colors.text, marginBottom: 10 },
  inviterRow: { flexDirection: 'row', alignItems: 'center', gap: 12 },
  avatar: { width: 42, height: 42, borderRadius: 21, backgroundColor: colors.border },
  avatarFallback: { alignItems: 'center', justifyContent: 'center', backgroundColor: colors.primary },
  avatarText: { color: '#ffffff', fontWeight: '700' },
  inviterName: { fontSize: 15, fontWeight: '600', color: colors.text },
  noInviter: { color: colors.muted, fontSize: 13 },
  listHeader: { fontSize: 15, fontWeight: '800', color: colors.text, marginTop: 6, marginBottom: 10 },
  userRow: { flexDirection: 'row', alignItems: 'center', gap: 12 },
  userName: { fontSize: 14, fontWeight: '700', color: colors.text },
  userMeta: { color: colors.muted, fontSize: 12, marginTop: 3 },
  userReward: { color: colors.orange, fontSize: 12, marginTop: 6, fontWeight: '600' },
});
