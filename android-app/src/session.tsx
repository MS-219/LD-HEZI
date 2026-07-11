/**
 * 登录会话管理。
 *
 * App 使用手机号 + 阿里云短信验证码登录。登录请求仍携带设备侧生成的稳定 deviceId，
 * 后端可在首次升级时把旧版匿名设备账号绑定到手机号，保留历史设备和收益数据。
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
import { getDeviceIdPrefix } from './platform';
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
  /** 发送短信验证码，返回倒计时秒数。 */
  sendSmsCode: (phone: string) => Promise<number>;
  /** 手机号验证码登录（可携带邀请码）。 */
  login: (phone: string, code: string, inviteCode?: string) => Promise<void>;
  logout: () => Promise<void>;
  /** 从服务端刷新用户信息。 */
  refreshUser: () => Promise<void>;
  /** 本地更新用户信息（改昵称/头像后同步 UI）。 */
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
  const id = `${getDeviceIdPrefix()}-${Date.now()}-${Math.random().toString(16).slice(2)}`;
  await setItem('deviceId', id);
  return id;
}

function normalizePhone(phone: string): string {
  return phone.replace(/\s+/g, '').trim();
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

  const sendSmsCode = useCallback(async (phone: string) => {
    const normalized = normalizePhone(phone);
    const res = await request<{ cooldown?: number }>({
      url: '/api/user/sms/send',
      method: 'POST',
      data: { phone: normalized },
    });
    if (res.code !== 200) {
      throw new Error(res.msg || '验证码发送失败');
    }
    return res.data?.cooldown || 60;
  }, []);

  const login = useCallback(
    async (phone: string, code: string, inviteCode?: string) => {
      const normalized = normalizePhone(phone);
      const deviceId = await ensureDeviceId();
      const pendingInviteCode = inviteCode || (await getItem('pendingInviteCode')) || '';
      const res = await request<any>({
        url: '/api/user/sms/login',
        method: 'POST',
        data: {
          phone: normalized,
          code: code.trim(),
          deviceId,
          inviteCode: pendingInviteCode,
        },
      });
      if (res.code !== 200 || !res.data) {
        throw new Error(res.msg || '登录失败');
      }
      const data = res.data;
      const info: UserInfo = {
        id: data.userId,
        nickname: data.nickname || '',
        avatarUrl: formatUrl(data.avatarUrl || ''),
        phone: data.phone || normalized,
        quota: 0,
        level: data.level || 0,
      };
      await Promise.all([
        setItem('token', data.token),
        setItem('userId', String(data.userId)),
        setItem('lastLoginPhone', normalized),
        setJSON('userInfo', info),
        removeItem('pendingInviteCode'),
      ]);
      setUserId(data.userId);
      setIsLoggedIn(true);
      setUserInfo(info);
      // 拉取完整信息（含额度等）。
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

  // 启动时只恢复已有登录态；没有 token 时展示短信登录页，不再匿名自动注册。
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
        }
      } finally {
        setBooting(false);
      }
    })();
  }, [refreshUser]);

  // 全局 token 过期 → 同步登出状态。
  useEffect(() => {
    return onTokenExpired(() => {
      setIsLoggedIn(false);
      setUserId(0);
      setUserInfo(emptyUser);
    });
  }, []);

  const value = useMemo<Session>(
    () => ({
      booting,
      isLoggedIn,
      userId,
      userInfo,
      sendSmsCode,
      login,
      logout,
      refreshUser,
      patchUser,
    }),
    [booting, isLoggedIn, userId, userInfo, sendSmsCode, login, logout, refreshUser, patchUser]
  );

  return <SessionContext.Provider value={value}>{children}</SessionContext.Provider>;
}
