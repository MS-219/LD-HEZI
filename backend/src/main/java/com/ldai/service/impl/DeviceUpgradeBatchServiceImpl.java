package com.ldai.service.impl;

import com.baomidou.mybatisplus.extension.service.impl.ServiceImpl;
import com.ldai.entity.DeviceUpgradeBatch;
import com.ldai.mapper.DeviceUpgradeBatchMapper;
import com.ldai.service.IDeviceUpgradeBatchService;
import org.springframework.stereotype.Service;

@Service
public class DeviceUpgradeBatchServiceImpl extends ServiceImpl<DeviceUpgradeBatchMapper, DeviceUpgradeBatch>
        implements IDeviceUpgradeBatchService {
}
