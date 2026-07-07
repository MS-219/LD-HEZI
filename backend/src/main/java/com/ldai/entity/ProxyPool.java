package com.ldai.entity;

import com.baomidou.mybatisplus.annotation.IdType;
import com.baomidou.mybatisplus.annotation.TableField;
import com.baomidou.mybatisplus.annotation.TableId;
import com.baomidou.mybatisplus.annotation.TableName;
import lombok.Data;
import java.time.LocalDateTime;

/**
 * IP代理资源池（按出口IP去重，每个独立IP一条记录）
 */
@Data
@TableName("proxy_pool")
public class ProxyPool {
    @TableId(type = IdType.AUTO)
    private Long id;

    /** 代表设备ID（同IP下选一台最优设备） */
    private Long deviceId;

    /** 代表设备SN */
    private String deviceSn;

    /** 出口公网IP（去重核心字段） */
    private String proxyIp;

    /** 中心服务器上的映射端口 */
    private Integer proxyPort;

    /** 协议: socks5/http */
    private String protocol;

    /** 地区（完整，如"山东省枣庄市"） */
    private String location;

    /** 运营商 */
    private String carrier;

    /** 省份（从location提取） */
    private String province;

    /** 城市 */
    private String city;

    /** 状态: 0-离线 1-可用 2-已分配 3-维护中 */
    private Integer status;

    /** 该IP下的设备总数 */
    private Integer deviceCount;

    /** 分配给的商户ID */
    private Long allocatedTo;

    /** 分配商户名称（非数据库字段） */
    @TableField(exist = false)
    private String merchantName;

    /** 分配时间 */
    private LocalDateTime allocatedAt;

    /** 过期时间 */
    private LocalDateTime expireAt;

    /** 最后连通检查时间 */
    private LocalDateTime lastCheckTime;

    /** 最后同步时间 */
    private LocalDateTime lastSyncTime;

    /** 累计流量(字节) */
    private Long totalBytes;

    private LocalDateTime createTime;
    private LocalDateTime updateTime;
}
