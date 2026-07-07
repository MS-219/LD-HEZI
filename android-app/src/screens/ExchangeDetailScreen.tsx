/**
 * 兑换详情（对应 pages/exchange-detail）：商品详情、各等级价格、数量选择、
 * 收货地址选择、确认兑换下单。
 */
import React, { useCallback, useEffect, useState } from 'react';
import {
  Alert,
  Image,
  Modal,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  View,
} from 'react-native';
import { formatUrl, request } from '../api';
import { Button, Card, InfoRow, NavBar } from '../components/common';
import { useNavigation, useRouteParams } from '../navigation';
import { useSession } from '../session';
import { colors, radius } from '../theme';
import { formatHashrate } from '../utils/format';

const levelNames = ['普通', '会员', '社区', '县级', '市级', '联创'];

export default function ExchangeDetailScreen() {
  const nav = useNavigation();
  const { userId, isLoggedIn } = useSession();
  const { id: productId } = useRouteParams<{ id: number }>();
  const [product, setProduct] = useState<any>(null);
  const [allPrices, setAllPrices] = useState<any[]>([]);
  const [userLevel, setUserLevel] = useState(0);
  const [availableHashrate, setAvailableHashrate] = useState(0);
  const [addresses, setAddresses] = useState<any[]>([]);
  const [selectedAddress, setSelectedAddress] = useState<any>(null);
  const [showPicker, setShowPicker] = useState(false);
  const [quantity, setQuantity] = useState(1);

  const fetchDetail = useCallback(async () => {
    try {
      const res = await request<any>({ url: `/api/exchange/product/${productId}?userId=${userId}` });
      if (res.code === 200 && res.data) {
        setProduct(res.data.product);
        setAllPrices(res.data.allPrices || []);
        setUserLevel(res.data.userLevel || 0);
        setAvailableHashrate(res.data.availableHashrate || 0);
      }
    } catch {
      // ignore
    }
  }, [productId, userId]);

  const fetchAddresses = useCallback(async () => {
    try {
      const res = await request<any[]>({ url: `/api/address/list?userId=${userId}` });
      if (res.code === 200) {
        const list = res.data || [];
        setAddresses(list);
        setSelectedAddress((prev: any) => prev || list.find((a) => a.isDefault === 1) || list[0] || null);
      }
    } catch {
      // ignore
    }
  }, [userId]);

  useEffect(() => {
    fetchDetail();
    fetchAddresses();
  }, [fetchDetail, fetchAddresses]);

  const confirmExchange = () => {
    if (!isLoggedIn) {
      Alert.alert('请先登录', '需要登录后才能进行兑换');
      return;
    }
    if (userLevel < 1) {
      Alert.alert('提示', '请先升级等级后再兑换');
      return;
    }
    if (!selectedAddress) {
      Alert.alert('提示', '请选择收货地址');
      return;
    }
    const totalHashrate = (product?.userHashratePrice || 0) * quantity;
    Alert.alert('确认兑换', `将消耗 ${totalHashrate} 算力值兑换 ${product?.name} ×${quantity}`, [
      { text: '取消', style: 'cancel' },
      { text: '确认兑换', onPress: doExchange },
    ]);
  };

  const doExchange = async () => {
    try {
      const res = await request<any>({
        url: '/api/exchange/order',
        method: 'POST',
        data: { userId, productId, addressId: selectedAddress.id, quantity },
      });
      if (res.code === 200 && res.data) {
        Alert.alert('兑换成功！', '', [
          {
            text: '查看订单',
            onPress: () => nav.replace('exchange-order-detail', { orderNo: res.data.orderNo }),
          },
        ]);
      } else {
        Alert.alert('兑换失败', res.msg || '请稍后重试');
      }
    } catch (err) {
      Alert.alert('兑换失败', err instanceof Error ? err.message : '网络错误');
    }
  };

  const increase = () => {
    if (product?.stock && quantity >= product.stock) {
      Alert.alert('提示', '库存不足');
      return;
    }
    setQuantity((q) => q + 1);
  };

  return (
    <View style={styles.page}>
      <NavBar title="兑换详情" />
      <ScrollView contentContainerStyle={styles.content}>
        {product && (
          <>
            <Card>
              {!!product.imageUrl && (
                <Image source={{ uri: formatUrl(product.imageUrl) }} style={styles.image} resizeMode="cover" />
              )}
              <Text style={styles.name}>{product.name}</Text>
              {!!product.description && <Text style={styles.desc}>{product.description}</Text>}
              <View style={styles.priceRow}>
                <Text style={styles.price}>{formatHashrate(product.userHashratePrice || 0)} 算力值</Text>
                <Text style={styles.stock}>库存 {product.stock ?? '--'}</Text>
              </View>
              <Text style={styles.balance}>
                我的可用算力值：{formatHashrate(availableHashrate)}（{levelNames[userLevel] || '普通'}用户）
              </Text>
            </Card>

            {allPrices.length > 0 && (
              <Card>
                <Text style={styles.sectionTitle}>各等级兑换价</Text>
                {allPrices.map((p: any, i: number) => (
                  <InfoRow
                    key={i}
                    label={`${levelNames[p.level] || p.levelName || `等级${p.level}`}用户`}
                    value={`${formatHashrate(p.hashratePrice || p.price || 0)} 算力值`}
                    valueColor={p.level === userLevel ? colors.green : undefined}
                  />
                ))}
              </Card>
            )}

            {/* 数量 */}
            <Card>
              <View style={styles.qtyRow}>
                <Text style={styles.sectionTitle}>兑换数量</Text>
                <View style={styles.qtyControls}>
                  <Pressable style={styles.qtyButton} onPress={() => quantity > 1 && setQuantity(quantity - 1)}>
                    <Text style={styles.qtyButtonText}>－</Text>
                  </Pressable>
                  <Text style={styles.qtyValue}>{quantity}</Text>
                  <Pressable style={styles.qtyButton} onPress={increase}>
                    <Text style={styles.qtyButtonText}>＋</Text>
                  </Pressable>
                </View>
              </View>
            </Card>

            {/* 收货地址 */}
            <Card onPress={() => (addresses.length ? setShowPicker(true) : nav.navigate('address-manage'))}>
              <Text style={styles.sectionTitle}>收货地址</Text>
              {selectedAddress ? (
                <View>
                  <Text style={styles.addrName}>
                    {selectedAddress.receiverName} {selectedAddress.phone}
                  </Text>
                  <Text style={styles.addrDetail}>
                    {selectedAddress.province}
                    {selectedAddress.city}
                    {selectedAddress.district}
                    {selectedAddress.detailAddress}
                  </Text>
                  <Text style={styles.addrChange}>点击切换地址 ›</Text>
                </View>
              ) : (
                <Text style={styles.addrEmpty}>暂无收货地址，点击去添加 ›</Text>
              )}
            </Card>

            <Button
              title={`确认兑换（消耗 ${formatHashrate((product.userHashratePrice || 0) * quantity)} 算力值）`}
              type="success"
              onPress={confirmExchange}
            />
          </>
        )}
      </ScrollView>

      {/* 地址选择弹层 */}
      <Modal visible={showPicker} transparent animationType="slide" onRequestClose={() => setShowPicker(false)}>
        <Pressable style={styles.pickerMask} onPress={() => setShowPicker(false)}>
          <View style={styles.picker}>
            <Text style={styles.pickerTitle}>选择收货地址</Text>
            <ScrollView style={{ maxHeight: 320 }}>
              {addresses.map((addr, index) => (
                <Pressable
                  key={addr.id}
                  style={styles.pickerItem}
                  onPress={() => {
                    setSelectedAddress(addresses[index]);
                    setShowPicker(false);
                  }}
                >
                  <Text style={styles.addrName}>
                    {addr.receiverName} {addr.phone} {addr.isDefault === 1 ? '（默认）' : ''}
                  </Text>
                  <Text style={styles.addrDetail}>
                    {addr.province}
                    {addr.city}
                    {addr.district}
                    {addr.detailAddress}
                  </Text>
                </Pressable>
              ))}
            </ScrollView>
            <Button
              title="管理收货地址"
              type="secondary"
              onPress={() => {
                setShowPicker(false);
                nav.navigate('address-manage');
              }}
              style={{ marginTop: 10 }}
            />
          </View>
        </Pressable>
      </Modal>
    </View>
  );
}

const styles = StyleSheet.create({
  page: { flex: 1, backgroundColor: colors.bg },
  content: { padding: 16, paddingBottom: 32 },
  image: { width: '100%', height: 180, borderRadius: 10, backgroundColor: colors.border, marginBottom: 12 },
  name: { fontSize: 17, fontWeight: '800', color: colors.text },
  desc: { color: colors.textSecondary, marginTop: 6, lineHeight: 20, fontSize: 13 },
  priceRow: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginTop: 10 },
  price: { color: colors.green, fontWeight: '800', fontSize: 18 },
  stock: { color: colors.muted, fontSize: 13 },
  balance: { color: colors.textSecondary, fontSize: 12, marginTop: 10 },
  sectionTitle: { fontSize: 15, fontWeight: '700', color: colors.text, marginBottom: 8 },
  qtyRow: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' },
  qtyControls: { flexDirection: 'row', alignItems: 'center', gap: 14 },
  qtyButton: {
    width: 32,
    height: 32,
    borderRadius: radius.sm,
    borderWidth: 1,
    borderColor: colors.border,
    alignItems: 'center',
    justifyContent: 'center',
  },
  qtyButtonText: { fontSize: 16, color: colors.text },
  qtyValue: { fontSize: 16, fontWeight: '700', color: colors.text, minWidth: 24, textAlign: 'center' },
  addrName: { fontSize: 14, fontWeight: '700', color: colors.text },
  addrDetail: { color: colors.textSecondary, fontSize: 13, marginTop: 4, lineHeight: 19 },
  addrChange: { color: colors.primary, fontSize: 12, marginTop: 8 },
  addrEmpty: { color: colors.muted, fontSize: 13 },
  pickerMask: { flex: 1, backgroundColor: 'rgba(15, 23, 42, 0.45)', justifyContent: 'flex-end' },
  picker: {
    backgroundColor: colors.card,
    borderTopLeftRadius: 20,
    borderTopRightRadius: 20,
    padding: 20,
    paddingBottom: 32,
  },
  pickerTitle: { fontSize: 16, fontWeight: '800', color: colors.text, textAlign: 'center', marginBottom: 10 },
  pickerItem: { paddingVertical: 12, borderBottomWidth: StyleSheet.hairlineWidth, borderBottomColor: colors.border },
});
