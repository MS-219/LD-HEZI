package com.ldai.controller;

import com.baomidou.mybatisplus.extension.plugins.pagination.Page;
import com.ldai.common.Result;
import com.ldai.config.AdminAuthValidator;
import com.ldai.entity.AppRelease;
import com.ldai.service.AppReleaseService;
import com.ldai.util.JwtUtil;
import org.springframework.web.bind.annotation.*;
import org.springframework.web.multipart.MultipartFile;

import java.io.InputStream;
import java.nio.file.Files;
import java.nio.file.Path;
import java.nio.file.StandardCopyOption;
import java.security.MessageDigest;
import java.time.LocalDateTime;
import java.util.HexFormat;
import java.util.LinkedHashMap;
import java.util.Map;
import java.util.UUID;

@RestController
public class AppVersionController {
    private static final long MAX_APK_SIZE = 300L * 1024 * 1024;
    private final AppReleaseService releaseService;
    private final AdminAuthValidator authValidator;

    public AppVersionController(AppReleaseService releaseService, AdminAuthValidator authValidator) {
        this.releaseService = releaseService;
        this.authValidator = authValidator;
    }

    @GetMapping("/api/app/version/latest")
    public Result<Object> latest(@RequestParam(defaultValue = "android") String platform,
                                 @RequestParam(defaultValue = "0") Integer currentVersionCode) {
        AppRelease release = releaseService.lambdaQuery()
                .eq(AppRelease::getPlatform, platform)
                .eq(AppRelease::getPublished, true)
                .orderByDesc(AppRelease::getVersionCode)
                .last("LIMIT 1").one();
        if (release == null) return Result.success(Map.of("updateAvailable", false));
        Map<String, Object> data = releaseData(release);
        data.put("updateAvailable", release.getVersionCode() > currentVersionCode);
        data.put("forceUpdate", release.getVersionCode() > currentVersionCode);
        return Result.success(data);
    }

    @GetMapping("/api/admin/app-version/list")
    public Result<Object> list(@RequestParam(defaultValue = "1") Integer page,
                               @RequestParam(defaultValue = "20") Integer size,
                               @RequestHeader(value = "Authorization", required = false) String authorization) {
        String error = requireAdmin(authorization); if (error != null) return Result.error(error);
        return Result.success(releaseService.lambdaQuery().orderByDesc(AppRelease::getVersionCode)
                .page(new Page<>(page, Math.min(Math.max(size, 1), 100))));
    }

    @PostMapping("/api/admin/app-version/publish")
    public Result<Object> publish(@RequestParam("apk") MultipartFile apk,
                                  @RequestParam String versionName,
                                  @RequestParam Integer versionCode,
                                  @RequestParam(required = false, defaultValue = "") String releaseNotes,
                                  @RequestParam(required = false, defaultValue = "android") String platform,
                                  @RequestHeader(value = "Authorization", required = false) String authorization) {
        String error = requireAdmin(authorization); if (error != null) return Result.error(error);
        try {
            validate(apk, versionName, versionCode, platform);
            boolean exists = releaseService.lambdaQuery().eq(AppRelease::getPlatform, platform)
                    .eq(AppRelease::getVersionCode, versionCode).count() > 0;
            if (exists) return Result.error("该 versionCode 已存在");

            Path dir = Path.of(System.getProperty("user.dir"), "uploads", "app-releases");
            Files.createDirectories(dir);
            String storedName = platform + "-" + versionCode + "-" + UUID.randomUUID().toString().substring(0, 8) + ".apk";
            Path target = dir.resolve(storedName).normalize();
            MessageDigest digest = MessageDigest.getInstance("SHA-256");
            try (InputStream input = apk.getInputStream();
                 java.security.DigestInputStream dis = new java.security.DigestInputStream(input, digest)) {
                Files.copy(dis, target, StandardCopyOption.REPLACE_EXISTING);
            }

            AppRelease release = new AppRelease();
            release.setPlatform(platform);
            release.setVersionName(versionName.trim());
            release.setVersionCode(versionCode);
            release.setReleaseNotes(releaseNotes == null ? "" : releaseNotes.trim());
            release.setFileName(safeOriginalName(apk.getOriginalFilename()));
            release.setFilePath(storedName);
            release.setFileSize(Files.size(target));
            release.setSha256(HexFormat.of().formatHex(digest.digest()));
            release.setPublished(true);
            release.setCreateTime(LocalDateTime.now());
            release.setPublishedAt(LocalDateTime.now());
            release.setCreatedBy(authValidator.getAdminId(authorization));
            releaseService.save(release);
            return Result.success(releaseData(release));
        } catch (IllegalArgumentException e) {
            return Result.error(e.getMessage());
        } catch (Exception e) {
            return Result.error("版本发布失败，请稍后重试");
        }
    }

    private void validate(MultipartFile apk, String versionName, Integer versionCode, String platform) throws Exception {
        if (apk == null || apk.isEmpty()) throw new IllegalArgumentException("请选择 APK 文件");
        if (apk.getSize() > MAX_APK_SIZE) throw new IllegalArgumentException("APK 不能超过300MB");
        if (versionName == null || versionName.isBlank() || versionName.length() > 32) throw new IllegalArgumentException("版本名称不能为空且不能超过32字符");
        if (versionCode == null || versionCode <= 0) throw new IllegalArgumentException("versionCode 必须是正整数");
        if (!"android".equals(platform)) throw new IllegalArgumentException("目前仅支持 android 平台");
        String name = apk.getOriginalFilename();
        if (name == null || !name.toLowerCase().endsWith(".apk")) throw new IllegalArgumentException("仅支持 APK 文件");
        try (InputStream in = apk.getInputStream()) {
            if (in.read() != 'P' || in.read() != 'K') throw new IllegalArgumentException("APK 文件格式不正确");
        }
    }

    private Map<String, Object> releaseData(AppRelease release) {
        Map<String, Object> data = new LinkedHashMap<>();
        data.put("id", release.getId()); data.put("platform", release.getPlatform());
        data.put("versionName", release.getVersionName()); data.put("versionCode", release.getVersionCode());
        data.put("releaseNotes", release.getReleaseNotes() == null ? "" : release.getReleaseNotes());
        data.put("fileName", release.getFileName()); data.put("fileSize", release.getFileSize());
        data.put("sha256", release.getSha256()); data.put("downloadUrl", "/api/app-releases/" + release.getFilePath());
        data.put("publishedAt", release.getPublishedAt());
        return data;
    }

    private String requireAdmin(String authorization) {
        String error = authValidator.validate(authorization); if (error != null) return error;
        return "admin".equals(JwtUtil.getRole(authValidator.normalizeToken(authorization))) ? null : "仅管理员可执行此操作";
    }
    private String safeOriginalName(String name) {
        if (name == null) return "app.apk";
        String normalized = name.replace('\\', '/');
        return normalized.substring(normalized.lastIndexOf('/') + 1).replaceAll("[^A-Za-z0-9._\\-\\u4e00-\\u9fa5]", "_");
    }
}
