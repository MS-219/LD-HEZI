/**
 * 兑换订单列表（对应 pages/exchange-orders）：状态筛选 + 分页。
 */
import React, { useCallback, useEffect, useRef, useState } from 'react';
import { FlatList, RefreshControl, StyleSheet, Text, View } from 'react-native';
import { request } from '../api';
import { Badge, Card, Empty, NavBar, SegmentTabs } from '../components/common';
import { useNavigation } from '../navigation';
import { useSession } from '../session';
import { colors } from '../theme';
import { formatTime } from '../utils/format';

const statusTexts = ['待发货', '已发货', '运输中', '已到货', '已取消'];
const statusColors = [colors.orange, colors.blue, colors.primary, colors.green, colors.muted];

const tabs = [
  { label: '全部', value: -1 },
  { label: '待发货', value: 0 },
  { label: '已发货', value: 1 },
  { label: '运输中', value: 2 },
  { label: '已到货', value: 3 },
];

export default function ExchangeOrdersScreen() {
  const nav = useNavigation();
  const { userId } = useSession();
  const [activeTab, setActiveTab] = useState(-1);
  const [orders, setOrders] = useState<any[]>([]);
  const [loading, setLoading] = useState(false);
  const pageRef = useRef(1);
  const pagesRef = useRef(1);

  const fetchOrders = useCallback(
    async (reset: boolean) => {
      if (!userId) return;
      if (reset) {
        pageRef.current = 1;
        pagesRef.current = 1;
      }
      if (!reset && pageRef.current > pagesRef.current) return;
      setLoading(true);
      try {
        let url = `/api/exchange/orders?userId=${userId}&page=${pageRef.current}&size=10`;
        if (activeTab >= 0) url += `&status=${activeTab}`;
        const res = await request<any>({ url });
        if (res.code === 200 && res.data) {
          const records = res.data.records || [];
          setOrders((prev) => (pageRef.current === 1 ? records : [...prev, ...records]));
          pagesRef.current = res.data.pages || 1;
          pageRef.current += 1;
        }
      } catch {
        // ignore
      } finally {
        setLoading(false);
      }
    },
    [userId, activeTab]
  );

  useEffect(() => {
    fetchOrders(true);
  }, [fetchOrders]);

  return (
    <View style={styles.page}>
      <NavBar title="兑换订单" />
      <View style={styles.body}>
        <SegmentTabs options={tabs} value={activeTab} onChange={setActiveTab} />
        <FlatList
          data={orders}
          keyExtractor={(item) => String(item.id ?? item.orderNo)}
          refreshControl={<RefreshControl refreshing={loading} onRefresh={() => fetchOrders(true)} />}
          onEndReached={() => !loading && fetchOrders(false)}
          onEndReachedThreshold={0.3}
          ListEmptyComponent={<Empty text="暂无订单" />}
          contentContainerStyle={{ paddingBottom: 24 }}
          renderItem={({ item }) => (
            <Card onPress={() => nav.navigate('exchange-order-detail', { orderNo: item.orderNo })}>
              <View style={styles.row}>
                <Text style={styles.orderNo}>单号：{item.orderNo}</Text>
                <Badge
                  text={statusTexts[item.status] || '处理中'}
                  color={statusColors[item.status] || colors.muted}
                />
              </View>
              <Text style={styles.productName}>
                {item.productName} ×{item.quantity || 1}
              </Text>
              <View style={styles.row}>
                <Text style={styles.meta}>{formatTime(item.createTime)}</Text>
                <Text style={styles.price}>{item.totalHashrate || item.hashratePrice || 0} 算力值</Text>
              </View>
            </Card>
          )}
        />
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  page: { flex: 1, backgroundColor: colors.bg },
  body: { flex: 1, padding: 16 },
  row: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' },
  orderNo: { color: colors.muted, fontSize: 12, flex: 1, marginRight: 8 },
  productName: { fontSize: 15, fontWeight: '700', color: colors.text, marginVertical: 8 },
  meta: { color: colors.muted, fontSize: 12 },
  price: { color: colors.green, fontWeight: '700', fontSize: 13 },
});
