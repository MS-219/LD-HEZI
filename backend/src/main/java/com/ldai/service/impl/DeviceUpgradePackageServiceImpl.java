package com.ldai.service.impl;

import com.baomidou.mybatisplus.extension.service.impl.ServiceImpl;
import com.ldai.entity.DeviceUpgradePackage;
import com.ldai.mapper.DeviceUpgradePackageMapper;
import com.ldai.service.IDeviceUpgradePackageService;
import org.springframework.stereotype.Service;

@Service
public class DeviceUpgradePackageServiceImpl extends ServiceImpl<DeviceUpgradePackageMapper, DeviceUpgradePackage>
        implements IDeviceUpgradePackageService {
}
