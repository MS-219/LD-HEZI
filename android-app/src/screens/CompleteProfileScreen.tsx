/**
 * 完善资料（对应 pages/complete-profile）：设置头像 + 昵称。
 */
import React, { useState } from 'react';
import { Alert, Image, Pressable, ScrollView, StyleSheet, Text, TextInput, View } from 'react-native';
import { formatUrl, request, uploadImage } from '../api';
import { Button, Card, NavBar } from '../components/common';
import { imagePickerAvailable, pickImages } from '../native/imagePicker';
import { useNavigation } from '../navigation';
import { useSession } from '../session';
import { colors } from '../theme';

export default function CompleteProfileScreen() {
  const nav = useNavigation();
  const { userId, userInfo, patchUser } = useSession();
  const [nickname, setNickname] = useState(
    userInfo.nickname && userInfo.nickname !== '微信用户' ? userInfo.nickname : ''
  );
  const [avatarUri, setAvatarUri] = useState('');
  const [saving, setSaving] = useState(false);

  const chooseAvatar = async () => {
    if (!imagePickerAvailable) {
      Alert.alert('提示', '当前平台暂不支持选择图片');
      return;
    }
    const uris = await pickImages(1);
    if (uris.length) setAvatarUri(uris[0]);
  };

  const onSave = async () => {
    if (!nickname.trim()) {
      Alert.alert('提示', '请输入昵称');
      return;
    }
    setSaving(true);
    try {
      let finalAvatarUrl = userInfo.avatarUrl;
      if (avatarUri) {
        finalAvatarUrl = formatUrl(await uploadImage(avatarUri));
      }
      const res = await request({
        url: '/api/user/updateProfile',
        method: 'POST',
        data: { userId, nickname: nickname.trim(), avatarUrl: finalAvatarUrl },
      });
      if (res.code === 200) {
        patchUser({ nickname: nickname.trim(), avatarUrl: finalAvatarUrl });
        Alert.alert('保存成功', '', [{ text: '好的', onPress: () => nav.back() }]);
      } else {
        Alert.alert('保存失败', res.msg || '请稍后重试');
      }
    } catch (err) {
      Alert.alert('操作失败', err instanceof Error ? err.message : '请重试');
    } finally {
      setSaving(false);
    }
  };

  const displayAvatar = avatarUri || userInfo.avatarUrl;

  return (
    <View style={styles.page}>
      <NavBar title="完善资料" />
      <ScrollView contentContainerStyle={styles.content}>
        <Card style={styles.card}>
          <Pressable onPress={chooseAvatar} style={styles.avatarWrap}>
            {displayAvatar ? (
              <Image source={{ uri: displayAvatar }} style={styles.avatar} />
            ) : (
              <View style={[styles.avatar, styles.avatarFallback]}>
                <Text style={styles.avatarPlus}>＋</Text>
              </View>
            )}
            <Text style={styles.avatarTip}>点击设置头像</Text>
          </Pressable>
          <Text style={styles.label}>昵称</Text>
          <TextInput
            value={nickname}
            onChangeText={setNickname}
            placeholder="请输入昵称"
            placeholderTextColor={colors.muted}
            style={styles.input}
            maxLength={20}
          />
          <Button title={saving ? '保存中...' : '保存'} onPress={onSave} disabled={saving} style={{ marginTop: 20 }} />
        </Card>
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  page: { flex: 1, backgroundColor: colors.bg },
  content: { padding: 16 },
  card: { padding: 24 },
  avatarWrap: { alignItems: 'center', marginBottom: 20 },
  avatar: { width: 84, height: 84, borderRadius: 42, backgroundColor: colors.border },
  avatarFallback: { alignItems: 'center', justifyContent: 'center' },
  avatarPlus: { fontSize: 30, color: colors.muted },
  avatarTip: { color: colors.textSecondary, marginTop: 8, fontSize: 13 },
  label: { color: colors.text, fontWeight: '700', marginBottom: 8 },
  input: {
    borderWidth: 1,
    borderColor: colors.border,
    borderRadius: 12,
    paddingHorizontal: 12,
    paddingVertical: 11,
    color: colors.text,
  },
});
