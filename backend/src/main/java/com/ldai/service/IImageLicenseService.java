package com.ldai.service;

import com.baomidou.mybatisplus.core.metadata.IPage;
import com.baomidou.mybatisplus.extension.service.IService;
import com.ldai.entity.Device;
import com.ldai.entity.ImageLicense;
import com.ldai.entity.ImageLicenseActivation;

import java.util.Map;

public interface IImageLicenseService extends IService<ImageLicense> {

    ImageLicense createLicense(Map<String, Object> params, String createdBy);

    IPage<ImageLicense> listLicenses(Integer page, Integer size, String status, String keyword);

    boolean revokeLicense(Long id);

    ImageLicense assignFactory(Long id, String factoryUsername);

    String validateNewDeviceLicense(String licenseKey);

    void recordActivation(ImageLicense license, Device device, String hardwareFingerprint,
                          String agentVersion, String imageVersion, String ip, String cpuModel);

    IPage<ImageLicenseActivation> listActivations(Long licenseId, Integer page, Integer size);
}
