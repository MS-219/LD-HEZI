package com.ldai.entity;

import com.baomidou.mybatisplus.annotation.IdType;
import com.baomidou.mybatisplus.annotation.TableId;
import com.baomidou.mybatisplus.annotation.TableName;
import lombok.Data;
import java.time.LocalDateTime;

/**
 * 代理使用/操作日志
 */
@Data
@TableName("proxy_usage_log")
public class ProxyUsageLog {
    @TableId(type = IdType.AUTO)
    private Long id;

    /** 代理池记录ID */
    private Long proxyId;

    /** 代理出口IP */
    private String proxyIp;

    /** 商户ID */
    private Long merchantId;

    /** 商户名称 */
    private String merchantName;

    /** 操作: allocate/release/expire/offline */
    private String action;

    /** 上行流量 */
    private Long bytesUp;

    /** 下行流量 */
    private Long bytesDown;

    /** 备注 */
    private String remark;

    private LocalDateTime createTime;
}
