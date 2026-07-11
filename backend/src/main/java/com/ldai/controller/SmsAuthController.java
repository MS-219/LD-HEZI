package com.ldai.controller;

import com.ldai.common.Result;
import com.ldai.service.SmsVerificationService;
import com.ldai.service.SmsVerificationService.SmsVerificationException;
import jakarta.servlet.http.HttpServletRequest;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.RequestBody;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RestController;

import java.util.Map;

/** App 手机号短信验证码登录。 */
@RestController
@RequestMapping("/api/user/sms")
public class SmsAuthController {

    private static final Logger log = LoggerFactory.getLogger(SmsAuthController.class);

    private final SmsVerificationService smsVerificationService;
    private final com.ldai.service.AppAccountService accountService;

    public SmsAuthController(SmsVerificationService smsVerificationService,
                             com.ldai.service.AppAccountService accountService) {
        this.smsVerificationService = smsVerificationService;
        this.accountService = accountService;
    }

    @PostMapping("/send")
    public Result<Object> send(@RequestBody Map<String, String> params, HttpServletRequest request) {
        try {
            String phone = smsVerificationService.normalizePhone(params.get("phone"));
            accountService.assertSmsLoginAvailable(phone);
            int cooldown = smsVerificationService.sendCode(phone, getClientIp(request));
            return Result.success(Map.of("cooldown", cooldown));
        } catch (SmsVerificationException | com.ldai.service.AppAccountService.AccountException e) {
            return Result.error(e.getMessage());
        }
    }

    @PostMapping("/login")
    public Result<Object> login(@RequestBody Map<String, String> params) {
        String phone;
        try {
            phone = smsVerificationService.normalizePhone(params.get("phone"));
            smsVerificationService.verifyCode(phone, params.get("code"));
        } catch (SmsVerificationException e) {
            return Result.error(e.getMessage());
        }

        try {
            return Result.success(accountService.smsLogin(phone));
        } catch (com.ldai.service.AppAccountService.AccountException e) {
            return Result.error(e.getMessage());
        } catch (Exception e) {
            log.error("手机号登录失败: phone={}", maskPhone(phone), e);
            return Result.error("登录失败，请稍后重试");
        }
    }

    private String getClientIp(HttpServletRequest request) {
        String forwarded = request.getHeader("X-Forwarded-For");
        if (forwarded != null && !forwarded.isBlank()) {
            return forwarded.split(",")[0].trim();
        }
        String realIp = request.getHeader("X-Real-IP");
        return realIp == null || realIp.isBlank() ? request.getRemoteAddr() : realIp.trim();
    }

    private String maskPhone(String phone) {
        return phone.substring(0, 3) + "****" + phone.substring(7);
    }
}
