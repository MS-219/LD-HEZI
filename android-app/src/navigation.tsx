/**
 * 轻量级栈式导航。
 *
 * 不依赖 react-navigation（避免额外原生依赖），纯 JS 实现，
 * 同一套代码可跑在安卓（Expo）与鸿蒙（RNOH）上。
 * 语义对齐小程序：navigate ≈ wx.navigateTo，back ≈ wx.navigateBack，
 * switchTab ≈ wx.switchTab。
 */
import React, {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useState,
} from 'react';
import { BackHandler, StyleSheet, View } from 'react-native';

export interface Route {
  name: string;
  params?: Record<string, any>;
}

export interface Navigation {
  navigate: (name: string, params?: Record<string, any>) => void;
  back: () => void;
  /** 回到根页面并切换底部 tab（home / device / my） */
  switchTab: (tab: string) => void;
  /** 用新页面替换当前页面 */
  replace: (name: string, params?: Record<string, any>) => void;
}

const NavigationContext = createContext<Navigation | null>(null);
const RouteContext = createContext<Route>({ name: 'tabs' });

export function useNavigation(): Navigation {
  const nav = useContext(NavigationContext);
  if (!nav) throw new Error('useNavigation 必须在 NavigationProvider 内使用');
  return nav;
}

export function useRouteParams<T = Record<string, any>>(): T {
  return (useContext(RouteContext).params || {}) as T;
}

export type ScreenComponent = React.ComponentType<any>;

interface NavigatorProps {
  /** 页面注册表：name → 组件 */
  screens: Record<string, ScreenComponent>;
  /** 根页面（含底部 tab），始终位于栈底 */
  root: React.ReactElement;
  /** 当前 tab 与切换回调，由根组件管理 */
  onSwitchTab: (tab: string) => void;
}

export function Navigator({ screens, root, onSwitchTab }: NavigatorProps) {
  const [stack, setStack] = useState<Route[]>([]);

  const navigate = useCallback((name: string, params?: Record<string, any>) => {
    setStack((prev) => [...prev, { name, params }]);
  }, []);

  const back = useCallback(() => {
    setStack((prev) => (prev.length > 0 ? prev.slice(0, -1) : prev));
  }, []);

  const replace = useCallback((name: string, params?: Record<string, any>) => {
    setStack((prev) =>
      prev.length > 0 ? [...prev.slice(0, -1), { name, params }] : [{ name, params }]
    );
  }, []);

  const switchTab = useCallback(
    (tab: string) => {
      setStack([]);
      onSwitchTab(tab);
    },
    [onSwitchTab]
  );

  // 安卓 / 鸿蒙实体返回键：先出栈，栈空则交给系统（退出应用）
  useEffect(() => {
    const sub = BackHandler.addEventListener('hardwareBackPress', () => {
      if (stack.length > 0) {
        back();
        return true;
      }
      return false;
    });
    return () => sub.remove();
  }, [stack.length, back]);

  const nav = useMemo<Navigation>(
    () => ({ navigate, back, switchTab, replace }),
    [navigate, back, switchTab, replace]
  );

  return (
    <NavigationContext.Provider value={nav}>
      <View style={styles.host}>
        {/* 根页面常驻，返回时不需要重新加载 */}
        <View style={[styles.page, stack.length > 0 && styles.hidden]}>{root}</View>
        {stack.map((route, index) => {
          const Screen = screens[route.name];
          const isTop = index === stack.length - 1;
          if (!Screen) return null;
          return (
            <View
              key={`${route.name}-${index}`}
              style={[styles.page, styles.overlay, !isTop && styles.hidden]}
            >
              <RouteContext.Provider value={route}>
                <Screen />
              </RouteContext.Provider>
            </View>
          );
        })}
      </View>
    </NavigationContext.Provider>
  );
}

const styles = StyleSheet.create({
  host: { flex: 1 },
  page: { flex: 1 },
  overlay: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    backgroundColor: '#f5f7fb',
  },
  hidden: { display: 'none' },
});
