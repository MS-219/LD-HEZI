-- App 后台开户、密码登录、单设备会话及强制更新（可重复执行）
DROP PROCEDURE IF EXISTS add_app_user_column;
DELIMITER //
CREATE PROCEDURE add_app_user_column(IN column_name_value VARCHAR(64), IN column_definition TEXT)
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.COLUMNS
    WHERE TABLE_SCHEMA = DATABASE() AND TABLE_NAME = 'app_user' AND COLUMN_NAME = column_name_value
  ) THEN
    SET @ddl = CONCAT('ALTER TABLE app_user ADD COLUMN `', column_name_value, '` ', column_definition);
    PREPARE stmt FROM @ddl;
    EXECUTE stmt;
    DEALLOCATE PREPARE stmt;
  END IF;
END //
DELIMITER ;

CALL add_app_user_column('password_hash', 'VARCHAR(100) DEFAULT NULL COMMENT ''BCrypt密码散列''');
CALL add_app_user_column('must_change_password', 'TINYINT(1) NOT NULL DEFAULT 1 COMMENT ''是否必须修改密码''');
CALL add_app_user_column('account_enabled', 'TINYINT(1) NOT NULL DEFAULT 1 COMMENT ''账号是否启用''');
CALL add_app_user_column('session_key', 'VARCHAR(64) DEFAULT NULL COMMENT ''当前唯一会话键''');
CALL add_app_user_column('login_fail_count', 'INT NOT NULL DEFAULT 0 COMMENT ''连续密码失败次数''');
CALL add_app_user_column('locked_until', 'DATETIME DEFAULT NULL COMMENT ''密码登录锁定截止时间''');
CALL add_app_user_column('password_updated_at', 'DATETIME DEFAULT NULL COMMENT ''密码修改时间''');
CALL add_app_user_column('last_login_at', 'DATETIME DEFAULT NULL COMMENT ''最近登录时间''');
DROP PROCEDURE add_app_user_column;

CREATE TABLE IF NOT EXISTS app_release (
  id BIGINT NOT NULL AUTO_INCREMENT,
  platform VARCHAR(20) NOT NULL DEFAULT 'android',
  version_name VARCHAR(32) NOT NULL,
  version_code INT NOT NULL,
  release_notes TEXT,
  file_name VARCHAR(255) NOT NULL,
  file_path VARCHAR(255) NOT NULL,
  file_size BIGINT NOT NULL,
  sha256 CHAR(64) NOT NULL,
  published TINYINT(1) NOT NULL DEFAULT 1,
  create_time DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
  published_at DATETIME DEFAULT NULL,
  created_by BIGINT DEFAULT NULL,
  PRIMARY KEY (id),
  UNIQUE KEY uk_platform_version_code (platform, version_code),
  KEY idx_platform_published_version (platform, published, version_code)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci COMMENT='App发布版本';
