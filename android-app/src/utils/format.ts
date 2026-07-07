/**
 * 展示格式化工具（对应小程序各页面里的 formatTime / formatDate 等）
 */

/** '2025-01-02T10:00:00' → '2025-01-02 10:00:00'，可截断长度 */
export function formatTime(timeStr?: string, length = 19): string {
  if (!timeStr) return '';
  return timeStr.replace('T', ' ').substring(0, length);
}

/** 仅保留日期部分 */
export function formatDate(dateStr?: string): string {
  if (!dateStr) return '--';
  if (dateStr.includes('T')) return dateStr.split('T')[0];
  if (dateStr.includes(' ')) return dateStr.split(' ')[0];
  return dateStr;
}

export function formatMoney(value?: string | number): string {
  const n = parseFloat(String(value ?? 0));
  return Number.isFinite(n) ? n.toFixed(2) : '0.00';
}

/** 银行卡号脱敏：6222 **** **** 1234 */
export function maskCardNo(cardNo?: string): string {
  if (!cardNo || cardNo.length < 8) return cardNo || '';
  return cardNo.substring(0, 4) + ' **** **** ' + cardNo.substring(cardNo.length - 4);
}

/** 算力值大数显示：12000 → 1.2万 */
export function formatHashrate(value: number): string {
  if (value >= 10000) return (value / 10000).toFixed(1) + '万';
  return String(value);
}

/** 用户 ID 补零展示：42 → '000042' */
export function displayUserId(id?: number | string): string {
  return String(id ?? 0).padStart(6, '0');
}
