package com.ldai.controller;

import com.ldai.common.Result;
import com.ldai.config.AdminAuthValidator;
import com.ldai.service.AppAccountService;
import com.ldai.util.JwtUtil;
import org.springframework.web.bind.annotation.*;

import java.util.Map;

@RestController
@RequestMapping("/api/admin/app-account")
public class AdminAppAccountController {
    private final AppAccountService accountService;
    private final AdminAuthValidator authValidator;

    public AdminAppAccountController(AppAccountService accountService, AdminAuthValidator authValidator) {
        this.accountService = accountService;
        this.authValidator = authValidator;
    }

    @PostMapping("/open")
    public Result<Object> open(@RequestBody Map<String, String> params,
                               @RequestHeader(value = "Authorization", required = false) String authorization) {
        String error = requireAdmin(authorization); if (error != null) return Result.error(error);
        try { return Result.success(accountService.createAccount(params.get("phone"), params.get("nickname"))); }
        catch (AppAccountService.AccountException e) { return Result.error(e.getMessage()); }
    }

    @PostMapping("/reset-password")
    public Result<Object> reset(@RequestBody Map<String, Object> params,
                                @RequestHeader(value = "Authorization", required = false) String authorization) {
        String error = requireAdmin(authorization); if (error != null) return Result.error(error);
        try { return Result.success(accountService.resetPassword(longValue(params.get("userId")))); }
        catch (Exception e) { return Result.error(e instanceof AppAccountService.AccountException ? e.getMessage() : "参数错误"); }
    }

    @PostMapping("/status")
    public Result<Object> status(@RequestBody Map<String, Object> params,
                                 @RequestHeader(value = "Authorization", required = false) String authorization) {
        String error = requireAdmin(authorization); if (error != null) return Result.error(error);
        try {
            accountService.setEnabled(longValue(params.get("userId")), Boolean.parseBoolean(String.valueOf(params.get("enabled"))));
            return Result.success();
        } catch (Exception e) { return Result.error(e instanceof AppAccountService.AccountException ? e.getMessage() : "参数错误"); }
    }

    private String requireAdmin(String authorization) {
        String error = authValidator.validate(authorization);
        if (error != null) return error;
        String token = authValidator.normalizeToken(authorization);
        return "admin".equals(JwtUtil.getRole(token)) ? null : "仅管理员可执行此操作";
    }
    private Long longValue(Object value) { return value == null ? null : Long.valueOf(String.valueOf(value)); }
}
