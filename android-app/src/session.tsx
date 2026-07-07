/**
 * 登录会话管理。
 *
 * App 端没有 wx.login，使用设备侧生成的稳定 deviceId 走 /api/user/appLogin
 * 登录/注册（后端用 "app_" + deviceId 作为 openid，同一设备重复登录得到同一账号）。
 */
import React, {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useState,
} from 'react';
import { formatUrl, onTokenExpired, request } from './api';
import { getItem, getJSON, removeItem, setItem, setJSON } from './storage';

export interface UserInfo {
  id: number;
  nickname: string;
  avatarUrl: string;
  phone: string;
  quota: number;
  level: number;
}

const emptyUser: UserInfo = { id: 0, nickname: '', avatarUrl: '', phone: '', quota: 0, level: 0 };

export interface Session {
  booting: boolean;
  isLoggedIn: boolean;
  userId: number;
  userInfo: UserInfo;
  /** 登录（可携带邀请码） */
  login: (inviteCode?: string) => Promise<void>;
  logout: () => Promise<void>;
  /** 从服务端刷新用户信息 */
  refreshUser: () => Promise<void>;
  /** 本地更新用户信息（改昵称/头像后同步 UI） */
  patchUser: (patch: Partial<UserInfo>) => void;
}

const SessionContext = createContext<Session | null>(null);

export function useSession(): Session {
  const session = useContext(SessionContext);
  if (!session) throw new Error('useSession 必须在 SessionProvider 内使用');
  return session;
}

async function ensureDeviceId(): Promise<string> {
  const existing = await getItem('deviceId');
  if (existing) return existing;
  const id = `android-${Date.now()}-${Math.random().toString(16).slice(2)}`;
  await setItem('deviceId', id);
  return id;
}

export function SessionProvider({ children }: { children: React.ReactNode }) {
  const [booting, setBooting] = useState(true);
  const [userId, setUserId] = useState(0);
  const [userInfo, setUserInfo] = useState<UserInfo>(emptyUser);
  const [isLoggedIn, setIsLoggedIn] = useState(false);

  const refreshUser = useCallback(async () => {
    const uid = parseInt((await getItem('userId')) || '0', 10);
    if (!uid) return;
    const res = await request<any>({ url: `/api/user/info/${uid}` });
    if (res.code === 200 && res.data) {
      const data = res.data;
      const info: UserInfo = {
        id: data.id,
        nickname: data.nickname || '',
        avatarUrl: formatUrl(data.avatarUrl || ''),
        phone: data.phone || '',
        quota: data.quota || 0,
        level: data.level || 0,
      };
      setUserInfo(info);
      await setJSON('userInfo', info);
    }
  }, []);

  const login = useCallback(
    async (inviteCode?: string) => {
      const deviceId = await ensureDeviceId();
      const pendingInviteCode = inviteCode || (await getItem('pendingInviteCode')) || '';
      const res = await request<any>({
        url: '/api/user/appLogin',
        method: 'POST',
        data: {
          deviceId,
          nickname: '',
          avatarUrl: '',
          inviteCode: pendingInviteCode,
        },
      });
      if (res.code !== 200 || !res.data) {
        throw new Error(res.msg || '登录失败');
      }
      const data = res.data;
      await Promise.all([
        setItem('token', data.token),
        setItem('userId', String(data.userId)),
        removeItem('pendingInviteCode'),
      ]);
      setUserId(data.userId);
      setIsLoggedIn(true);
      setUserInfo({
        id: data.userId,
        nickname: data.nickname || '',
        avatarUrl: formatUrl(data.avatarUrl || ''),
        phone: '',
        quota: 0,
        level: data.level || 0,
      });
      // 拉取完整信息（含手机号/额度）
      refreshUser().catch(() => undefined);
    },
    [refreshUser]
  );

  const logout = useCallback(async () => {
    await Promise.all([removeItem('token'), removeItem('userId'), removeItem('userInfo')]);
    setIsLoggedIn(false);
    setUserId(0);
    setUserInfo(emptyUser);
  }, []);

  const patchUser = useCallback((patch: Partial<UserInfo>) => {
    setUserInfo((prev) => {
      const next = { ...prev, ...patch };
      setJSON('userInfo', next);
      return next;
    });
  }, []);

  // 启动：先用本地缓存快速恢复，再静默校验/自动登录
  useEffect(() => {
    (async () => {
      try {
        const [token, uid, cached] = await Promise.all([
          getItem('token'),
          getItem('userId'),
          getJSON<UserInfo>('userInfo'),
        ]);
        if (token && uid) {
          setUserId(parseInt(uid, 10));
          setIsLoggedIn(true);
          if (cached) setUserInfo(cached);
          refreshUser().catch(() => undefined);
        } else {
          await login();
        }
      } catch {
        // 首次自动登录失败（如无网络），保持未登录，由“我的”页提供重试入口
      } finally {
        setBooting(false);
      }
    })();
  }, [login, refreshUser]);

  // 全局 token 过期 → 同步登出状态
  useEffect(() => {
    return onTokenExpired(() => {
      setIsLoggedIn(false);
      setUserId(0);
      setUserInfo(emptyUser);
    });
  }, []);

  const value = useMemo<Session>(
    () => ({ booting, isLoggedIn, userId, userInfo, login, logout, refreshUser, patchUser }),
    [booting, isLoggedIn, userId, userInfo, login, logout, refreshUser, patchUser]
  );

  return <SessionContext.Provider value={value}>{children}</SessionContext.Provider>;
}
