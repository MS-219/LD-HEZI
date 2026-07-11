package com.ldai.service;

import com.ldai.service.SmsVerificationService.SmsVerificationException;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;
import org.springframework.test.util.ReflectionTestUtils;

import static org.junit.jupiter.api.Assertions.assertEquals;
import static org.junit.jupiter.api.Assertions.assertThrows;
import static org.junit.jupiter.api.Assertions.assertTrue;

class SmsVerificationServiceTest {

    private FakeSmsVerificationService service;

    @BeforeEach
    void setUp() {
        service = new FakeSmsVerificationService();
        ReflectionTestUtils.setField(service, "accessKeyId", "test-id");
        ReflectionTestUtils.setField(service, "accessKeySecret", "test-secret");
        ReflectionTestUtils.setField(service, "codeLength", 6);
        ReflectionTestUtils.setField(service, "expireMinutes", 5);
        ReflectionTestUtils.setField(service, "resendSeconds", 60);
        ReflectionTestUtils.setField(service, "maxSendsPerHour", 5);
        ReflectionTestUtils.setField(service, "maxVerifyAttempts", 5);
    }

    @Test
    void sendsAndConsumesVerificationCodeOnce() {
        int cooldown = service.sendCode("13800138000", "127.0.0.1");

        assertEquals(60, cooldown);
        assertTrue(service.lastCode.matches("\\d{6}"));
        service.verifyCode("13800138000", service.lastCode);
        assertThrows(SmsVerificationException.class,
                () -> service.verifyCode("13800138000", service.lastCode));
    }

    @Test
    void rejectsRapidResend() {
        service.sendCode("13800138000", "127.0.0.1");

        SmsVerificationException error = assertThrows(SmsVerificationException.class,
                () -> service.sendCode("13800138000", "127.0.0.1"));
        assertTrue(error.getMessage().contains("重新获取"));
    }

    @Test
    void rejectsInvalidPhone() {
        SmsVerificationException error = assertThrows(SmsVerificationException.class,
                () -> service.sendCode("123", "127.0.0.1"));
        assertEquals("请输入正确的11位手机号", error.getMessage());
    }

    private static class FakeSmsVerificationService extends SmsVerificationService {
        private String lastCode;

        @Override
        protected void sendByAliyun(String phone, String code) {
            this.lastCode = code;
        }
    }
}
