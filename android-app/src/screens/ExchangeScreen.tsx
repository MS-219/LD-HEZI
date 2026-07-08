/**
 * 兑换设备商城（对应 pages/exchange）：算力值余额、商品列表、跳兑换订单。
 */
import React, { useCallback, useEffect, useState } from 'react';
import {
  FlatList,
  Image,
  Pressable,
  RefreshControl,
  StyleSheet,
  Text,
  View,
} from 'react-native';
import { formatUrl, request } from '../api';
import { Card, Empty, NavBar } from '../components/common';
import { useNavigation } from '../navigation';
import { useSession } from '../session';
import { colors } from '../theme';
import { formatHashrate } from '../utils/format';

const levelNames = ['普通', '会员', '社区', '县级', '市级', '联创'];

export default function ExchangeScreen() {
  const nav = useNavigation();
  const { userId } = useSession();
  const [products, setProducts] = useState<any[]>([]);
  const [userLevel, setUserLevel] = useState(0);
  const [availableHashrate, setAvailableHashrate] = useState(0);
  const [loading, setLoading] = useState(false);

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const res = await request<any>({ url: `/api/exchange/products?userId=${userId || ''}` });
      if (res.code === 200 && res.data) {
        setProducts(res.data.products || []);
        setUserLevel(res.data.userLevel || 0);
        setAvailableHashrate(res.data.availableHashrate || 0);
      }
    } catch {
      // ignore
    } finally {
      setLoading(false);
    }
  }, [userId]);

  useEffect(() => {
    load();
  }, [load]);

  return (
    <View style={styles.page}>
      <NavBar
        title="兑换设备"
        right={
          <Pressable onPress={() => nav.navigate('exchange-orders')}>
            <Text style={styles.navRight}>订单</Text>
          </Pressable>
        }
      />
      <FlatList
        data={products}
        keyExtractor={(item) => String(item.id)}
        contentContainerStyle={styles.content}
        refreshControl={<RefreshControl refreshing={loading} onRefresh={load} />}
        ListHeaderComponent={
          <Card style={styles.headCard}>
            <View style={styles.headRow}>
              <View>
                <Text style={styles.headLabel}>可用算力值</Text>
                <Text style={styles.headValue}>{formatHashrate(availableHashrate)}</Text>
              </View>
              <View style={styles.levelChip}>
                <Text style={styles.levelText}>{levelNames[userLevel] || '普通'}用户</Text>
              </View>
            </View>
          </Card>
        }
        ListEmptyComponent={<Empty text="暂无可兑换商品" />}
        renderItem={({ item }) => (
          <Card onPress={() => nav.navigate('exchange-detail', { id: item.id })}>
            <View style={styles.productRow}>
              {item.imageUrl ? (
                <Image source={{ uri: formatUrl(item.imageUrl) }} style={styles.productImage} />
              ) : (
                <View style={[styles.productImage, styles.productImageFallback]}>
                  <Text style={{ fontSize: 26 }}>📦</Text>
                </View>
              )}
              <View style={{ flex: 1 }}>
                <Text style={styles.productName} numberOfLines={2}>
                  {item.name}
                </Text>
                {!!item.description && (
                  <Text style={styles.productDesc} numberOfLines={1}>
                    {item.description}
                  </Text>
                )}
                <View style={styles.priceRow}>
                  <Text style={styles.price}>{formatHashrate(item.userHashratePrice || item.hashratePrice || 0)} 算力值</Text>
                  <Text style={styles.stock}>库存 {item.stock ?? '--'}</Text>
                </View>
              </View>
            </View>
          </Card>
        )}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  page: { flex: 1, backgroundColor: colors.bg },
  content: { padding: 16, paddingBottom: 32 },
  navRight: { color: colors.primary, fontSize: 14, fontWeight: '600' },
  headCard: { backgroundColor: colors.navy, borderColor: colors.navy },
  headRow: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' },
  headLabel: { color: '#9fd2f5', fontSize: 13 },
  headValue: { color: '#ffffff', fontSize: 28, fontWeight: '800', marginTop: 4 },
  levelChip: { backgroundColor: 'rgba(255,255,255,0.2)', borderRadius: 999, paddingHorizontal: 12, paddingVertical: 6 },
  levelText: { color: '#ffffff', fontWeight: '700', fontSize: 13 },
  productRow: { flexDirection: 'row', gap: 12 },
  productImage: { width: 72, height: 72, borderRadius: 10, backgroundColor: colors.border },
  productImageFallback: { alignItems: 'center', justifyContent: 'center', backgroundColor: '#e7f2fb' },
  productName: { fontSize: 15, fontWeight: '700', color: colors.text },
  productDesc: { color: colors.muted, fontSize: 12, marginTop: 4 },
  priceRow: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginTop: 8 },
  price: { color: colors.green, fontWeight: '800', fontSize: 14 },
  stock: { color: colors.muted, fontSize: 12 },
});
