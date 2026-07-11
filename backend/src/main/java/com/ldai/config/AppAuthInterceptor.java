package com.ldai.config;

import com.fasterxml.jackson.databind.ObjectMapper;
import com.ldai.entity.AppUser;
import com.ldai.service.IAppUserService;
import com.ldai.util.JwtUtil;
import jakarta.servlet.http.HttpServletRequest;
import jakarta.servlet.http.HttpServletResponse;
import org.springframework.http.MediaType;
import org.springframework.stereotype.Component;
import org.springframework.web.servlet.HandlerInterceptor;

import java.nio.charset.StandardCharsets;
import java.util.Map;

/** 对所有携带 App Token 的请求执行账号状态、单会话和首次改密校验。 */
@Component
public class AppAuthInterceptor implements HandlerInterceptor {
    private final IAppUserService appUserService;
    private final ObjectMapper objectMapper;

    public AppAuthInterceptor(IAppUserService appUserService, ObjectMapper objectMapper) {
        this.appUserService = appUserService;
        this.objectMapper = objectMapper;
    }

    @Override
    public boolean preHandle(HttpServletRequest request, HttpServletResponse response, Object handler) throws Exception {
        String uri = request.getRequestURI();
        if ("/api/app/version/latest".equals(uri) || uri.startsWith("/api/app-releases/")) {
            return true;
        }
        String token = normalize(request.getHeader("Authorization"));
        if (token == null || !JwtUtil.validateToken(token) || !"app".equals(JwtUtil.getUserType(token))) {
            return true; // 公共接口及后台 Token 继续交给原控制器校验。
        }
        Long userId = JwtUtil.getUserId(token);
        AppUser user = userId == null ? null : appUserService.getById(userId);
        if (user == null || !Boolean.TRUE.equals(user.getAccountEnabled())) {
            return reject(response, 401, "账号已停用或不存在，请联系管理员");
        }
        String tokenSessionKey = JwtUtil.getSessionKey(token);
        if (tokenSessionKey == null || !tokenSessionKey.equals(user.getSessionKey())) {
            return reject(response, 401, "账号已在其他设备登录，请重新登录");
        }
        if (Boolean.TRUE.equals(user.getMustChangePassword()) && !isPasswordSetupPath(request.getRequestURI())) {
            return reject(response, 428, "请先修改临时密码");
        }
        request.setAttribute("appUserId", userId);
        return true;
    }

    private boolean isPasswordSetupPath(String uri) {
        return uri.equals("/api/user/account/password/change")
                || uri.equals("/api/user/account/session")
                || uri.equals("/api/user/account/logout");
    }

    private boolean reject(HttpServletResponse response, int code, String message) throws Exception {
        response.setStatus(HttpServletResponse.SC_OK);
        response.setCharacterEncoding(StandardCharsets.UTF_8.name());
        response.setContentType(MediaType.APPLICATION_JSON_VALUE);
        objectMapper.writeValue(response.getWriter(), Map.of("code", code, "msg", message, "data", Map.of()));
        return false;
    }

    private String normalize(String authorization) {
        if (authorization == null || authorization.isBlank()) return null;
        String token = authorization.trim();
        return token.startsWith("Bearer ") ? token.substring(7).trim() : token;
    }
}
