-- ============================================================
-- 全球云智算（LD-HEZI）数据库初始化脚本
-- 库名: ldhezi  字符集: utf8mb4
-- 依据 backend/src/main/java/com/ldai/entity/ 下 26 个实体类生成
-- (MyBatis-Plus 驼峰字段 -> 下划线列名)
--
-- 用法:
--   docker exec -i qqyzs-mysql mysql -uldhezi -pldhezi ldhezi < deploy/db-init.sql
--
-- ⚠️ 初始管理员: admin / admin123 —— 部署后立即在后台改密码！
-- ============================================================

SET NAMES utf8mb4;

-- 后台管理员
CREATE TABLE IF NOT EXISTS `sys_user` (
  `id` BIGINT NOT NULL AUTO_INCREMENT,
  `username` VARCHAR(64) NOT NULL,
  `password` VARCHAR(128) NOT NULL,
  `nickname` VARCHAR(64) DEFAULT NULL,
  `role` VARCHAR(32) DEFAULT 'admin' COMMENT 'admin=超级管理员, factory=工厂',
  `create_time` DATETIME DEFAULT CURRENT_TIMESTAMP,
  PRIMARY KEY (`id`),
  UNIQUE KEY `uk_username` (`username`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci COMMENT='后台管理员';

-- 系统配置（键值）
CREATE TABLE IF NOT EXISTS `system_config` (
  `id` BIGINT NOT NULL AUTO_INCREMENT,
  `config_key` VARCHAR(128) NOT NULL,
  `config_value` TEXT,
  `description` VARCHAR(255) DEFAULT NULL,
  `update_time` DATETIME DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  PRIMARY KEY (`id`),
  UNIQUE KEY `uk_config_key` (`config_key`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci COMMENT='系统配置';

-- 用户（App/小程序），主键由业务生成（IdType.INPUT）
CREATE TABLE IF NOT EXISTS `app_user` (
  `id` BIGINT NOT NULL,
  `openid` VARCHAR(128) DEFAULT NULL,
  `nickname` VARCHAR(64) DEFAULT NULL,
  `avatar_url` VARCHAR(512) DEFAULT NULL,
  `phone` VARCHAR(32) DEFAULT NULL,
  `balance` DECIMAL(12,2) DEFAULT 0.00,
  `quota` INT DEFAULT 0,
  `inviter_id` BIGINT DEFAULT NULL,
  `level` INT DEFAULT 0,
  `level_manual` TINYINT(1) DEFAULT 0,
  `wx_qr_code` VARCHAR(512) DEFAULT NULL,
  `ali_qr_code` VARCHAR(512) DEFAULT NULL,
  `bank_name` VARCHAR(64) DEFAULT NULL,
  `bank_card_no` VARCHAR(64) DEFAULT NULL,
  `bank_holder_name` VARCHAR(64) DEFAULT NULL,
  `id_card` VARCHAR(32) DEFAULT NULL,
  `id_card_front` VARCHAR(512) DEFAULT NULL,
  `id_card_back` VARCHAR(512) DEFAULT NULL,
  `alipay_account` VARCHAR(128) DEFAULT NULL,
  `withdraw_disabled` TINYINT(1) DEFAULT 0,
  `user_type` VARCHAR(16) DEFAULT 'personal',
  `remark` VARCHAR(512) DEFAULT NULL,
  `password_hash` VARCHAR(100) DEFAULT NULL,
  `must_change_password` TINYINT(1) NOT NULL DEFAULT 1,
  `account_enabled` TINYINT(1) NOT NULL DEFAULT 1,
  `session_key` VARCHAR(64) DEFAULT NULL,
  `login_fail_count` INT NOT NULL DEFAULT 0,
  `locked_until` DATETIME DEFAULT NULL,
  `password_updated_at` DATETIME DEFAULT NULL,
  `last_login_at` DATETIME DEFAULT NULL,
  `create_time` DATETIME DEFAULT CURRENT_TIMESTAMP,
  `merchant_id` BIGINT DEFAULT NULL,
  `external_user_id` VARCHAR(128) DEFAULT NULL,
  PRIMARY KEY (`id`),
  UNIQUE KEY `uk_openid` (`openid`),
  KEY `idx_inviter` (`inviter_id`),
  UNIQUE KEY `uk_phone` (`phone`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci COMMENT='用户';

-- App 发布版本
CREATE TABLE IF NOT EXISTS `app_release` (
  `id` BIGINT NOT NULL AUTO_INCREMENT,
  `platform` VARCHAR(20) NOT NULL DEFAULT 'android',
  `version_name` VARCHAR(32) NOT NULL,
  `version_code` INT NOT NULL,
  `release_notes` TEXT,
  `file_name` VARCHAR(255) NOT NULL,
  `file_path` VARCHAR(255) NOT NULL,
  `file_size` BIGINT NOT NULL,
  `sha256` CHAR(64) NOT NULL,
  `published` TINYINT(1) NOT NULL DEFAULT 1,
  `create_time` DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
  `published_at` DATETIME DEFAULT NULL,
  `created_by` BIGINT DEFAULT NULL,
  PRIMARY KEY (`id`),
  UNIQUE KEY `uk_platform_version_code` (`platform`, `version_code`),
  KEY `idx_platform_published_version` (`platform`, `published`, `version_code`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci COMMENT='App发布版本';

-- 设备
CREATE TABLE IF NOT EXISTS `device` (
  `id` BIGINT NOT NULL AUTO_INCREMENT,
  `sn` VARCHAR(128) DEFAULT NULL,
  `bind_code` VARCHAR(32) DEFAULT NULL,
  `business_id` VARCHAR(64) DEFAULT NULL,
  `user_id` BIGINT DEFAULT NULL,
  `merchant_id` BIGINT DEFAULT NULL,
  `status` INT DEFAULT 0 COMMENT '0-离线 1-在线',
  `ip` VARCHAR(64) DEFAULT NULL,
  `name` VARCHAR(128) DEFAULT NULL,
  `location` VARCHAR(128) DEFAULT NULL,
  `carrier` VARCHAR(32) DEFAULT NULL,
  `hashrate` INT DEFAULT 0,
  `type` INT DEFAULT 0 COMMENT '0-真实设备 1-挂靠设备',
  `last_heartbeat_time` DATETIME DEFAULT NULL,
  `last_pay_time` DATETIME DEFAULT NULL,
  `bind_time` DATETIME DEFAULT NULL,
  `create_time` DATETIME DEFAULT CURRENT_TIMESTAMP,
  `pending_command` VARCHAR(512) DEFAULT NULL,
  `cpu_usage` VARCHAR(16) DEFAULT NULL,
  `memory_usage` VARCHAR(16) DEFAULT NULL,
  `cpu_model` VARCHAR(128) DEFAULT NULL,
  `agent_version` VARCHAR(32) DEFAULT NULL,
  `image_license_key` VARCHAR(64) DEFAULT NULL,
  `image_version` VARCHAR(32) DEFAULT NULL,
  PRIMARY KEY (`id`),
  UNIQUE KEY `uk_sn` (`sn`),
  UNIQUE KEY `uk_bind_code` (`bind_code`),
  KEY `idx_user` (`user_id`),
  KEY `idx_status` (`status`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci COMMENT='设备';

-- 设备收益
CREATE TABLE IF NOT EXISTS `device_earnings` (
  `id` BIGINT NOT NULL AUTO_INCREMENT,
  `device_id` BIGINT NOT NULL,
  `user_id` BIGINT NOT NULL,
  `amount` DECIMAL(12,2) NOT NULL DEFAULT 0.00,
  `date` DATE NOT NULL,
  `create_time` DATETIME DEFAULT CURRENT_TIMESTAMP,
  PRIMARY KEY (`id`),
  KEY `idx_user_date` (`user_id`, `date`),
  KEY `idx_device_date` (`device_id`, `date`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci COMMENT='设备收益记录';

-- 邀请奖励
CREATE TABLE IF NOT EXISTS `invite_reward` (
  `id` BIGINT NOT NULL AUTO_INCREMENT,
  `inviter_id` BIGINT NOT NULL,
  `invitee_id` BIGINT DEFAULT NULL,
  `reward` DECIMAL(12,2) DEFAULT 0.00,
  `reward_type` VARCHAR(32) DEFAULT NULL COMMENT 'register/device/earnings',
  `create_time` DATETIME DEFAULT CURRENT_TIMESTAMP,
  `device_id` BIGINT DEFAULT NULL,
  `remark` VARCHAR(255) DEFAULT NULL,
  PRIMARY KEY (`id`),
  KEY `idx_inviter` (`inviter_id`),
  KEY `idx_invitee` (`invitee_id`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci COMMENT='邀请奖励记录';

-- 公告
CREATE TABLE IF NOT EXISTS `notice` (
  `id` BIGINT NOT NULL AUTO_INCREMENT,
  `title` VARCHAR(255) NOT NULL,
  `content` TEXT,
  `image_url` VARCHAR(512) DEFAULT NULL,
  `type` INT DEFAULT 1 COMMENT '1-系统 2-活动 3-维护',
  `status` INT DEFAULT 1 COMMENT '0-草稿 1-已发布',
  `sort` INT DEFAULT 0,
  `publish_time` DATETIME DEFAULT NULL,
  `create_time` DATETIME DEFAULT CURRENT_TIMESTAMP,
  `update_time` DATETIME DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  PRIMARY KEY (`id`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci COMMENT='公告';

-- 提现
CREATE TABLE IF NOT EXISTS `withdraw` (
  `id` BIGINT NOT NULL AUTO_INCREMENT,
  `user_id` BIGINT NOT NULL,
  `amount` DECIMAL(12,2) NOT NULL,
  `fee` DECIMAL(12,2) DEFAULT 0.00,
  `actual_amount` DECIMAL(12,2) DEFAULT NULL,
  `type` INT DEFAULT 3 COMMENT '1-微信 2-支付宝 3-银行卡',
  `account` VARCHAR(128) DEFAULT NULL,
  `real_name` VARCHAR(64) DEFAULT NULL,
  `qr_code` VARCHAR(512) DEFAULT NULL,
  `status` INT DEFAULT 0 COMMENT '0-待审核 1-已通过 2-已拒绝 3-已打款 4-失败',
  `remark` VARCHAR(512) DEFAULT NULL,
  `password_hash` VARCHAR(100) DEFAULT NULL,
  `must_change_password` TINYINT(1) NOT NULL DEFAULT 1,
  `account_enabled` TINYINT(1) NOT NULL DEFAULT 1,
  `session_key` VARCHAR(64) DEFAULT NULL,
  `login_fail_count` INT NOT NULL DEFAULT 0,
  `locked_until` DATETIME DEFAULT NULL,
  `password_updated_at` DATETIME DEFAULT NULL,
  `last_login_at` DATETIME DEFAULT NULL,
  `payment_fail_count` INT DEFAULT 0,
  `id_card` VARCHAR(32) DEFAULT NULL,
  `mobile` VARCHAR(32) DEFAULT NULL,
  `bank_card_no` VARCHAR(64) DEFAULT NULL,
  `alipay_account` VARCHAR(128) DEFAULT NULL,
  `reject_reason` VARCHAR(255) DEFAULT NULL,
  `process_time` DATETIME DEFAULT NULL,
  `auditor_id` BIGINT DEFAULT NULL,
  `audit_time` DATETIME DEFAULT NULL,
  `create_time` DATETIME DEFAULT CURRENT_TIMESTAMP,
  `update_time` DATETIME DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  PRIMARY KEY (`id`),
  KEY `idx_user` (`user_id`),
  KEY `idx_status` (`status`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci COMMENT='提现记录';

-- 收货地址
CREATE TABLE IF NOT EXISTS `user_address` (
  `id` BIGINT NOT NULL AUTO_INCREMENT,
  `user_id` BIGINT NOT NULL,
  `receiver_name` VARCHAR(64) DEFAULT NULL,
  `phone` VARCHAR(32) DEFAULT NULL,
  `province` VARCHAR(32) DEFAULT NULL,
  `city` VARCHAR(32) DEFAULT NULL,
  `district` VARCHAR(32) DEFAULT NULL,
  `detail_address` VARCHAR(255) DEFAULT NULL,
  `is_default` INT DEFAULT 0,
  `create_time` DATETIME DEFAULT CURRENT_TIMESTAMP,
  `update_time` DATETIME DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  PRIMARY KEY (`id`),
  KEY `idx_user` (`user_id`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci COMMENT='收货地址';

-- 用户反馈
CREATE TABLE IF NOT EXISTS `user_feedback` (
  `id` BIGINT NOT NULL AUTO_INCREMENT,
  `user_id` BIGINT NOT NULL,
  `type` VARCHAR(32) DEFAULT 'other',
  `content` TEXT,
  `contact` VARCHAR(128) DEFAULT NULL,
  `images` TEXT,
  `status` INT DEFAULT 0 COMMENT '0-待处理 1-处理中 2-已处理',
  `reply` TEXT,
  `create_time` DATETIME DEFAULT CURRENT_TIMESTAMP,
  `update_time` DATETIME DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  PRIMARY KEY (`id`),
  KEY `idx_user` (`user_id`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci COMMENT='用户反馈';

-- 收款信息变更申请
CREATE TABLE IF NOT EXISTS `user_payment_apply` (
  `id` BIGINT NOT NULL AUTO_INCREMENT,
  `user_id` BIGINT NOT NULL,
  `old_info` TEXT,
  `payment_type` INT DEFAULT 0 COMMENT '0-银行卡 1-支付宝',
  `new_card_no` VARCHAR(128) DEFAULT NULL,
  `status` INT DEFAULT 0 COMMENT '0-待审核 1-已通过 2-已驳回',
  `reject_reason` VARCHAR(255) DEFAULT NULL,
  `create_time` DATETIME DEFAULT CURRENT_TIMESTAMP,
  `update_time` DATETIME DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  PRIMARY KEY (`id`),
  KEY `idx_user` (`user_id`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci COMMENT='收款信息变更申请';

-- 兑换商品
CREATE TABLE IF NOT EXISTS `exchange_product` (
  `id` BIGINT NOT NULL AUTO_INCREMENT,
  `name` VARCHAR(128) NOT NULL,
  `description` TEXT,
  `image_url` VARCHAR(512) DEFAULT NULL,
  `images` TEXT,
  `base_price` DECIMAL(12,2) DEFAULT 0.00,
  `price_level1` DECIMAL(12,2) DEFAULT NULL,
  `price_level2` DECIMAL(12,2) DEFAULT NULL,
  `price_level3` DECIMAL(12,2) DEFAULT NULL,
  `price_level4` DECIMAL(12,2) DEFAULT NULL,
  `price_level5` DECIMAL(12,2) DEFAULT NULL,
  `stock` INT DEFAULT 0,
  `status` INT DEFAULT 1 COMMENT '0-下架 1-上架',
  `sort_order` INT DEFAULT 0,
  `create_time` DATETIME DEFAULT CURRENT_TIMESTAMP,
  `update_time` DATETIME DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  PRIMARY KEY (`id`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci COMMENT='兑换商品';

-- 兑换订单
CREATE TABLE IF NOT EXISTS `exchange_order` (
  `id` BIGINT NOT NULL AUTO_INCREMENT,
  `order_no` VARCHAR(64) NOT NULL,
  `user_id` BIGINT NOT NULL,
  `product_id` BIGINT NOT NULL,
  `product_name` VARCHAR(128) DEFAULT NULL,
  `product_image` VARCHAR(512) DEFAULT NULL,
  `quantity` INT DEFAULT 1,
  `unit_price` DECIMAL(12,2) DEFAULT 0.00,
  `total_price` DECIMAL(12,2) DEFAULT 0.00,
  `hashrate_cost` BIGINT DEFAULT 0,
  `user_level` INT DEFAULT 0,
  `receiver_name` VARCHAR(64) DEFAULT NULL,
  `receiver_phone` VARCHAR(32) DEFAULT NULL,
  `receiver_address` VARCHAR(512) DEFAULT NULL,
  `status` INT DEFAULT 0 COMMENT '0-待发货 1-已发货 2-运输中 3-已到货 4-已取消',
  `express_company` VARCHAR(64) DEFAULT NULL,
  `express_no` VARCHAR(64) DEFAULT NULL,
  `ship_time` DATETIME DEFAULT NULL,
  `receive_time` DATETIME DEFAULT NULL,
  `remark` VARCHAR(512) DEFAULT NULL,
  `password_hash` VARCHAR(100) DEFAULT NULL,
  `must_change_password` TINYINT(1) NOT NULL DEFAULT 1,
  `account_enabled` TINYINT(1) NOT NULL DEFAULT 1,
  `session_key` VARCHAR(64) DEFAULT NULL,
  `login_fail_count` INT NOT NULL DEFAULT 0,
  `locked_until` DATETIME DEFAULT NULL,
  `password_updated_at` DATETIME DEFAULT NULL,
  `last_login_at` DATETIME DEFAULT NULL,
  `admin_remark` VARCHAR(512) DEFAULT NULL,
  `inviter_id` BIGINT DEFAULT NULL,
  `inviter_level` INT DEFAULT NULL,
  `inviter_profit` DECIMAL(12,2) DEFAULT NULL,
  `create_time` DATETIME DEFAULT CURRENT_TIMESTAMP,
  `update_time` DATETIME DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  PRIMARY KEY (`id`),
  UNIQUE KEY `uk_order_no` (`order_no`),
  KEY `idx_user` (`user_id`),
  KEY `idx_status` (`status`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci COMMENT='兑换订单';

-- 物流轨迹
CREATE TABLE IF NOT EXISTS `exchange_logistics` (
  `id` BIGINT NOT NULL AUTO_INCREMENT,
  `order_id` BIGINT NOT NULL,
  `status` INT DEFAULT 0,
  `description` VARCHAR(512) DEFAULT NULL,
  `operator` VARCHAR(64) DEFAULT NULL,
  `create_time` DATETIME DEFAULT CURRENT_TIMESTAMP,
  PRIMARY KEY (`id`),
  KEY `idx_order` (`order_id`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci COMMENT='物流轨迹';

-- AI 创作任务（历史模块，App 端已不用，表保留以兼容后端启动）
CREATE TABLE IF NOT EXISTS `ai_task` (
  `id` BIGINT NOT NULL AUTO_INCREMENT,
  `task_id` VARCHAR(64) DEFAULT NULL,
  `user_id` BIGINT DEFAULT NULL,
  `task_type` VARCHAR(32) DEFAULT NULL,
  `prompt` TEXT,
  `input_image_url` VARCHAR(512) DEFAULT NULL,
  `options` VARCHAR(255) DEFAULT NULL,
  `status` VARCHAR(16) DEFAULT 'pending',
  `result_url` VARCHAR(512) DEFAULT NULL,
  `error_msg` TEXT,
  `cost_quota` INT DEFAULT 0,
  `create_time` DATETIME DEFAULT CURRENT_TIMESTAMP,
  `complete_time` DATETIME DEFAULT NULL,
  `deleted` INT DEFAULT 0,
  PRIMARY KEY (`id`),
  KEY `idx_task_id` (`task_id`),
  KEY `idx_user` (`user_id`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci COMMENT='AI创作任务';

-- AI 设备执行任务
CREATE TABLE IF NOT EXISTS `ai_device_task` (
  `id` BIGINT NOT NULL AUTO_INCREMENT,
  `task_id` VARCHAR(64) DEFAULT NULL,
  `task_type` VARCHAR(32) DEFAULT NULL,
  `task_params` TEXT,
  `retry_count` INT DEFAULT 0,
  `device_sn` VARCHAR(128) DEFAULT NULL,
  `prompt` TEXT,
  `response_text` LONGTEXT,
  `model_name` VARCHAR(64) DEFAULT NULL,
  `status` VARCHAR(16) DEFAULT 'pending',
  `generate_tokens` INT DEFAULT 0,
  `reward_hashrate` INT DEFAULT 0,
  `duration_ms` BIGINT DEFAULT NULL,
  `error_msg` TEXT,
  `create_time` DATETIME DEFAULT CURRENT_TIMESTAMP,
  `update_time` DATETIME DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  `deleted` INT DEFAULT 0,
  PRIMARY KEY (`id`),
  KEY `idx_task_id` (`task_id`),
  KEY `idx_device_sn` (`device_sn`),
  KEY `idx_status` (`status`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci COMMENT='AI设备任务';

-- 接口商户
CREATE TABLE IF NOT EXISTS `api_merchant` (
  `id` BIGINT NOT NULL AUTO_INCREMENT,
  `merchant_name` VARCHAR(128) DEFAULT NULL,
  `app_id` VARCHAR(64) DEFAULT NULL,
  `app_secret` VARCHAR(128) DEFAULT NULL,
  `permissions` VARCHAR(255) DEFAULT NULL,
  `status` INT DEFAULT 1,
  `create_time` DATETIME DEFAULT CURRENT_TIMESTAMP,
  `update_time` DATETIME DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  `deleted` INT DEFAULT 0,
  `expire_time` DATETIME DEFAULT NULL,
  `balance` DECIMAL(12,2) DEFAULT 0.00,
  `level` INT DEFAULT 0,
  `contact_phone` VARCHAR(32) DEFAULT NULL,
  `bind_user_id` BIGINT DEFAULT NULL,
  PRIMARY KEY (`id`),
  UNIQUE KEY `uk_app_id` (`app_id`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci COMMENT='接口商户';

-- 设备远程指令
CREATE TABLE IF NOT EXISTS `device_command` (
  `id` BIGINT NOT NULL AUTO_INCREMENT,
  `command_no` VARCHAR(64) DEFAULT NULL,
  `device_id` BIGINT DEFAULT NULL,
  `device_sn` VARCHAR(128) DEFAULT NULL,
  `command_type` VARCHAR(32) DEFAULT NULL,
  `command_text` TEXT,
  `command_payload` TEXT,
  `status` VARCHAR(16) DEFAULT 'pending',
  `exit_code` INT DEFAULT NULL,
  `result_text` LONGTEXT,
  `remark` VARCHAR(255) DEFAULT NULL,
  `dispatched_at` DATETIME DEFAULT NULL,
  `finished_at` DATETIME DEFAULT NULL,
  `create_time` DATETIME DEFAULT CURRENT_TIMESTAMP,
  `update_time` DATETIME DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  PRIMARY KEY (`id`),
  UNIQUE KEY `uk_command_no` (`command_no`),
  KEY `idx_device` (`device_id`),
  KEY `idx_status` (`status`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci COMMENT='设备远程指令';

-- 设备离线日志
CREATE TABLE IF NOT EXISTS `device_offline_log` (
  `id` BIGINT NOT NULL AUTO_INCREMENT,
  `device_id` BIGINT DEFAULT NULL,
  `sn` VARCHAR(128) DEFAULT NULL,
  `bind_code` VARCHAR(32) DEFAULT NULL,
  `offline_time` DATETIME DEFAULT NULL,
  `last_heartbeat_time` DATETIME DEFAULT NULL,
  `reason` VARCHAR(255) DEFAULT NULL,
  `create_time` DATETIME DEFAULT CURRENT_TIMESTAMP,
  PRIMARY KEY (`id`),
  KEY `idx_device` (`device_id`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci COMMENT='设备离线日志';

-- 升级包
CREATE TABLE IF NOT EXISTS `device_upgrade_package` (
  `id` BIGINT NOT NULL AUTO_INCREMENT,
  `package_no` VARCHAR(64) DEFAULT NULL,
  `version` VARCHAR(32) DEFAULT NULL,
  `file_name` VARCHAR(255) DEFAULT NULL,
  `file_path` VARCHAR(512) DEFAULT NULL,
  `file_url` VARCHAR(512) DEFAULT NULL,
  `file_size` BIGINT DEFAULT NULL,
  `checksum` VARCHAR(128) DEFAULT NULL,
  `status` VARCHAR(16) DEFAULT 'active',
  `release_note` TEXT,
  `uploaded_by` VARCHAR(64) DEFAULT NULL,
  `create_time` DATETIME DEFAULT CURRENT_TIMESTAMP,
  `update_time` DATETIME DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  PRIMARY KEY (`id`),
  UNIQUE KEY `uk_package_no` (`package_no`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci COMMENT='设备升级包';

-- 升级批次
CREATE TABLE IF NOT EXISTS `device_upgrade_batch` (
  `id` BIGINT NOT NULL AUTO_INCREMENT,
  `batch_no` VARCHAR(64) DEFAULT NULL,
  `package_id` BIGINT DEFAULT NULL,
  `target_version` VARCHAR(32) DEFAULT NULL,
  `target_scope` VARCHAR(32) DEFAULT NULL,
  `location_keyword` VARCHAR(128) DEFAULT NULL,
  `carrier` VARCHAR(32) DEFAULT NULL,
  `total_count` INT DEFAULT 0,
  `pending_count` INT DEFAULT 0,
  `delivered_count` INT DEFAULT 0,
  `upgrading_count` INT DEFAULT 0,
  `success_count` INT DEFAULT 0,
  `failed_count` INT DEFAULT 0,
  `skipped_count` INT DEFAULT 0,
  `status` VARCHAR(16) DEFAULT 'pending',
  `remark` VARCHAR(255) DEFAULT NULL,
  `started_at` DATETIME DEFAULT NULL,
  `finished_at` DATETIME DEFAULT NULL,
  `create_time` DATETIME DEFAULT CURRENT_TIMESTAMP,
  `update_time` DATETIME DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  PRIMARY KEY (`id`),
  UNIQUE KEY `uk_batch_no` (`batch_no`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci COMMENT='设备升级批次';

-- 升级明细
CREATE TABLE IF NOT EXISTS `device_upgrade_record` (
  `id` BIGINT NOT NULL AUTO_INCREMENT,
  `batch_id` BIGINT DEFAULT NULL,
  `package_id` BIGINT DEFAULT NULL,
  `command_id` BIGINT DEFAULT NULL,
  `command_no` VARCHAR(64) DEFAULT NULL,
  `device_id` BIGINT DEFAULT NULL,
  `device_sn` VARCHAR(128) DEFAULT NULL,
  `from_version` VARCHAR(32) DEFAULT NULL,
  `target_version` VARCHAR(32) DEFAULT NULL,
  `status` VARCHAR(16) DEFAULT 'pending',
  `error_msg` TEXT,
  `result_text` TEXT,
  `delivered_at` DATETIME DEFAULT NULL,
  `finished_at` DATETIME DEFAULT NULL,
  `create_time` DATETIME DEFAULT CURRENT_TIMESTAMP,
  `update_time` DATETIME DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  PRIMARY KEY (`id`),
  KEY `idx_batch` (`batch_id`),
  KEY `idx_device` (`device_id`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci COMMENT='设备升级明细';

-- 镜像授权
CREATE TABLE IF NOT EXISTS `image_license` (
  `id` BIGINT NOT NULL AUTO_INCREMENT,
  `license_key` VARCHAR(64) DEFAULT NULL,
  `name` VARCHAR(128) DEFAULT NULL,
  `image_version` VARCHAR(32) DEFAULT NULL,
  `status` VARCHAR(16) DEFAULT 'active',
  `remark` VARCHAR(255) DEFAULT NULL,
  `created_by` VARCHAR(64) DEFAULT NULL,
  `factory_username` VARCHAR(64) DEFAULT NULL,
  `revoked_at` DATETIME DEFAULT NULL,
  `create_time` DATETIME DEFAULT CURRENT_TIMESTAMP,
  `update_time` DATETIME DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  PRIMARY KEY (`id`),
  UNIQUE KEY `uk_license_key` (`license_key`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci COMMENT='镜像授权';

-- 镜像授权激活记录
CREATE TABLE IF NOT EXISTS `image_license_activation` (
  `id` BIGINT NOT NULL AUTO_INCREMENT,
  `license_id` BIGINT DEFAULT NULL,
  `license_key` VARCHAR(64) DEFAULT NULL,
  `device_sn` VARCHAR(128) DEFAULT NULL,
  `device_id` BIGINT DEFAULT NULL,
  `hardware_fingerprint` VARCHAR(128) DEFAULT NULL,
  `agent_version` VARCHAR(32) DEFAULT NULL,
  `image_version` VARCHAR(32) DEFAULT NULL,
  `ip` VARCHAR(64) DEFAULT NULL,
  `cpu_model` VARCHAR(128) DEFAULT NULL,
  `first_seen_at` DATETIME DEFAULT NULL,
  `last_seen_at` DATETIME DEFAULT NULL,
  PRIMARY KEY (`id`),
  KEY `idx_license` (`license_id`),
  KEY `idx_device_sn` (`device_sn`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci COMMENT='镜像授权激活记录';

-- 代理池
CREATE TABLE IF NOT EXISTS `proxy_pool` (
  `id` BIGINT NOT NULL AUTO_INCREMENT,
  `device_id` BIGINT DEFAULT NULL,
  `device_sn` VARCHAR(128) DEFAULT NULL,
  `proxy_ip` VARCHAR(64) DEFAULT NULL,
  `proxy_port` INT DEFAULT NULL,
  `protocol` VARCHAR(16) DEFAULT 'socks5',
  `location` VARCHAR(128) DEFAULT NULL,
  `carrier` VARCHAR(32) DEFAULT NULL,
  `province` VARCHAR(32) DEFAULT NULL,
  `city` VARCHAR(32) DEFAULT NULL,
  `status` INT DEFAULT 0 COMMENT '0-离线 1-可用 2-已分配 3-维护中',
  `device_count` INT DEFAULT 0,
  `allocated_to` BIGINT DEFAULT NULL,
  `allocated_at` DATETIME DEFAULT NULL,
  `expire_at` DATETIME DEFAULT NULL,
  `last_check_time` DATETIME DEFAULT NULL,
  `last_sync_time` DATETIME DEFAULT NULL,
  `total_bytes` BIGINT DEFAULT 0,
  `create_time` DATETIME DEFAULT CURRENT_TIMESTAMP,
  `update_time` DATETIME DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  PRIMARY KEY (`id`),
  UNIQUE KEY `uk_proxy_ip` (`proxy_ip`),
  KEY `idx_status` (`status`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci COMMENT='IP代理资源池';

-- 代理使用日志
CREATE TABLE IF NOT EXISTS `proxy_usage_log` (
  `id` BIGINT NOT NULL AUTO_INCREMENT,
  `proxy_id` BIGINT DEFAULT NULL,
  `proxy_ip` VARCHAR(64) DEFAULT NULL,
  `merchant_id` BIGINT DEFAULT NULL,
  `merchant_name` VARCHAR(128) DEFAULT NULL,
  `action` VARCHAR(32) DEFAULT NULL,
  `bytes_up` BIGINT DEFAULT 0,
  `bytes_down` BIGINT DEFAULT 0,
  `remark` VARCHAR(255) DEFAULT NULL,
  `create_time` DATETIME DEFAULT CURRENT_TIMESTAMP,
  PRIMARY KEY (`id`),
  KEY `idx_proxy` (`proxy_id`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci COMMENT='代理使用日志';

-- ============================================================
-- 种子数据
-- ============================================================

-- 初始管理员（⚠️ 上线后立刻改密码）
INSERT INTO `sys_user` (`username`, `password`, `nickname`, `role`)
SELECT 'admin', 'admin123', '超级管理员', 'admin'
WHERE NOT EXISTS (SELECT 1 FROM `sys_user` WHERE `username` = 'admin');

-- 基础品牌配置（数值类参数代码里都有默认值，可在后台按需覆盖）
INSERT INTO `system_config` (`config_key`, `config_value`, `description`)
SELECT * FROM (
  SELECT 'siteName' AS k, '全球云智算' AS v, '站点名称' AS d
  UNION ALL SELECT 'contactWechat', 'qqyzs-kefu', '客服微信号'
  UNION ALL SELECT 'contactWorkTime', '9:00-18:00', '客服工作时间'
  UNION ALL SELECT 'system.fileBaseUrl', 'https://hz.shandongliandong.com', '文件访问域名'
) t(k, v, d)
WHERE NOT EXISTS (SELECT 1 FROM `system_config` WHERE `config_key` = t.k);
