-- 手机号作为短信登录账号后必须保持唯一。
-- 执行 ALTER 前先检查是否存在历史重复手机号：
SELECT phone, COUNT(*) AS duplicate_count
FROM app_user
WHERE phone IS NOT NULL AND phone <> ''
GROUP BY phone
HAVING COUNT(*) > 1;

-- 如果上面的查询有结果，请先由运营人员确认账号归属并完成数据合并，再执行：
ALTER TABLE app_user
    DROP INDEX idx_phone,
    ADD UNIQUE KEY uk_phone (phone);
