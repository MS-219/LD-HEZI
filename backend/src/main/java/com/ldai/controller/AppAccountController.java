package com.ldai.controller;

import com.ldai.common.Result;
import com.ldai.service.AppAccountService;
import com.ldai.util.JwtUtil;
import org.springframework.web.bind.annotation.*;

import java.util.Map;

@RestController
@RequestMapping("/api/user/account")
public class AppAccountController {
    private final AppAccountService accountService;

    public AppAccountController(AppAccountService accountService) { this.accountService = accountService; }

    @PostMapping("/password/login")
    public Result<Object> passwordLogin(@RequestBody Map<String, String> params) {
        try { return Result.success(accountService.passwordLogin(params.get("phone"), params.get("password"))); }
        catch (AppAccountService.AccountException e) { return Result.error(e.getMessage()); }
    }

    @PostMapping("/password/change")
    public Result<Object> changePassword(@RequestBody Map<String, String> params,
                                         @RequestHeader(value = "Authorization", required = false) String authorization) {
        Long userId = appUserId(authorization);
        if (userId == null) return Result.error("登录已过期，请重新登录");
        try { return Result.success(accountService.changePassword(userId, params.get("oldPassword"), params.get("newPassword"))); }
        catch (AppAccountService.AccountException e) { return Result.error(e.getMessage()); }
    }

    @GetMapping("/session")
    public Result<Object> session(@RequestHeader(value = "Authorization", required = false) String authorization) {
        Long userId = appUserId(authorization);
        if (userId == null) return Result.error("登录已过期，请重新登录");
        try { return Result.success(accountService.sessionInfo(userId)); }
        catch (AppAccountService.AccountException e) { return Result.error(e.getMessage()); }
    }

    @PostMapping("/logout")
    public Result<Object> logout(@RequestHeader(value = "Authorization", required = false) String authorization) {
        Long userId = appUserId(authorization);
        if (userId != null) accountService.logout(userId);
        return Result.success();
    }

    private Long appUserId(String authorization) {
        if (authorization == null) return null;
        String token = authorization.startsWith("Bearer ") ? authorization.substring(7).trim() : authorization.trim();
        return JwtUtil.validateToken(token) && "app".equals(JwtUtil.getUserType(token)) ? JwtUtil.getUserId(token) : null;
    }
}
