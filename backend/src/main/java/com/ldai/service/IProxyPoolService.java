package com.ldai.service;

import com.baomidou.mybatisplus.extension.service.IService;
import com.ldai.entity.ProxyPool;

import java.util.List;
import java.util.Map;

public interface IProxyPoolService extends IService<ProxyPool> {

    /**
     * 从 device 表同步 IP 到 proxy_pool（IP去重核心逻辑）
     * 按出口IP分组，每组选一台最优设备作为代表
     * @return 同步结果统计
     */
    Map<String, Object> syncFromDevices();

    /**
     * 获取IP池统计概览
     */
    Map<String, Object> getPoolStats();

    /**
     * 按地区获取N个可用代理
     */
    List<ProxyPool> obtainProxies(String province, String carrier, int count,
                                  Long merchantId, int durationMinutes);

    /**
     * 按代理池ID分配指定代理
     */
    ProxyPool allocateProxy(Long proxyId, Long merchantId, int durationMinutes);

    /**
     * 释放代理
     */
    boolean releaseProxy(Long proxyId);

    /**
     * 批量释放某商户的所有代理
     */
    int releaseByMerchant(Long merchantId);

    /**
     * 自动释放已过期代理
     */
    int releaseExpiredProxies();
}
