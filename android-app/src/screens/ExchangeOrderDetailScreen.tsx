/**
 * 兑换订单详情（对应 pages/exchange-order-detail）：订单信息、物流轨迹
 * （平台记录 + 快递实时物流）、复制快递单号、确认收货。
 */
import React, { useCallback, useEffect, useState } from 'react';
import { Alert, RefreshControl, ScrollView, StyleSheet, Text, View } from 'react-native';
import { request } from '../api';
import { Badge, Button, Card, InfoRow, NavBar } from '../components/common';
import { copyText } from '../native/clipboard';
import { useRouteParams } from '../navigation';
import { useSession } from '../session';
import { colors } from '../theme';
import { formatTime } from '../utils/format';

const statusTexts = ['待发货', '已发货', '运输中', '已到货', '已取消'];
const statusColors = [colors.orange, colors.blue, colors.primary, colors.green, colors.muted];

export default function ExchangeOrderDetailScreen() {
  const { userId } = useSession();
  const { orderNo } = useRouteParams<{ orderNo: string }>();
  const [order, setOrder] = useState<any>(null);
  const [logistics, setLogistics] = useState<any[]>([]);
  const [expressLogistics, setExpressLogistics] = useState<any[]>([]);
  const [loading, setLoading] = useState(false);

  const fetchDetail = useCallback(async () => {
    if (!orderNo) return;
    setLoading(true);
    try {
      const res = await request<any>({ url: `/api/exchange/order/${orderNo}?userId=${userId}` });
      if (res.code === 200 && res.data) {
        setOrder(res.data.order);
        setLogistics(res.data.logistics || []);
        const ord = res.data.order;
        if (ord && ord.expressNo && ord.status >= 1) {
          const logRes = await request<any>({
            url: `/api/exchange/orders/${ord.id}/logistics?userId=${userId}`,
          });
          if (logRes.code === 200 && logRes.data?.result) {
            setExpressLogistics(logRes.data.result.list || []);
          }
        }
      }
    } catch {
      // ignore
    } finally {
      setLoading(false);
    }
  }, [orderNo, userId]);

  useEffect(() => {
    fetchDetail();
  }, [fetchDetail]);

  const confirmReceive = () => {
    Alert.alert('确认收货', '确认已收到设备？', [
      { text: '取消', style: 'cancel' },
      {
        text: '确认',
        onPress: async () => {
          try {
            const res = await request({
              url: `/api/exchange/order/${orderNo}/confirm?userId=${userId}`,
              method: 'POST',
            });
            if (res.code === 200) {
              Alert.alert('已确认收货');
              fetchDetail();
            } else {
              Alert.alert('操作失败', res.msg || '请稍后重试');
            }
          } catch (err) {
            Alert.alert('操作失败', err instanceof Error ? err.message : '网络错误');
          }
        },
      },
    ]);
  };

  return (
    <View style={styles.page}>
      <NavBar title="订单详情" />
      <ScrollView
        contentContainerStyle={styles.content}
        refreshControl={<RefreshControl refreshing={loading} onRefresh={fetchDetail} />}
      >
        {order && (
          <>
            <Card>
              <View style={styles.head}>
                <Text style={styles.productName}>
                  {order.productName} ×{order.quantity || 1}
                </Text>
                <Badge
                  text={statusTexts[order.status] || '处理中'}
                  color={statusColors[order.status] || colors.muted}
                />
              </View>
              <InfoRow label="订单编号" value={order.orderNo} />
              <InfoRow label="消耗算力值" value={order.totalHashrate || order.hashratePrice} valueColor={colors.green} />
              <InfoRow label="下单时间" value={formatTime(order.createTime)} />
              {!!order.receiverName && (
                <InfoRow label="收货人" value={`${order.receiverName} ${order.receiverPhone || ''}`} />
              )}
              {!!order.address && <InfoRow label="收货地址" value={order.address} />}
              {!!order.expressCompany && <InfoRow label="快递公司" value={order.expressCompany} />}
              {!!order.expressNo && <InfoRow label="快递单号" value={order.expressNo} />}
              {!!order.expressNo && (
                <Button
                  title="复制快递单号"
                  type="secondary"
                  style={{ marginTop: 10 }}
                  onPress={() => copyText(order.expressNo)}
                />
              )}
            </Card>

            {expressLogistics.length > 0 && (
              <Card>
                <Text style={styles.sectionTitle}>实时物流</Text>
                {expressLogistics.map((item: any, index: number) => (
                  <View key={index} style={styles.logisticsItem}>
                    <View style={[styles.dot, index === 0 && styles.dotActive]} />
                    <View style={{ flex: 1 }}>
                      <Text style={[styles.logisticsText, index === 0 && styles.logisticsTextActive]}>
                        {item.status || item.context}
                      </Text>
                      <Text style={styles.logisticsTime}>{item.time}</Text>
                    </View>
                  </View>
                ))}
              </Card>
            )}

            {logistics.length > 0 && (
              <Card>
                <Text style={styles.sectionTitle}>订单动态</Text>
                {logistics.map((item: any, index: number) => (
                  <View key={index} style={styles.logisticsItem}>
                    <View style={[styles.dot, index === 0 && styles.dotActive]} />
                    <View style={{ flex: 1 }}>
                      <Text style={[styles.logisticsText, index === 0 && styles.logisticsTextActive]}>
                        {item.content || item.remark || statusTexts[item.status] || ''}
                      </Text>
                      <Text style={styles.logisticsTime}>{formatTime(item.createTime)}</Text>
                    </View>
                  </View>
                ))}
              </Card>
            )}

            {(order.status === 1 || order.status === 2) && (
              <Button title="确认收货" type="success" onPress={confirmReceive} />
            )}
          </>
        )}
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  page: { flex: 1, backgroundColor: colors.bg },
  content: { padding: 16, paddingBottom: 32 },
  head: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 8 },
  productName: { fontSize: 16, fontWeight: '800', color: colors.text, flex: 1, marginRight: 8 },
  sectionTitle: { fontSize: 15, fontWeight: '700', color: colors.text, marginBottom: 12 },
  logisticsItem: { flexDirection: 'row', gap: 10, paddingBottom: 14 },
  dot: { width: 8, height: 8, borderRadius: 4, backgroundColor: colors.border, marginTop: 5 },
  dotActive: { backgroundColor: colors.green },
  logisticsText: { color: colors.textSecondary, fontSize: 13, lineHeight: 19 },
  logisticsTextActive: { color: colors.text, fontWeight: '600' },
  logisticsTime: { color: colors.muted, fontSize: 11, marginTop: 3 },
});
