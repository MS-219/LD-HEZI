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
  ImageBackground,
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
import UpdateGate from './components/UpdateGate';
import ChangePasswordScreen from './screens/ChangePasswordScreen';
import { colors } from './theme';

import AllPartnerDevicesScreen from './screens/AllPartnerDevicesScreen';
import CompleteProfileScreen from './screens/CompleteProfileScreen';
import DeviceDetailScreen from './screens/DeviceDetailScreen';
import DeviceScreen from './screens/DeviceScreen';
import EarningsDetailScreen from './screens/EarningsDetailScreen';
import EditPaymentScreen from './screens/EditPaymentScreen';
import FeedbackScreen from './screens/FeedbackScreen';
import HelpScreen from './screens/HelpScreen';
import HomeScreen from './screens/HomeScreen';
import InviteScreen from './screens/InviteScreen';
import MemberDevicesScreen from './screens/MemberDevicesScreen';
import MyScreen from './screens/MyScreen';
import NoticeDetailScreen from './screens/NoticeDetailScreen';
import PartnerDeviceDetailScreen from './screens/PartnerDeviceDetailScreen';
import PartnerDevicesScreen from './screens/PartnerDevicesScreen';
import PhoneLoginScreen from './screens/PhoneLoginScreen';
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
};

const tabs = [
  { key: 'home', label: '首页' },
  { key: 'device', label: '设备' },
  { key: 'my', label: '我的' },
];

function TabIcon({ name, active }: { name: string; active: boolean }) {
  const color = active ? colors.primary : colors.muted;
  if (name === 'home') {
    return <View style={[styles.homeIcon, { borderColor: color }]}><View style={[styles.homeDoor, { backgroundColor: color }]} /></View>;
  }
  if (name === 'device') {
    return <View style={[styles.deviceIcon, { borderColor: color }]}><View style={[styles.deviceDot, { backgroundColor: color }]} /></View>;
  }
  return <View style={styles.userIcon}><View style={[styles.userHead, { borderColor: color }]} /><View style={[styles.userBody, { borderColor: color }]} /></View>;
}

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
  const { booting, isLoggedIn, mustChangePassword } = useSession();
  const [tab, setTab] = useState('home');

  if (booting) {
    return (
      <SafeAreaView style={styles.app}>
        <LoadingView text="正在进入全球云智算" />
      </SafeAreaView>
    );
  }

  if (!isLoggedIn) {
    return (
      <SafeAreaView style={styles.app}>
        <StatusBar barStyle="dark-content" translucent backgroundColor="transparent" />
        <PhoneLoginScreen />
      </SafeAreaView>
    );
  }

  if (mustChangePassword) {
    return (
      <SafeAreaView style={styles.app}>
        <StatusBar barStyle="dark-content" translucent backgroundColor="transparent" />
        <ChangePasswordScreen />
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView style={styles.app}>
      <StatusBar barStyle="dark-content" translucent backgroundColor="transparent" />
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
                    <View style={styles.tabPill}>
                      <View style={[styles.tabIconWrap, active && styles.tabIconWrapActive]}>
                        <TabIcon name={item.key} active={active} />
                      </View>
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
    <ImageBackground source={require('../assets/app-gradient.png')} resizeMode="stretch" style={styles.gradient}>
      <UpdateGate>
        <SessionProvider>
          <AppShell />
        </SessionProvider>
      </UpdateGate>
    </ImageBackground>
  );
}

const styles = StyleSheet.create({
  gradient: { flex: 1 },
  app: {
    flex: 1,
    backgroundColor: 'transparent',
    paddingTop: Platform.OS === 'ios' ? 0 : StatusBar.currentHeight || 0,
  },
  root: { flex: 1 },
  rootContent: { flex: 1 },
  tabHost: { flex: 1 },
  tabPage: { flex: 1 },
  hidden: { display: 'none' },
  tabBar: {
    flexDirection: 'row',
    backgroundColor: 'rgba(255,255,255,0.96)',
    borderTopWidth: StyleSheet.hairlineWidth,
    borderTopColor: colors.border,
    paddingTop: 7,
    paddingBottom: Platform.OS === 'ios' ? 6 : 9,
    paddingHorizontal: 16,
    shadowColor: '#315B7E',
    shadowOffset: { width: 0, height: -5 },
    shadowOpacity: 0.07,
    shadowRadius: 12,
    elevation: 9,
  },
  tabButton: { flex: 1, alignItems: 'center', minHeight: 54, justifyContent: 'center' },
  tabPill: { alignItems: 'center', justifyContent: 'center', gap: 3 },
  tabIconWrap: { width: 30, height: 27, alignItems: 'center', justifyContent: 'center', borderRadius: 10 },
  tabIconWrapActive: { backgroundColor: colors.primarySoft },
  tabLabel: { fontSize: 11, color: colors.muted, fontWeight: '700' },
  tabLabelActive: { color: colors.primary, fontWeight: '900' },
  homeIcon: { width: 16, height: 14, borderWidth: 2, borderRadius: 4, marginTop: 3, alignItems: 'center', justifyContent: 'flex-end' },
  homeDoor: { width: 4, height: 6, borderTopLeftRadius: 2, borderTopRightRadius: 2 },
  deviceIcon: { width: 13, height: 19, borderWidth: 2, borderRadius: 4, alignItems: 'center', justifyContent: 'flex-end', paddingBottom: 2 },
  deviceDot: { width: 3, height: 3, borderRadius: 2 },
  userIcon: { width: 19, height: 20, alignItems: 'center' },
  userHead: { width: 8, height: 8, borderRadius: 4, borderWidth: 2 },
  userBody: { width: 17, height: 9, borderTopLeftRadius: 9, borderTopRightRadius: 9, borderWidth: 2, borderBottomWidth: 0, marginTop: 3 },
});
