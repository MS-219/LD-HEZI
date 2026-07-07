-- IP代理资源池（以独立出口IP为维度，去重后每个IP一条记录）
CREATE TABLE IF NOT EXISTS proxy_pool (
    id BIGINT AUTO_INCREMENT PRIMARY KEY,
    device_id BIGINT NOT NULL COMMENT '代表设备ID（同IP下选一台最优设备）',
    device_sn VARCHAR(64) NOT NULL COMMENT '代表设备SN',
    proxy_ip VARCHAR(64) NOT NULL COMMENT '出口公网IP（去重的核心字段）',
    proxy_port INT DEFAULT 0 COMMENT '中心服务器上的映射端口',
    protocol VARCHAR(16) DEFAULT 'socks5' COMMENT '协议: socks5/http',
    location VARCHAR(128) COMMENT '地区',
    carrier VARCHAR(64) COMMENT '运营商',
    province VARCHAR(32) COMMENT '省份（提取自location，便于筛选）',
    city VARCHAR(64) COMMENT '城市',
    status TINYINT DEFAULT 0 COMMENT '0-离线 1-可用 2-已分配 3-维护中',
    device_count INT DEFAULT 1 COMMENT '该IP下的设备总数',
    allocated_to BIGINT COMMENT '分配给的商户ID',
    allocated_at DATETIME COMMENT '分配时间',
    expire_at DATETIME COMMENT '过期时间',
    last_check_time DATETIME COMMENT '最后连通检查时间',
    last_sync_time DATETIME COMMENT '最后同步时间',
    total_bytes BIGINT DEFAULT 0 COMMENT '累计流量(字节)',
    create_time DATETIME DEFAULT CURRENT_TIMESTAMP,
    update_time DATETIME DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    UNIQUE INDEX uk_proxy_ip (proxy_ip),
    INDEX idx_location (location),
    INDEX idx_province (province),
    INDEX idx_status (status),
    INDEX idx_allocated (allocated_to)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COMMENT='IP代理资源池（按出口IP去重）';

-- 代理使用/分配记录
CREATE TABLE IF NOT EXISTS proxy_usage_log (
    id BIGINT AUTO_INCREMENT PRIMARY KEY,
    proxy_id BIGINT NOT NULL COMMENT '代理池记录ID',
    proxy_ip VARCHAR(64) COMMENT '代理出口IP',
    merchant_id BIGINT COMMENT '商户ID',
    merchant_name VARCHAR(128) COMMENT '商户名称',
    action VARCHAR(32) NOT NULL COMMENT '操作: allocate/release/expire/offline/maintenance/status/tunnel/start_link/stop_link',
    bytes_up BIGINT DEFAULT 0 COMMENT '上行流量',
    bytes_down BIGINT DEFAULT 0 COMMENT '下行流量',
    remark VARCHAR(256) COMMENT '备注',
    create_time DATETIME DEFAULT CURRENT_TIMESTAMP,
    INDEX idx_proxy_id (proxy_id),
    INDEX idx_merchant_id (merchant_id),
    INDEX idx_action (action)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COMMENT='代理使用日志';
