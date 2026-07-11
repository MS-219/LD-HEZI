package com.ldai.service;

import com.ldai.entity.AppUser;
import com.ldai.util.JwtUtil;
import org.springframework.security.crypto.bcrypt.BCryptPasswordEncoder;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.math.BigDecimal;
import java.security.SecureRandom;
import java.time.LocalDateTime;
import java.util.LinkedHashMap;
import java.util.Map;
import java.util.UUID;
import java.util.regex.Pattern;

@Service
public class AppAccountService {
    private static final Pattern PHONE = Pattern.compile("^1[3-9]\\d{9}$");
    private static final Pattern LETTER = Pattern.compile(".*[A-Za-z].*");
    private static final Pattern DIGIT = Pattern.compile(".*\\d.*");
    private static final String UPPER = "ABCDEFGHJKLMNPQRSTUVWXYZ";
    private static final String LOWER = "abcdefghijkmnopqrstuvwxyz";
    private static final String NUMBERS = "23456789";
    private static final String ALL = UPPER + LOWER + NUMBERS;
    private static final int MAX_FAILURES = 5;
    private static final int LOCK_MINUTES = 15;

    private final IAppUserService appUserService;
    private final BCryptPasswordEncoder passwordEncoder = new BCryptPasswordEncoder(12);
    private final SecureRandom random = new SecureRandom();

    public AppAccountService(IAppUserService appUserService) {
        this.appUserService = appUserService;
    }

    @Transactional
    public Map<String, Object> createAccount(String phone, String nickname) {
        phone = normalizePhone(phone);
        nickname = nickname == null ? "" : nickname.trim();
        if (!PHONE.matcher(phone).matches()) throw new AccountException("请输入正确的11位手机号");
        if (nickname.isBlank()) throw new AccountException("昵称不能为空");
        if (nickname.length() > 50) throw new AccountException("昵称不能超过50个字符");
        if (appUserService.getByPhone(phone) != null) throw new AccountException("该手机号账号已存在");

        String temporaryPassword = generateTemporaryPassword();
        AppUser user = new AppUser();
        user.setId(generateUniqueId());
        user.setOpenid("account_" + UUID.randomUUID().toString().replace("-", ""));
        user.setPhone(phone);
        user.setNickname(nickname);
        user.setBalance(BigDecimal.ZERO);
        user.setQuota(0);
        user.setLevel(0);
        user.setLevelManual(false);
        user.setAccountEnabled(true);
        user.setMustChangePassword(true);
        user.setPasswordHash(passwordEncoder.encode(temporaryPassword));
        user.setLoginFailCount(0);
        user.setPasswordUpdatedAt(LocalDateTime.now());
        user.setCreateTime(LocalDateTime.now());
        if (!appUserService.save(user)) throw new AccountException("账号创建失败");
        return Map.of("userId", user.getId(), "phone", phone, "nickname", nickname,
                "temporaryPassword", temporaryPassword);
    }

    @Transactional
    public Map<String, Object> resetPassword(Long userId) {
        AppUser user = requireUser(userId);
        String temporaryPassword = generateTemporaryPassword();
        user.setPasswordHash(passwordEncoder.encode(temporaryPassword));
        user.setMustChangePassword(true);
        user.setLoginFailCount(0);
        user.setLockedUntil(null);
        user.setSessionKey(newSessionKey());
        user.setPasswordUpdatedAt(LocalDateTime.now());
        appUserService.updateById(user);
        return Map.of("userId", user.getId(), "phone", nullToEmpty(user.getPhone()),
                "temporaryPassword", temporaryPassword);
    }

    @Transactional
    public void setEnabled(Long userId, boolean enabled) {
        AppUser user = requireUser(userId);
        user.setAccountEnabled(enabled);
        user.setSessionKey(newSessionKey());
        user.setLoginFailCount(0);
        user.setLockedUntil(null);
        appUserService.updateById(user);
    }

    @Transactional
    public Map<String, Object> passwordLogin(String phone, String password) {
        phone = normalizePhone(phone);
        AppUser user = appUserService.getByPhone(phone);
        if (user == null || user.getPasswordHash() == null || user.getPasswordHash().isBlank()) {
            throw new AccountException("手机号或密码错误");
        }
        ensureEnabled(user);
        LocalDateTime now = LocalDateTime.now();
        if (user.getLockedUntil() != null && user.getLockedUntil().isAfter(now)) {
            throw new AccountException("密码错误次数过多，请15分钟后再试");
        }
        if (password == null || !passwordEncoder.matches(password, user.getPasswordHash())) {
            int failures = (user.getLoginFailCount() == null ? 0 : user.getLoginFailCount()) + 1;
            user.setLoginFailCount(failures);
            if (failures >= MAX_FAILURES) {
                user.setLockedUntil(now.plusMinutes(LOCK_MINUTES));
                user.setLoginFailCount(0);
            }
            appUserService.updateById(user);
            throw new AccountException(failures >= MAX_FAILURES
                    ? "密码错误次数过多，账号已锁定15分钟" : "手机号或密码错误");
        }
        return establishSession(user);
    }

    public void assertSmsLoginAvailable(String phone) {
        AppUser user = appUserService.getByPhone(normalizePhone(phone));
        if (user == null || user.getPasswordHash() == null || user.getPasswordHash().isBlank()) {
            throw new AccountException("账号尚未开通，请联系管理员");
        }
        ensureEnabled(user);
    }

    @Transactional
    public Map<String, Object> smsLogin(String phone) {
        AppUser user = appUserService.getByPhone(normalizePhone(phone));
        if (user == null || user.getPasswordHash() == null || user.getPasswordHash().isBlank()) {
            throw new AccountException("账号尚未开通，请联系管理员");
        }
        ensureEnabled(user);
        return establishSession(user);
    }

    @Transactional
    public Map<String, Object> changePassword(Long userId, String oldPassword, String newPassword) {
        AppUser user = requireUser(userId);
        ensureEnabled(user);
        if (oldPassword == null || user.getPasswordHash() == null
                || !passwordEncoder.matches(oldPassword, user.getPasswordHash())) {
            throw new AccountException("当前密码不正确");
        }
        validateNewPassword(newPassword);
        if (passwordEncoder.matches(newPassword, user.getPasswordHash())) {
            throw new AccountException("新密码不能与当前密码相同");
        }
        user.setPasswordHash(passwordEncoder.encode(newPassword));
        user.setMustChangePassword(false);
        user.setLoginFailCount(0);
        user.setLockedUntil(null);
        user.setSessionKey(newSessionKey());
        user.setPasswordUpdatedAt(LocalDateTime.now());
        user.setLastLoginAt(LocalDateTime.now());
        appUserService.updateById(user);
        return loginPayload(user);
    }

    @Transactional
    public void logout(Long userId) {
        AppUser user = requireUser(userId);
        user.setSessionKey(newSessionKey());
        appUserService.updateById(user);
    }

    public Map<String, Object> sessionInfo(Long userId) {
        return loginPayload(requireUser(userId));
    }

    private Map<String, Object> establishSession(AppUser user) {
        user.setSessionKey(newSessionKey());
        user.setLoginFailCount(0);
        user.setLockedUntil(null);
        user.setLastLoginAt(LocalDateTime.now());
        appUserService.updateById(user);
        return loginPayload(user);
    }

    private Map<String, Object> loginPayload(AppUser user) {
        Map<String, Object> data = new LinkedHashMap<>();
        data.put("token", JwtUtil.generateAppToken(user.getId(), nullToEmpty(user.getPhone()), user.getSessionKey()));
        data.put("userId", user.getId());
        data.put("nickname", nullToEmpty(user.getNickname()));
        data.put("avatarUrl", nullToEmpty(user.getAvatarUrl()));
        data.put("phone", nullToEmpty(user.getPhone()));
        data.put("level", user.getLevel() == null ? 0 : user.getLevel());
        data.put("mustChangePassword", Boolean.TRUE.equals(user.getMustChangePassword()));
        return data;
    }

    public void validateNewPassword(String password) {
        if (password == null || password.length() < 8 || password.length() > 32
                || !LETTER.matcher(password).matches() || !DIGIT.matcher(password).matches()) {
            throw new AccountException("密码需为8-32位，且同时包含字母和数字");
        }
    }

    String generateTemporaryPassword() {
        char[] chars = new char[10];
        chars[0] = UPPER.charAt(random.nextInt(UPPER.length()));
        chars[1] = LOWER.charAt(random.nextInt(LOWER.length()));
        chars[2] = NUMBERS.charAt(random.nextInt(NUMBERS.length()));
        for (int i = 3; i < chars.length; i++) chars[i] = ALL.charAt(random.nextInt(ALL.length()));
        for (int i = chars.length - 1; i > 0; i--) {
            int j = random.nextInt(i + 1);
            char t = chars[i]; chars[i] = chars[j]; chars[j] = t;
        }
        return new String(chars);
    }

    private Long generateUniqueId() {
        for (int i = 0; i < 1000; i++) {
            long id = 100000L + random.nextInt(900000);
            if (appUserService.getById(id) == null) return id;
        }
        throw new AccountException("用户ID生成失败，请重试");
    }

    private AppUser requireUser(Long userId) {
        AppUser user = userId == null ? null : appUserService.getById(userId);
        if (user == null) throw new AccountException("账号不存在");
        return user;
    }

    private void ensureEnabled(AppUser user) {
        if (!Boolean.TRUE.equals(user.getAccountEnabled())) throw new AccountException("账号已停用，请联系管理员");
    }

    private String normalizePhone(String phone) { return phone == null ? "" : phone.replaceAll("\\s+", "").trim(); }
    private String newSessionKey() { return UUID.randomUUID().toString().replace("-", ""); }
    private String nullToEmpty(String value) { return value == null ? "" : value; }

    public static class AccountException extends RuntimeException {
        public AccountException(String message) { super(message); }
    }
}
