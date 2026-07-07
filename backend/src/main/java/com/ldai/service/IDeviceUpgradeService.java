package com.ldai.service;

import com.baomidou.mybatisplus.core.metadata.IPage;
import com.ldai.entity.DeviceUpgradeBatch;
import com.ldai.entity.DeviceUpgradePackage;
import com.ldai.entity.DeviceUpgradeRecord;
import org.springframework.web.multipart.MultipartFile;

import java.util.Map;

public interface IDeviceUpgradeService {

    DeviceUpgradePackage uploadPackage(MultipartFile file, String version, String releaseNote, String uploadedBy);

    DeviceUpgradeBatch createBatch(Map<String, Object> params);

    IPage<DeviceUpgradeRecord> listRecords(Integer page, Integer size, Long batchId, String deviceSn, String status);

    Map<String, Object> getStats();

    void handleCommandResult(String commandNo, Integer exitCode, String resultText);

    void markCommandDelivered(String commandNo);

    void markSuccessByHeartbeat(String deviceSn, String agentVersion);

    void refreshBatchCounters(Long batchId);

    int markTimeoutRecords(int timeoutMinutes);
}
