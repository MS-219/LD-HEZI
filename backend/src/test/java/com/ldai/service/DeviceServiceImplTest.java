package com.ldai.service;

import com.ldai.entity.Device;
import com.ldai.mapper.DeviceMapper;
import com.ldai.service.impl.DeviceServiceImpl;
import com.ldai.util.IpUtil;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;
import org.springframework.test.util.ReflectionTestUtils;

import java.util.Collections;

import static org.junit.jupiter.api.Assertions.assertEquals;
import static org.junit.jupiter.api.Assertions.assertNotNull;
import static org.junit.jupiter.api.Assertions.assertNull;
import static org.mockito.ArgumentMatchers.any;
import static org.mockito.Mockito.mock;
import static org.mockito.Mockito.never;
import static org.mockito.Mockito.verify;
import static org.mockito.Mockito.when;

class DeviceServiceImplTest {

    private DeviceServiceImpl service;
    private DeviceMapper deviceMapper;
    private IImageLicenseService imageLicenseService;

    @BeforeEach
    void setUp() {
        service = new DeviceServiceImpl();
        deviceMapper = mock(DeviceMapper.class);
        imageLicenseService = mock(IImageLicenseService.class);
        IpUtil ipUtil = new IpUtil();

        ReflectionTestUtils.setField(service, "baseMapper", deviceMapper);
        ReflectionTestUtils.setField(service, "ipUtil", ipUtil);
        ReflectionTestUtils.setField(service, "imageLicenseService", imageLicenseService);

        when(deviceMapper.selectList(any())).thenReturn(Collections.emptyList());
        when(deviceMapper.insert(any(Device.class))).thenReturn(1);
        when(deviceMapper.updateById(any(Device.class))).thenReturn(1);
    }

    @Test
    void registersNewDeviceWithoutImageLicense() {
        Device device = service.handleHeartbeat(
                "CD-TEST-NO-LICENSE",
                "192.168.1.61",
                "3.2",
                "18.4",
                null,
                "V4.0",
                "fingerprint",
                "Test CPU",
                "V4.0");

        assertNotNull(device);
        assertEquals("CD-TEST-NO-LICENSE", device.getSn());
        assertEquals(1, device.getStatus());
        assertEquals("V4.0", device.getImageVersion());
        assertNull(device.getImageLicenseKey());
        verify(deviceMapper).insert(device);
        verify(imageLicenseService, never()).validateNewDeviceLicense(any());
    }
    @Test
    void migratesLegacyDeviceToCdPrefix() {
        Device legacy = new Device();
        legacy.setId(7L);
        legacy.setSn("LD-ABCDEF123456");
        legacy.setBindCode("LD123456");
        legacy.setStatus(1);

        when(deviceMapper.selectOne(any())).thenReturn(null, legacy);

        Device device = service.handleHeartbeat(
                "CD-ABCDEF123456",
                "192.168.1.61",
                "3.2",
                "18.4",
                null,
                "V4.0",
                "fingerprint",
                "Test CPU",
                "V4.0");

        assertNotNull(device);
        assertEquals(7L, device.getId());
        assertEquals("CD-ABCDEF123456", device.getSn());
        assertEquals("CD", device.getBindCode().substring(0, 2));
        verify(deviceMapper).updateById(device);
    }

}
