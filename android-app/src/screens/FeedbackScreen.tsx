/**
 * 意见反馈（对应 pages/feedback）：类型选择、内容、联系方式、最多 3 张图片上传。
 */
import React, { useState } from 'react';
import {
  Alert,
  Image,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  View,
} from 'react-native';
import { request, uploadImage } from '../api';
import { Button, Card, NavBar } from '../components/common';
import { imagePickerAvailable, pickImages } from '../native/imagePicker';
import { useNavigation } from '../navigation';
import { useSession } from '../session';
import { colors, radius } from '../theme';

const typeOptions = [
  { value: 'suggestion', label: '功能建议' },
  { value: 'bug', label: '问题反馈' },
  { value: 'complaint', label: '投诉建议' },
  { value: 'other', label: '其他' },
];

export default function FeedbackScreen() {
  const nav = useNavigation();
  const { userId } = useSession();
  const [type, setType] = useState('suggestion');
  const [content, setContent] = useState('');
  const [contact, setContact] = useState('');
  const [images, setImages] = useState<string[]>([]);
  const [submitting, setSubmitting] = useState(false);

  const chooseImage = async () => {
    if (!imagePickerAvailable) {
      Alert.alert('提示', '当前平台暂不支持选择图片');
      return;
    }
    const maxCount = 3 - images.length;
    if (maxCount <= 0) {
      Alert.alert('提示', '最多上传3张图片');
      return;
    }
    const uris = await pickImages(maxCount);
    if (uris.length) setImages((prev) => [...prev, ...uris].slice(0, 3));
  };

  const removeImage = (index: number) => {
    setImages((prev) => prev.filter((_, i) => i !== index));
  };

  const submit = async () => {
    if (!content || content.trim().length < 10) {
      Alert.alert('提示', '请详细描述您的问题（至少10个字）');
      return;
    }
    setSubmitting(true);
    try {
      const imageUrls: string[] = [];
      for (const img of images) {
        imageUrls.push(await uploadImage(img));
      }
      const res = await request({
        url: '/api/feedback/submit',
        method: 'POST',
        data: {
          userId,
          type,
          content: content.trim(),
          contact: contact.trim(),
          images: imageUrls.join(','),
        },
      });
      if (res.code === 200) {
        Alert.alert('提交成功', '感谢您的反馈，我们会尽快处理！', [
          { text: '好的', onPress: () => nav.back() },
        ]);
      } else {
        Alert.alert('提交失败', res.msg || '请重试');
      }
    } catch (err) {
      Alert.alert('提交失败', err instanceof Error ? err.message : '请重试');
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <View style={styles.page}>
      <NavBar title="意见反馈" />
      <ScrollView contentContainerStyle={styles.content}>
        <Card>
          <Text style={styles.label}>反馈类型</Text>
          <View style={styles.typeRow}>
            {typeOptions.map((opt) => {
              const active = type === opt.value;
              return (
                <Pressable
                  key={opt.value}
                  onPress={() => setType(opt.value)}
                  style={[styles.typeItem, active && styles.typeItemOn]}
                >
                  <Text style={[styles.typeText, active && styles.typeTextOn]}>{opt.label}</Text>
                </Pressable>
              );
            })}
          </View>

          <Text style={styles.label}>问题描述</Text>
          <TextInput
            value={content}
            onChangeText={setContent}
            placeholder="请详细描述您遇到的问题或建议（至少10个字）"
            placeholderTextColor={colors.muted}
            multiline
            style={[styles.input, styles.textarea]}
            maxLength={500}
          />
          <Text style={styles.counter}>{content.length}/500</Text>

          <Text style={styles.label}>联系方式（选填）</Text>
          <TextInput
            value={contact}
            onChangeText={setContact}
            placeholder="手机号 / 微信号，方便我们联系您"
            placeholderTextColor={colors.muted}
            style={styles.input}
          />

          <Text style={styles.label}>图片（最多3张，选填）</Text>
          <View style={styles.imageRow}>
            {images.map((uri, index) => (
              <Pressable key={uri} onPress={() => removeImage(index)}>
                <Image source={{ uri }} style={styles.image} />
                <View style={styles.imageRemove}>
                  <Text style={styles.imageRemoveText}>×</Text>
                </View>
              </Pressable>
            ))}
            {images.length < 3 && (
              <Pressable style={styles.imageAdd} onPress={chooseImage}>
                <Text style={styles.imageAddText}>＋</Text>
              </Pressable>
            )}
          </View>

          <Button
            title={submitting ? '提交中...' : '提交反馈'}
            onPress={submit}
            disabled={submitting}
            style={{ marginTop: 18 }}
          />
        </Card>
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  page: { flex: 1, backgroundColor: colors.bg },
  content: { padding: 16, paddingBottom: 32 },
  label: { color: colors.text, fontWeight: '700', marginBottom: 8, marginTop: 12, fontSize: 14 },
  typeRow: { flexDirection: 'row', flexWrap: 'wrap', gap: 8 },
  typeItem: {
    borderWidth: 1,
    borderColor: colors.border,
    borderRadius: 999,
    paddingHorizontal: 14,
    paddingVertical: 7,
  },
  typeItemOn: { borderColor: colors.primary, backgroundColor: '#eef2ff' },
  typeText: { color: colors.textSecondary, fontSize: 13 },
  typeTextOn: { color: colors.primary, fontWeight: '700' },
  input: {
    borderWidth: 1,
    borderColor: colors.border,
    borderRadius: radius.md,
    paddingHorizontal: 12,
    paddingVertical: 11,
    color: colors.text,
  },
  textarea: { minHeight: 110, textAlignVertical: 'top' },
  counter: { color: colors.muted, fontSize: 12, textAlign: 'right', marginTop: 4 },
  imageRow: { flexDirection: 'row', gap: 10 },
  image: { width: 72, height: 72, borderRadius: 10, backgroundColor: colors.border },
  imageRemove: {
    position: 'absolute',
    top: -6,
    right: -6,
    width: 20,
    height: 20,
    borderRadius: 10,
    backgroundColor: colors.red,
    alignItems: 'center',
    justifyContent: 'center',
  },
  imageRemoveText: { color: '#ffffff', fontSize: 13, lineHeight: 15 },
  imageAdd: {
    width: 72,
    height: 72,
    borderRadius: 10,
    borderWidth: 1,
    borderColor: colors.border,
    borderStyle: 'dashed',
    alignItems: 'center',
    justifyContent: 'center',
  },
  imageAddText: { fontSize: 26, color: colors.muted },
});
