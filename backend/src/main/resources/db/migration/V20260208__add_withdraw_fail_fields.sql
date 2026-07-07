-- 添加提现打款失败相关字段
-- 执行时间: 2026-02-08
-- 功能: 支持线下打款失败后标注

ALTER TABLE `withdraw` ADD COLUMN `payment_fail_count` INT DEFAULT 0 COMMENT '打款失败次数' AFTER `remark`;
