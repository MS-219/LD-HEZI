package com.ldai.controller;

import com.ldai.common.Result;
import com.ldai.entity.AppUser;
import com.ldai.service.IAppUserService;
import com.ldai.service.IInviteService;
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
    private final IAppUserService appUserService;
    private final IInviteService inviteService;

    public SmsAuthController(SmsVerificationService smsVerificationService,
                             IAppUserService appUserService,
                             IInviteService inviteService) {
        this.smsVerificationService = smsVerificationService;
        this.appUserService = appUserService;
        this.inviteService = inviteService;
    }

    @PostMapping("/send")
    public Result<Object> send(@RequestBody Map<String, String> params, HttpServletRequest request) {
        try {
            int cooldown = smsVerificationService.sendCode(params.get("phone"), getClientIp(request));
            return Result.success(Map.of("cooldown", cooldown));
        } catch (SmsVerificationException e) {
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

        String deviceId = trimToNull(params.get("deviceId"));
        String inviteCode = trimToNull(params.get("inviteCode"));

        AppUser phoneUser = appUserService.getByPhone(phone);
        AppUser deviceUser = deviceId == null ? null : appUserService.getByOpenid("app_" + deviceId);
        boolean canUpgradeDeviceUser = deviceUser != null
                && (deviceUser.getPhone() == null || deviceUser.getPhone().isBlank());
        boolean isNewUser = phoneUser == null && !canUpgradeDeviceUser;

        try {
            String token = appUserService.phoneLogin(phone, deviceId);
            AppUser user = appUserService.getByPhone(phone);
            if (user == null) {
                log.error("手机号登录完成后未找到用户: phone={}", maskPhone(phone));
                return Result.error("登录失败，请稍后重试");
            }

            if (isNewUser && inviteCode != null) {
                try {
                    inviteService.handleNewUserInvite(user.getId(), inviteCode);
                } catch (Exception e) {
                    log.warn("短信注册绑定邀请关系失败: userId={}, inviteCode={}, error={}",
                            user.getId(), inviteCode, e.getMessage());
                }
            }

            return Result.success(Map.of(
                    "token", token,
                    "userId", user.getId(),
                    "isNewUser", isNewUser,
                    "nickname", user.getNickname() == null ? "" : user.getNickname(),
                    "avatarUrl", user.getAvatarUrl() == null ? "" : user.getAvatarUrl(),
                    "phone", phone,
                    "level", user.getLevel() == null ? 0 : user.getLevel()));
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

    private String trimToNull(String value) {
        if (value == null || value.isBlank()) {
            return null;
        }
        return value.trim();
    }

    private String maskPhone(String phone) {
        return phone.substring(0, 3) + "****" + phone.substring(7);
    }
}
