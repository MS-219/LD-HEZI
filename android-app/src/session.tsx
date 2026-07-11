/** App 登录会话：后台开户后的密码登录与短信验证码登录并存。 */
import React, { createContext, useCallback, useContext, useEffect, useMemo, useState } from 'react';
import { formatUrl, onTokenExpired, request } from './api';
import { getDeviceIdPrefix } from './platform';
import { getItem, getJSON, removeItem, setItem, setJSON } from './storage';

export interface UserInfo { id:number; nickname:string; avatarUrl:string; phone:string; quota:number; level:number; }
const emptyUser: UserInfo = { id:0, nickname:'', avatarUrl:'', phone:'', quota:0, level:0 };
interface LoginData { token:string; userId:number; nickname?:string; avatarUrl?:string; phone?:string; level?:number; mustChangePassword?:boolean; }
export interface Session {
  booting:boolean; isLoggedIn:boolean; mustChangePassword:boolean; userId:number; userInfo:UserInfo;
  sendSmsCode:(phone:string)=>Promise<number>;
  loginWithSms:(phone:string, code:string)=>Promise<void>;
  loginWithPassword:(phone:string, password:string)=>Promise<void>;
  changePassword:(oldPassword:string, newPassword:string)=>Promise<void>;
  logout:()=>Promise<void>; refreshUser:()=>Promise<void>; patchUser:(patch:Partial<UserInfo>)=>void;
}
const SessionContext = createContext<Session|null>(null);
export function useSession():Session { const value=useContext(SessionContext); if(!value) throw new Error('useSession 必须在 SessionProvider 内使用'); return value; }

async function ensureDeviceId(){ const existing=await getItem('deviceId'); if(existing) return existing; const id=`${getDeviceIdPrefix()}-${Date.now()}-${Math.random().toString(16).slice(2)}`; await setItem('deviceId',id); return id; }
const normalizePhone=(phone:string)=>phone.replace(/\s+/g,'').trim();

export function SessionProvider({children}:{children:React.ReactNode}) {
  const [booting,setBooting]=useState(true); const [userId,setUserId]=useState(0); const [userInfo,setUserInfo]=useState<UserInfo>(emptyUser);
  const [isLoggedIn,setIsLoggedIn]=useState(false); const [mustChangePassword,setMustChangePassword]=useState(false);

  const clearSession=useCallback(async()=>{ await Promise.all([removeItem('token'),removeItem('userId'),removeItem('userInfo'),removeItem('mustChangePassword')]); setIsLoggedIn(false); setMustChangePassword(false); setUserId(0); setUserInfo(emptyUser); },[]);
  const applyLogin=useCallback(async(data:LoginData, fallbackPhone='')=>{
    const info:UserInfo={ id:data.userId,nickname:data.nickname||'',avatarUrl:formatUrl(data.avatarUrl||''),phone:data.phone||fallbackPhone,quota:0,level:data.level||0 };
    const must=Boolean(data.mustChangePassword);
    await Promise.all([setItem('token',data.token),setItem('userId',String(data.userId)),setItem('lastLoginPhone',info.phone),setItem('mustChangePassword',must?'1':'0'),setJSON('userInfo',info)]);
    setUserId(data.userId); setUserInfo(info); setMustChangePassword(must); setIsLoggedIn(true);
  },[]);
  const refreshUser=useCallback(async()=>{ const uid=parseInt((await getItem('userId'))||'0',10); if(!uid) return; const res=await request<any>({url:`/api/user/info/${uid}`}); if(res.code===200&&res.data){ const d=res.data; const info={id:d.id,nickname:d.nickname||'',avatarUrl:formatUrl(d.avatarUrl||''),phone:d.phone||'',quota:d.quota||0,level:d.level||0}; setUserInfo(info); await setJSON('userInfo',info); } },[]);
  const sendSmsCode=useCallback(async(phone:string)=>{ const res=await request<{cooldown?:number}>({url:'/api/user/sms/send',method:'POST',data:{phone:normalizePhone(phone)}}); if(res.code!==200) throw new Error(res.msg||'验证码发送失败'); return res.data?.cooldown||60; },[]);
  const loginWithSms=useCallback(async(phone:string,code:string)=>{ const normalized=normalizePhone(phone); const res=await request<LoginData>({url:'/api/user/sms/login',method:'POST',data:{phone:normalized,code:code.trim(),deviceId:await ensureDeviceId()}}); if(res.code!==200||!res.data) throw new Error(res.msg||'登录失败'); await applyLogin(res.data,normalized); },[applyLogin]);
  const loginWithPassword=useCallback(async(phone:string,password:string)=>{ const normalized=normalizePhone(phone); const res=await request<LoginData>({url:'/api/user/account/password/login',method:'POST',data:{phone:normalized,password}}); if(res.code!==200||!res.data) throw new Error(res.msg||'登录失败'); await applyLogin(res.data,normalized); },[applyLogin]);
  const changePassword=useCallback(async(oldPassword:string,newPassword:string)=>{ const res=await request<LoginData>({url:'/api/user/account/password/change',method:'POST',data:{oldPassword,newPassword}}); if(res.code!==200||!res.data) throw new Error(res.msg||'密码修改失败'); await applyLogin(res.data); refreshUser().catch(()=>undefined); },[applyLogin,refreshUser]);
  const logout=useCallback(async()=>{ try{ await request({url:'/api/user/account/logout',method:'POST'}); }catch{} await clearSession(); },[clearSession]);
  const patchUser=useCallback((patch:Partial<UserInfo>)=>{ setUserInfo(prev=>{ const next={...prev,...patch}; setJSON('userInfo',next).catch(()=>undefined); return next; }); },[]);

  useEffect(()=>onTokenExpired(()=>{ clearSession().catch(()=>undefined); }),[clearSession]);
  useEffect(()=>{ (async()=>{ try{ const [token,storedId,storedInfo]=await Promise.all([getItem('token'),getItem('userId'),getJSON<UserInfo>('userInfo')]); if(token&&storedId){ setUserId(parseInt(storedId,10)||0); setUserInfo(storedInfo||emptyUser); const res=await request<LoginData>({url:'/api/user/account/session'}); if(res.code===200&&res.data){ await applyLogin(res.data,storedInfo?.phone||''); refreshUser().catch(()=>undefined); } else await clearSession(); } }catch{ await clearSession(); }finally{ setBooting(false); } })(); },[applyLogin,clearSession,refreshUser]);
  const value=useMemo<Session>(()=>({booting,isLoggedIn,mustChangePassword,userId,userInfo,sendSmsCode,loginWithSms,loginWithPassword,changePassword,logout,refreshUser,patchUser}),[booting,isLoggedIn,mustChangePassword,userId,userInfo,sendSmsCode,loginWithSms,loginWithPassword,changePassword,logout,refreshUser,patchUser]);
  return <SessionContext.Provider value={value}>{children}</SessionContext.Provider>;
}
