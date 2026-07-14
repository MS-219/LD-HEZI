package com.ldai.service;

import com.baomidou.mybatisplus.extension.service.IService;
import com.ldai.entity.Device;

public interface IDeviceService extends IService<Device> {
    /**
     * 处理设备心跳
     * 
     * @param sn 设备SN
     * @param ip 设备IP
     */
    Device handleHeartbeat(String sn, String ip, String cpuUsage, String memoryUsage);

    /**
     * 处理设备心跳；镜像授权参数仅用于兼容旧版 Agent，不再作为设备接入条件。
     */
    Device handleHeartbeat(String sn, String ip, String cpuUsage, String memoryUsage,
                           String imageLicenseKey, String imageVersion, String hardwareFingerprint,
                           String cpuModel, String agentVersion);

    boolean bindDevice(String sn, String code, Long userId);

    boolean bindDevice(String sn, String code, Long userId, Long merchantId);
}
