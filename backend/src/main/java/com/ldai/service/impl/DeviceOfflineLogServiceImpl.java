package com.ldai.service.impl;

import com.baomidou.mybatisplus.extension.service.impl.ServiceImpl;
import com.ldai.entity.DeviceOfflineLog;
import com.ldai.mapper.DeviceOfflineLogMapper;
import com.ldai.service.IDeviceOfflineLogService;
import org.springframework.stereotype.Service;

@Service
public class DeviceOfflineLogServiceImpl extends ServiceImpl<DeviceOfflineLogMapper, DeviceOfflineLog>
        implements IDeviceOfflineLogService {
}
