package com.ldai.service.impl;

import com.baomidou.mybatisplus.core.conditions.query.LambdaQueryWrapper;
import com.baomidou.mybatisplus.extension.service.impl.ServiceImpl;
import com.ldai.entity.SysUser;
import com.ldai.mapper.SysUserMapper;
import com.ldai.service.ISysUserService;
import com.ldai.util.JwtUtil;
import org.springframework.stereotype.Service;

@Service
public class SysUserServiceImpl extends ServiceImpl<SysUserMapper, SysUser> implements ISysUserService {

    @Override
    public String login(String username, String password) {
        LambdaQueryWrapper<SysUser> wrapper = new LambdaQueryWrapper<>();
        wrapper.eq(SysUser::getUsername, username);
        SysUser user = this.getOne(wrapper);

        if (user == null) {
            return null; // 用户不存在
        }

        // 简单密码比对（生产环境应使用加密）
        if (!user.getPassword().equals(password)) {
            return null; // 密码错误
        }

        String role = user.getRole() == null || user.getRole().isBlank() ? "admin" : user.getRole();

        // 生成 JWT Token
        return JwtUtil.generateToken(user.getId(), user.getUsername(), "admin", role);
    }
}
