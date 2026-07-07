/**
 * 统一请求工具（对应小程序 utils/request.ts）
 *
 * - 自动携带 Bearer token
 * - 401 / 登录过期消息 → 清除登录态并广播，由页面自行展示登出 UI
 * - 返回后端的 { code, msg, data } 原始结构，页面按 code === 200 处理
 */
import { API_BASE, UPLOAD_URL, config } from './config';
import { getItem, removeItem } from './storage';

export interface ApiResult<T = any> {
  code: number;
  msg?: string;
  data?: T;
}

interface RequestOptions {
  url: string;
  method?: 'GET' | 'POST' | 'PUT' | 'DELETE';
  data?: any;
}

type TokenExpiredListener = () => void;
const tokenExpiredListeners = new Set<TokenExpiredListener>();

export function onTokenExpired(listener: TokenExpiredListener): () => void {
  tokenExpiredListeners.add(listener);
  return () => tokenExpiredListeners.delete(listener);
}

export function isTokenExpired(res: ApiResult): boolean {
  if (!res) return false;
  const { code, msg } = res;
  // 仅 401 才判为 token 过期，403 是权限不足不应清除登录态
  if (code === 401) return true;
  if (msg && typeof msg === 'string') {
    if (
      (msg.includes('登录') && (msg.includes('过期') || msg.includes('失效'))) ||
      msg === '请重新登录' ||
      msg.includes('token已过期') ||
      msg.includes('Token已过期')
    ) {
      return true;
    }
  }
  return false;
}

export async function handleTokenExpired(): Promise<void> {
  await Promise.all([
    removeItem('token'),
    removeItem('userId'),
    removeItem('userInfo'),
  ]);
  tokenExpiredListeners.forEach((fn) => fn());
}

function buildQuery(data: Record<string, any>): string {
  const parts = Object.entries(data)
    .filter(([, v]) => v !== undefined && v !== null && v !== '')
    .map(([k, v]) => `${encodeURIComponent(k)}=${encodeURIComponent(String(v))}`);
  return parts.length ? `?${parts.join('&')}` : '';
}

export async function request<T = any>(options: RequestOptions): Promise<ApiResult<T>> {
  const token = (await getItem('token')) || '';
  const method = options.method || 'GET';

  let url = options.url.startsWith('http') ? options.url : `${API_BASE}${options.url}`;
  const init: RequestInit = {
    method,
    headers: {
      'Content-Type': 'application/json',
      ...(token ? { Authorization: `Bearer ${token}` } : {}),
    },
  };

  if (options.data) {
    if (method === 'GET' || method === 'DELETE') {
      url += url.includes('?')
        ? `&${buildQuery(options.data).slice(1)}`
        : buildQuery(options.data);
    } else {
      init.body = JSON.stringify(options.data);
    }
  }

  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), config.requestTimeout);
  init.signal = controller.signal;

  let json: ApiResult<T>;
  try {
    const response = await fetch(url, init);
    json = (await response.json()) as ApiResult<T>;
  } catch (err) {
    throw new Error('网络错误');
  } finally {
    clearTimeout(timer);
  }

  if (isTokenExpired(json)) {
    await handleTokenExpired();
    throw Object.assign(new Error('登录已过期'), { code: 401 });
  }
  return json;
}

/**
 * 上传图片（对应 wx.uploadFile → /api/upload/image）
 * @param uri 本地文件 uri
 * @returns 服务端返回的图片 url
 */
export async function uploadImage(uri: string): Promise<string> {
  const token = (await getItem('token')) || '';
  const name = uri.split('/').pop() || `image-${Date.now()}.jpg`;
  const ext = name.includes('.') ? name.split('.').pop() : 'jpg';

  const form = new FormData();
  form.append('file', {
    uri,
    name,
    type: `image/${ext === 'png' ? 'png' : 'jpeg'}`,
  } as any);

  const response = await fetch(UPLOAD_URL, {
    method: 'POST',
    headers: {
      ...(token ? { Authorization: `Bearer ${token}` } : {}),
    },
    body: form,
  });
  const json = (await response.json()) as ApiResult<{ url: string }>;
  if (json.code === 200 && json.data && json.data.url) {
    return json.data.url;
  }
  throw new Error(json.msg || '上传失败');
}

/**
 * 统一把历史上传地址收口到主域名，并强制 HTTPS（对应小程序 formatUrl）
 */
export function formatUrl(url?: string): string {
  if (!url) return '';
  let fullUrl = url;
  if (url.includes('/uploads/')) {
    const idx = url.indexOf('/uploads/');
    fullUrl = API_BASE + url.substring(idx);
  }
  // 历史数据可能带旧域名，统一替换到当前 API 域名并升级 HTTPS
  if (fullUrl.includes('//juxinsuanli.cn')) {
    fullUrl = API_BASE + fullUrl.substring(fullUrl.indexOf('juxinsuanli.cn') + 'juxinsuanli.cn'.length);
  }
  if (fullUrl.startsWith('http://hz.shandongliandong.com')) {
    fullUrl = fullUrl.replace('http://', 'https://');
  }
  if (API_BASE.startsWith('https') && fullUrl.startsWith('http://')) {
    fullUrl = fullUrl.replace('http://', 'https://');
  }
  return fullUrl;
}
