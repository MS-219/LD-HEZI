package com.ldai.service;

import com.aliyun.dysmsapi20170525.Client;
import com.aliyun.dysmsapi20170525.models.SendSmsRequest;
import com.aliyun.dysmsapi20170525.models.SendSmsResponse;
import com.aliyun.teaopenapi.models.Config;
import com.fasterxml.jackson.databind.ObjectMapper;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.stereotype.Service;

import java.nio.charset.StandardCharsets;
import java.security.MessageDigest;
import java.security.SecureRandom;
import java.time.Duration;
import java.time.Instant;
import java.util.ArrayDeque;
import java.util.Deque;
import java.util.Map;
import java.util.concurrent.ConcurrentHashMap;
import java.util.concurrent.ConcurrentMap;
import java.util.concurrent.atomic.AtomicInteger;
import java.util.regex.Pattern;

/**
 * 阿里云短信验证码服务。
 *
 * 验证码仅保存在当前后端进程内，适用于当前单实例部署；如果将来扩容为多实例，
 * 应把验证码和频率限制迁移到 Redis。
 */
@Service
public class SmsVerificationService {

    private static final Logger log = LoggerFactory.getLogger(SmsVerificationService.class);
    private static final Pattern CHINA_MOBILE = Pattern.compile("^1[3-9]\\d{9}$");
    private static final SecureRandom RANDOM = new SecureRandom();
    private static final ObjectMapper OBJECT_MAPPER = new ObjectMapper();

    private final ConcurrentMap<String, VerificationEntry> codes = new ConcurrentHashMap<>();
    private final ConcurrentMap<String, Deque<Long>> phoneSendHistory = new ConcurrentHashMap<>();
    private final ConcurrentMap<String, Deque<Long>> ipSendHistory = new ConcurrentHashMap<>();
    private final Object[] locks = new Object[64];

    @Value("${aliyun.sms.access-key-id:}")
    private String accessKeyId;

    @Value("${aliyun.sms.access-key-secret:}")
    private String accessKeySecret;

    @Value("${aliyun.sms.sign-name}")
    private String signName;

    @Value("${aliyun.sms.template-code}")
    private String templateCode;

    @Value("${aliyun.sms.code-length:6}")
    private int codeLength;

    @Value("${aliyun.sms.expire-minutes:5}")
    private int expireMinutes;

    @Value("${aliyun.sms.resend-seconds:60}")
    private int resendSeconds;

    @Value("${aliyun.sms.max-sends-per-hour:5}")
    private int maxSendsPerHour;

    @Value("${aliyun.sms.max-verify-attempts:5}")
    private int maxVerifyAttempts;

    public SmsVerificationService() {
        for (int i = 0; i < locks.length; i++) {
            locks[i] = new Object();
        }
    }

    /**
     * 发送验证码，返回客户端应使用的倒计时秒数。
     */
    public int sendCode(String rawPhone, String clientIp) {
        String phone = normalizePhone(rawPhone);
        String ip = clientIp == null || clientIp.isBlank() ? "unknown" : clientIp.trim();

        if (accessKeyId == null || accessKeyId.isBlank()
                || accessKeySecret == null || accessKeySecret.isBlank()) {
            throw new SmsVerificationException("短信服务尚未配置，请联系管理员");
        }

        Object lock = locks[Math.floorMod(phone.hashCode(), locks.length)];
        synchronized (lock) {
            long now = System.currentTimeMillis();
            enforceResendInterval(phone, now);
            enforceHourlyLimit(phoneSendHistory, phone, maxSendsPerHour, now, "该手机号发送过于频繁，请稍后再试");
            // 同一来源 IP 每小时最多为 20 个号码发送，避免批量刷短信。
            enforceHourlyLimit(ipSendHistory, ip, Math.max(20, maxSendsPerHour * 4), now,
                    "当前网络请求过于频繁，请稍后再试");

            String code = generateCode();
            sendByAliyun(phone, code);

            byte[] salt = new byte[16];
            RANDOM.nextBytes(salt);
            codes.put(phone, new VerificationEntry(
                    hashCode(phone, code, salt),
                    salt,
                    Instant.now().plus(Duration.ofMinutes(expireMinutes)),
                    now,
                    new AtomicInteger(0)));
            appendHistory(phoneSendHistory, phone, now);
            appendHistory(ipSendHistory, ip, now);
            return resendSeconds;
        }
    }

    /**
     * 校验并一次性消费验证码。
     */
    public void verifyCode(String rawPhone, String rawCode) {
        String phone = normalizePhone(rawPhone);
        String code = rawCode == null ? "" : rawCode.trim();
        if (!code.matches("\\d{" + codeLength + "}")) {
            throw new SmsVerificationException("请输入" + codeLength + "位数字验证码");
        }

        Object lock = locks[Math.floorMod(phone.hashCode(), locks.length)];
        synchronized (lock) {
            VerificationEntry entry = codes.get(phone);
            if (entry == null) {
                throw new SmsVerificationException("请先获取短信验证码");
            }
            if (Instant.now().isAfter(entry.expiresAt())) {
                codes.remove(phone, entry);
                throw new SmsVerificationException("验证码已过期，请重新获取");
            }
            int attempts = entry.attempts().incrementAndGet();
            if (attempts > maxVerifyAttempts) {
                codes.remove(phone, entry);
                throw new SmsVerificationException("验证码错误次数过多，请重新获取");
            }

            byte[] actual = hashCode(phone, code, entry.salt());
            if (!MessageDigest.isEqual(entry.codeHash(), actual)) {
                if (attempts >= maxVerifyAttempts) {
                    codes.remove(phone, entry);
                    throw new SmsVerificationException("验证码错误次数过多，请重新获取");
                }
                throw new SmsVerificationException("验证码错误");
            }
            codes.remove(phone, entry);
        }
    }

    public String normalizePhone(String rawPhone) {
        String phone = rawPhone == null ? "" : rawPhone.replaceAll("\\s+", "").trim();
        if (!CHINA_MOBILE.matcher(phone).matches()) {
            throw new SmsVerificationException("请输入正确的11位手机号");
        }
        return phone;
    }

    protected void sendByAliyun(String phone, String code) {
        try {
            Config config = new Config()
                    .setAccessKeyId(accessKeyId.trim())
                    .setAccessKeySecret(accessKeySecret.trim())
                    .setEndpoint("dysmsapi.aliyuncs.com");
            Client client = new Client(config);
            String templateParam = OBJECT_MAPPER.writeValueAsString(Map.of("code", code));
            SendSmsRequest request = new SendSmsRequest()
                    .setPhoneNumbers(phone)
                    .setSignName(signName)
                    .setTemplateCode(templateCode)
                    .setTemplateParam(templateParam);
            SendSmsResponse response = client.sendSms(request);
            String resultCode = response == null || response.getBody() == null
                    ? null
                    : response.getBody().getCode();
            if (!"OK".equalsIgnoreCase(resultCode)) {
                String message = response == null || response.getBody() == null
                        ? "empty response"
                        : response.getBody().getMessage();
                String requestId = response == null || response.getBody() == null
                        ? null
                        : response.getBody().getRequestId();
                log.warn("阿里云短信发送失败: phone={}, code={}, message={}, requestId={}",
                        maskPhone(phone), resultCode, message, requestId);
                throw new SmsVerificationException(toUserMessage(resultCode));
            }
            log.info("短信验证码发送成功: phone={}, requestId={}", maskPhone(phone),
                    response.getBody().getRequestId());
        } catch (SmsVerificationException e) {
            throw e;
        } catch (Exception e) {
            log.error("调用阿里云短信服务异常: phone={}", maskPhone(phone), e);
            throw new SmsVerificationException("短信发送失败，请稍后重试");
        }
    }

    private String toUserMessage(String aliyunCode) {
        if (aliyunCode == null) {
            return "短信发送失败，请稍后重试";
        }
        return switch (aliyunCode) {
            case "isv.BUSINESS_LIMIT_CONTROL" -> "发送过于频繁，请稍后再试";
            case "isv.MOBILE_NUMBER_ILLEGAL" -> "手机号码格式不正确";
            case "isv.SMS_SIGNATURE_ILLEGAL", "isv.SMS_TEMPLATE_ILLEGAL",
                    "isv.SMS_SIGNATURE_SCENE_ILLEGAL" -> "短信签名或模板尚未生效，请联系管理员";
            default -> "短信发送失败，请稍后重试";
        };
    }

    private void enforceResendInterval(String phone, long now) {
        VerificationEntry current = codes.get(phone);
        if (current == null) {
            return;
        }
        long elapsed = now - current.sentAtMillis();
        long intervalMillis = resendSeconds * 1000L;
        if (elapsed < intervalMillis) {
            long remaining = Math.max(1, (intervalMillis - elapsed + 999) / 1000);
            throw new SmsVerificationException("请在" + remaining + "秒后重新获取");
        }
    }

    private void enforceHourlyLimit(ConcurrentMap<String, Deque<Long>> histories,
                                    String key,
                                    int limit,
                                    long now,
                                    String message) {
        Deque<Long> history = histories.computeIfAbsent(key, ignored -> new ArrayDeque<>());
        synchronized (history) {
            pruneHistory(history, now);
            if (history.size() >= limit) {
                throw new SmsVerificationException(message);
            }
        }
    }

    private void appendHistory(ConcurrentMap<String, Deque<Long>> histories, String key, long now) {
        Deque<Long> history = histories.computeIfAbsent(key, ignored -> new ArrayDeque<>());
        synchronized (history) {
            pruneHistory(history, now);
            history.addLast(now);
        }
    }

    private void pruneHistory(Deque<Long> history, long now) {
        long cutoff = now - Duration.ofHours(1).toMillis();
        while (!history.isEmpty() && history.peekFirst() < cutoff) {
            history.removeFirst();
        }
    }

    private String generateCode() {
        int bound = (int) Math.pow(10, codeLength);
        int minimum = (int) Math.pow(10, codeLength - 1);
        return String.valueOf(minimum + RANDOM.nextInt(bound - minimum));
    }

    private byte[] hashCode(String phone, String code, byte[] salt) {
        try {
            MessageDigest digest = MessageDigest.getInstance("SHA-256");
            digest.update(salt);
            digest.update(phone.getBytes(StandardCharsets.UTF_8));
            digest.update((byte) ':');
            digest.update(code.getBytes(StandardCharsets.UTF_8));
            return digest.digest();
        } catch (Exception e) {
            throw new IllegalStateException("无法初始化验证码摘要", e);
        }
    }

    private String maskPhone(String phone) {
        if (phone == null || phone.length() < 7) {
            return "***";
        }
        return phone.substring(0, 3) + "****" + phone.substring(phone.length() - 4);
    }

    private record VerificationEntry(byte[] codeHash,
                                     byte[] salt,
                                     Instant expiresAt,
                                     long sentAtMillis,
                                     AtomicInteger attempts) {
        private VerificationEntry {
            codeHash = codeHash.clone();
            salt = salt.clone();
        }

        @Override
        public byte[] codeHash() {
            return codeHash.clone();
        }

        @Override
        public byte[] salt() {
            return salt.clone();
        }
    }

    public static class SmsVerificationException extends RuntimeException {
        public SmsVerificationException(String message) {
            super(message);
        }
    }
}
