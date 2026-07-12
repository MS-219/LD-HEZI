import { API_BASE, VERSION_CODE } from './config';
import { request } from './api';
import { isHarmony } from './platform';

export interface AppReleaseInfo { updateAvailable:boolean; forceUpdate:boolean; versionName:string; versionCode:number; releaseNotes:string; fileSize:number; sha256:string; downloadUrl:string; }
export async function checkLatestVersion():Promise<AppReleaseInfo|null>{ const res=await request<AppReleaseInfo>({url:'/api/app/version/latest',data:{platform:'android',currentVersionCode:VERSION_CODE}}); if(res.code!==200||!res.data) throw new Error(res.msg||'版本检查失败'); return res.data.updateAvailable?res.data:null; }
export function releaseDownloadUrl(path:string){return path.startsWith('http')?path:`${API_BASE}${path}`;}

export async function downloadAndVerifyApk(release:AppReleaseInfo,onProgress:(value:number)=>void):Promise<string>{
  if(isHarmony) throw new Error('当前鸿蒙环境不支持直接调用 APK 安装器，请使用兼容 Android 应用模式更新');
  const FileSystem=await import('expo-file-system/legacy');
  const {sha256}=await import('@noble/hashes/sha2.js');
  const {fromByteArray,toByteArray}=await import('base64-js');
  void fromByteArray; // 确保 Metro 正确打包 CommonJS/ESM 互操作。
  const target=`${FileSystem.cacheDirectory}qqyzs-${release.versionCode}.apk`;
  await FileSystem.deleteAsync(target,{idempotent:true});
  const task=FileSystem.createDownloadResumable(releaseDownloadUrl(release.downloadUrl),target,{},p=>{if(p.totalBytesExpectedToWrite>0)onProgress(Math.min(.9,p.totalBytesWritten/p.totalBytesExpectedToWrite*.9));});
  const result=await task.downloadAsync(); if(!result?.uri) throw new Error('APK 下载失败');
  const info=await FileSystem.getInfoAsync(result.uri); if(!info.exists||!('size' in info)) throw new Error('下载文件不存在');
  const hash=sha256.create(); const chunk=1024*1024; const size=info.size||0;
  for(let position=0;position<size;position+=chunk){const encoded=await FileSystem.readAsStringAsync(result.uri,{encoding:FileSystem.EncodingType.Base64,position,length:Math.min(chunk,size-position)});hash.update(toByteArray(encoded));onProgress(.9+Math.min(1,(position+chunk)/Math.max(size,1))*.1);}
  const actual=Array.from(hash.digest()).map(v=>v.toString(16).padStart(2,'0')).join('');
  if(actual.toLowerCase()!==release.sha256.toLowerCase()){await FileSystem.deleteAsync(result.uri,{idempotent:true});throw new Error('APK 完整性校验失败，请重新下载');}
  return result.uri;
}

export async function launchApkInstaller(fileUri:string):Promise<void>{
  const FileSystem=await import('expo-file-system/legacy');
  const IntentLauncher=await import('expo-intent-launcher');
  const contentUri=await FileSystem.getContentUriAsync(fileUri);
  const options={data:contentUri,type:'application/vnd.android.package-archive',flags:0x10000001};
  try{
    // INSTALL_PACKAGE 会直接交给系统软件包安装器，避免弹出“使用什么打开”的普通应用选择器。
    await IntentLauncher.startActivityAsync('android.intent.action.INSTALL_PACKAGE',options);
  }catch(installError){
    try{
      // 少数厂商系统不响应 INSTALL_PACKAGE，回退到标准 APK VIEW Intent。
      await IntentLauncher.startActivityAsync('android.intent.action.VIEW',options);
    }catch{
      await IntentLauncher.startActivityAsync('android.settings.MANAGE_UNKNOWN_APP_SOURCES',{data:'package:com.quanqiuyun.zhisuan'});
      throw new Error('请允许“安装未知应用”，返回本页面后再次点击“重新打开安装器”');
    }
  }
}
