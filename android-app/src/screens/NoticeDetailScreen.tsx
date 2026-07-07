/**
 * 公告详情（对应 pages/notice-detail）
 */
import React, { useEffect, useState } from 'react';
import { Image, ScrollView, StyleSheet, Text, View } from 'react-native';
import { formatUrl, request } from '../api';
import { Card, LoadingView, NavBar } from '../components/common';
import { useRouteParams } from '../navigation';
import { colors } from '../theme';
import { formatTime } from '../utils/format';

export default function NoticeDetailScreen() {
  const { id } = useRouteParams<{ id: number }>();
  const [notice, setNotice] = useState<any>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    (async () => {
      try {
        const res = await request<any>({ url: `/api/notice/detail/${id}` });
        if (res.code === 200 && res.data) {
          setNotice(res.data);
        }
      } finally {
        setLoading(false);
      }
    })();
  }, [id]);

  return (
    <View style={styles.page}>
      <NavBar title="公告详情" />
      {loading ? (
        <LoadingView />
      ) : !notice ? (
        <LoadingView text="公告不存在" />
      ) : (
        <ScrollView contentContainerStyle={styles.content}>
          <Card>
            <Text style={styles.title}>{notice.title}</Text>
            <Text style={styles.time}>{formatTime(notice.publishTime || notice.createTime)}</Text>
            {!!notice.imageUrl && (
              <Image source={{ uri: formatUrl(notice.imageUrl) }} style={styles.image} resizeMode="cover" />
            )}
            <Text style={styles.body}>{notice.content}</Text>
          </Card>
        </ScrollView>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  page: { flex: 1, backgroundColor: colors.bg },
  content: { padding: 16 },
  title: { fontSize: 18, fontWeight: '800', color: colors.text },
  time: { color: colors.muted, marginTop: 8, fontSize: 12 },
  image: { width: '100%', height: 180, borderRadius: 10, marginTop: 12, backgroundColor: colors.border },
  body: { color: colors.textSecondary, marginTop: 14, lineHeight: 22, fontSize: 15 },
});
