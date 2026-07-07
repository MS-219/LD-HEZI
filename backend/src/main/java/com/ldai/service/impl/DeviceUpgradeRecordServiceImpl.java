package com.ldai.service.impl;

import com.baomidou.mybatisplus.extension.service.impl.ServiceImpl;
import com.ldai.entity.DeviceUpgradeRecord;
import com.ldai.mapper.DeviceUpgradeRecordMapper;
import com.ldai.service.IDeviceUpgradeRecordService;
import org.springframework.stereotype.Service;

@Service
public class DeviceUpgradeRecordServiceImpl extends ServiceImpl<DeviceUpgradeRecordMapper, DeviceUpgradeRecord>
        implements IDeviceUpgradeRecordService {
}
