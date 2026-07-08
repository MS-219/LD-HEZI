/**
 * 应用根组件（纯 React Native 实现，不依赖任何 Expo 专有 API）。
 *
 * 安卓入口（Expo）与鸿蒙入口（RNOH）都挂载本组件：
 * - 安卓：index.ts → registerRootComponent(App) → AppRoot
 * - 鸿蒙：index.harmony.ts → AppRegistry.registerComponent → AppRoot
 *
 * 底部 Tab：首页 / 设备 / 我的（小程序原有的“创作”Tab 为 AI 功能，按需求移除）。
 */
import React, { useState } from 'react';
import {
  Platform,
  Pressable,
  SafeAreaView,
  StatusBar,
  StyleSheet,
  Text,
  View,
} from 'react-native';
import { LoadingView } from './components/common';
import { Navigator } from './navigation';
import { SessionProvider, useSession } from './session';
import { colors } from './theme';

import AddressManageScreen from './screens/AddressManageScreen';
import AllPartnerDevicesScreen from './screens/AllPartnerDevicesScreen';
import CompleteProfileScreen from './screens/CompleteProfileScreen';
import DeviceDetailScreen from './screens/DeviceDetailScreen';
import DeviceScreen from './screens/DeviceScreen';
import EarningsDetailScreen from './screens/EarningsDetailScreen';
import EditPaymentScreen from './screens/EditPaymentScreen';
import ExchangeDetailScreen from './screens/ExchangeDetailScreen';
import ExchangeOrderDetailScreen from './screens/ExchangeOrderDetailScreen';
import ExchangeOrdersScreen from './screens/ExchangeOrdersScreen';
import ExchangeScreen from './screens/ExchangeScreen';
import FeedbackScreen from './screens/FeedbackScreen';
import HelpScreen from './screens/HelpScreen';
import HomeScreen from './screens/HomeScreen';
import InviteScreen from './screens/InviteScreen';
import MemberDevicesScreen from './screens/MemberDevicesScreen';
import MyScreen from './screens/MyScreen';
import NoticeDetailScreen from './screens/NoticeDetailScreen';
import PartnerDeviceDetailScreen from './screens/PartnerDeviceDetailScreen';
import PartnerDevicesScreen from './screens/PartnerDevicesScreen';
import WithdrawRecordScreen from './screens/WithdrawRecordScreen';
import WithdrawScreen from './screens/WithdrawScreen';

// 页面注册表（对应小程序 app.json pages，AI 相关页面已移除）
const screens = {
  'notice-detail': NoticeDetailScreen,
  'device-detail': DeviceDetailScreen,
  'complete-profile': CompleteProfileScreen,
  withdraw: WithdrawScreen,
  'withdraw-record': WithdrawRecordScreen,
  'earnings-detail': EarningsDetailScreen,
  'edit-payment': EditPaymentScreen,
  invite: InviteScreen,
  'partner-devices': PartnerDevicesScreen,
  'member-devices': MemberDevicesScreen,
  'all-partner-devices': AllPartnerDevicesScreen,
  'partner-device-detail': PartnerDeviceDetailScreen,
  help: HelpScreen,
  feedback: FeedbackScreen,
  exchange: ExchangeScreen,
  'exchange-detail': ExchangeDetailScreen,
  'exchange-orders': ExchangeOrdersScreen,
  'exchange-order-detail': ExchangeOrderDetailScreen,
  'address-manage': AddressManageScreen,
};

const tabs = [
  { key: 'home', label: '首页', icon: '🏠' },
  { key: 'device', label: '设备', icon: '📱' },
  { key: 'my', label: '我的', icon: '👤' },
];

function TabRoot({ tab }: { tab: string }) {
  // 三个 tab 页都保持挂载，切换不丢状态（与小程序 tabBar 行为一致）
  return (
    <View style={styles.tabHost}>
      <View style={[styles.tabPage, tab !== 'home' && styles.hidden]}>
        <HomeScreen />
      </View>
      <View style={[styles.tabPage, tab !== 'device' && styles.hidden]}>
        <DeviceScreen />
      </View>
      <View style={[styles.tabPage, tab !== 'my' && styles.hidden]}>
        <MyScreen />
      </View>
    </View>
  );
}

function AppShell() {
  const { booting } = useSession();
  const [tab, setTab] = useState('home');

  if (booting) {
    return (
      <SafeAreaView style={styles.app}>
        <LoadingView text="正在进入全球云智算" />
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView style={styles.app}>
      <StatusBar barStyle="dark-content" backgroundColor={colors.card} />
      <Navigator
        screens={screens}
        onSwitchTab={setTab}
        root={
          <View style={styles.root}>
            <View style={styles.rootContent}>
              <TabRoot tab={tab} />
            </View>
            <View style={styles.tabBar}>
              {tabs.map((item) => {
                const active = tab === item.key;
                return (
                  <Pressable key={item.key} style={styles.tabButton} onPress={() => setTab(item.key)}>
                    <View style={[styles.tabPill, active && styles.tabPillActive]}>
                      <Text style={styles.tabIcon}>{item.icon}</Text>
                      <Text style={[styles.tabLabel, active && styles.tabLabelActive]}>{item.label}</Text>
                    </View>
                  </Pressable>
                );
              })}
            </View>
          </View>
        }
      />
    </SafeAreaView>
  );
}

export default function AppRoot() {
  return (
    <SessionProvider>
      <AppShell />
    </SessionProvider>
  );
}

const styles = StyleSheet.create({
  app: {
    flex: 1,
    backgroundColor: colors.bg,
    // 安卓 / 鸿蒙上 SafeAreaView 不处理状态栏高度，手动留白
    paddingTop: Platform.OS === 'ios' ? 0 : StatusBar.currentHeight || 0,
  },
  root: { flex: 1 },
  rootContent: { flex: 1 },
  tabHost: { flex: 1 },
  tabPage: { flex: 1 },
  hidden: { display: 'none' },
  tabBar: {
    flexDirection: 'row',
    backgroundColor: colors.card,
    borderTopWidth: StyleSheet.hairlineWidth,
    borderTopColor: colors.border,
    paddingVertical: 8,
    paddingHorizontal: 12,
  },
  tabButton: { flex: 1, alignItems: 'center' },
  tabPill: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    paddingHorizontal: 16,
    paddingVertical: 8,
    borderRadius: 999,
  },
  tabPillActive: { backgroundColor: colors.navy },
  tabIcon: { fontSize: 16 },
  tabLabel: { fontSize: 12, color: colors.muted, fontWeight: '600' },
  tabLabelActive: { color: '#ffffff', fontWeight: '700' },
});
