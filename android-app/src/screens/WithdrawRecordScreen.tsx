/**
 * 提现记录（对应 pages/withdraw-record 与 pages/withdraw-list，两页功能相同，合并为一页）
 */
import React, { useCallback, useEffect, useRef, useState } from 'react';
import { FlatList, RefreshControl, StyleSheet, Text, View } from 'react-native';
import { request } from '../api';
import { Badge, Card, Empty, NavBar } from '../components/common';
import { useSession } from '../session';
import { colors } from '../theme';
import { formatTime } from '../utils/format';

const PAGE_SIZE = 10;

// 提现单状态：0 待审核 / 1 已通过（打款中）/ 2 已驳回 / 3 已打款
const statusMap: Record<number, { text: string; color: string }> = {
  0: { text: '待审核', color: colors.orange },
  1: { text: '已通过', color: colors.blue },
  2: { text: '已驳回', color: colors.red },
  3: { text: '已打款', color: colors.green },
};

const typeNames: Record<number, string> = { 1: '微信', 2: '支付宝', 3: '银行卡' };

export default function WithdrawRecordScreen() {
  const { userId } = useSession();
  const [records, setRecords] = useState<any[]>([]);
  const [loading, setLoading] = useState(false);
  const pageRef = useRef(1);
  const hasMoreRef = useRef(true);

  const fetchPage = useCallback(
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
          url: '/api/withdraw/list',
          data: { userId, page: pageRef.current, size: PAGE_SIZE },
        });
        if (res.code === 200 && res.data) {
          const newRecords = res.data.records || [];
          setRecords((prev) => (pageRef.current === 1 ? newRecords : [...prev, ...newRecords]));
          hasMoreRef.current = newRecords.length >= PAGE_SIZE;
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

  useEffect(() => {
    fetchPage(true);
  }, [fetchPage]);

  return (
    <View style={styles.page}>
      <NavBar title="提现记录" />
      <FlatList
        data={records}
        keyExtractor={(item, index) => String(item.id ?? index)}
        contentContainerStyle={styles.content}
        refreshControl={<RefreshControl refreshing={loading} onRefresh={() => fetchPage(true)} />}
        onEndReached={() => !loading && fetchPage(false)}
        onEndReachedThreshold={0.3}
        ListEmptyComponent={<Empty text="暂无提现记录" />}
        renderItem={({ item }) => {
          const status = statusMap[item.status] || { text: '处理中', color: colors.muted };
          return (
            <Card>
              <View style={styles.row}>
                <Text style={styles.amount}>¥{item.amount}</Text>
                <Badge text={status.text} color={status.color} />
              </View>
              <Text style={styles.meta}>方式：{typeNames[item.type] || '--'}</Text>
              {!!item.account && <Text style={styles.meta}>账号：{item.account}</Text>}
              <Text style={styles.meta}>申请时间：{formatTime(item.createTime)}</Text>
              {!!item.remark && <Text style={[styles.meta, { color: colors.red }]}>备注：{item.remark}</Text>}
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
  row: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' },
  amount: { fontSize: 18, fontWeight: '800', color: colors.text },
  meta: { color: colors.textSecondary, marginTop: 6, fontSize: 13 },
});
