/**
 * 聚芯算力小程序全局配置
 * 域名: juxinsuanli.cn
 */

// API 基础地址
// 开发环境
// export const API_BASE = 'http://localhost:8080';

// 生产环境 - 使用主域名（证书支持）
export const API_BASE = 'https://juxinsuanli.cn';

// 备用 - 使用 IP（不需要 HTTPS）
// export const API_BASE = 'http://123.57.226.180:8080';

// 文件上传地址
export const UPLOAD_URL = `${API_BASE}/api/upload/image`;

// 版本号
export const VERSION = '1.0.0';

// 应用名称
export const APP_NAME = '聚芯算力';

// 默认配置
export const config = {
    // 心跳间隔（毫秒）
    heartbeatInterval: 60000,

    // 请求超时时间（毫秒）
    requestTimeout: 10000,

    // 分页大小
    pageSize: 10,

    // 公告显示数量
    noticeLimit: 5
};

export default {
    API_BASE,
    UPLOAD_URL,
    VERSION,
    APP_NAME,
    config
};
