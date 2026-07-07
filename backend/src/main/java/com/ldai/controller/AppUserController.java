package com.ldai.controller;

import com.baomidou.mybatisplus.extension.plugins.pagination.Page;
import com.ldai.common.Result;
import com.ldai.entity.AppUser;
import com.ldai.mapper.DeviceEarningsMapper;
import com.ldai.service.IAppUserService;
import com.ldai.service.IDeviceService;
import com.ldai.service.IAiTaskService;
import com.ldai.service.IWechatService;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.web.bind.annotation.*;

import java.util.Map;

/**
 * 小程序用户控制器
 */
@RestController
@RequestMapping("/api/user")
public class AppUserController {

    @Autowired
    private IAppUserService appUserService;

    @Autowired
    private IWechatService wechatService;

    @Autowired
    private IDeviceService deviceService;

    @Autowired
    private IAiTaskService aiTaskService;

    @Autowired
    private DeviceEarningsMapper earningsMapper;

    @Autowired
    private com.ldai.service.IInviteService inviteService;

    @Autowired
    private com.ldai.service.ISystemConfigService configService;

    /**
     * 微信一键登录
     * 请求参数:
     * - code: 小程序 wx.login() 获取的 code (必填)
     * - nickname: 用户昵称 (可选)
     * - avatarUrl: 用户头像 (可选)
     * - inviteCode: 邀请码 (可选，新用户注册时使用)
     */
    @PostMapping("/wxLogin")
    public Result<Object> wxLogin(@RequestBody Map<String, String> params) {
        String code = params.get("code");
        String nickname = params.get("nickname");
        String avatarUrl = params.get("avatarUrl");
        String inviteCode = params.get("inviteCode");

        // code 必填
        if (code == null || code.isEmpty()) {
            return Result.error("code 不能为空");
        }

        // 调用微信接口换取 openid
        String openid = wechatService.code2Session(code);

        if (openid == null || openid.isEmpty()) {
            return Result.error("微信登录失败，请重试");
        }

        // 检查是否是新用户
        AppUser existingUser = appUserService.getByOpenid(openid);
        boolean isNewUser = (existingUser == null);

        // 登录或注册用户
        String token = appUserService.wxLogin(openid);
        AppUser user = appUserService.getByOpenid(openid);

        // 如果是新用户且有邀请码，处理邀请关系
        if (isNewUser && inviteCode != null && !inviteCode.isEmpty()) {
            try {
                inviteService.handleNewUserInvite(user.getId(), inviteCode);
            } catch (Exception e) {
                // 邀请关系绑定失败不影响登录
                org.slf4j.LoggerFactory.getLogger(AppUserController.class)
                        .warn("邀请关系绑定失败: userId={}, inviteCode={}, error={}",
                                user.getId(), inviteCode, e.getMessage());
            }
        }

        // 如果传了头像和昵称，更新用户信息
        if ((nickname != null && !nickname.isEmpty()) ||
                (avatarUrl != null && !avatarUrl.isEmpty())) {
            boolean needUpdate = false;

            if (nickname != null && !nickname.isEmpty() &&
                    (user.getNickname() == null || user.getNickname().equals("微信用户"))) {
                user.setNickname(nickname);
                needUpdate = true;
            }

            if (avatarUrl != null && !avatarUrl.isEmpty() &&
                    (user.getAvatarUrl() == null || user.getAvatarUrl().isEmpty())) {
                user.setAvatarUrl(avatarUrl);
                needUpdate = true;
            }

            if (needUpdate) {
                appUserService.updateById(user);
            }
        }

        return Result.success(Map.of(
                "token", token,
                "userId", user.getId(),
                "isNewUser", isNewUser,
                "nickname", user.getNickname() != null ? user.getNickname() : "",
                "avatarUrl", user.getAvatarUrl() != null ? user.getAvatarUrl() : "",
                "level", user.getLevel() != null ? user.getLevel() : 0));
    }

    /**
     * Android App 登录/注册。
     *
     * App 端没有 wx.login，这里使用设备侧生成的稳定 deviceId 作为 app openid。
     */
    @PostMapping("/appLogin")
    public Result<Object> appLogin(@RequestBody Map<String, String> params) {
        String deviceId = params.get("deviceId");
        String nickname = params.get("nickname");
        String avatarUrl = params.get("avatarUrl");
        String inviteCode = params.get("inviteCode");

        if (deviceId == null || deviceId.isBlank()) {
            return Result.error("deviceId 不能为空");
        }

        String appOpenid = "app_" + deviceId.trim();
        AppUser existingUser = appUserService.getByOpenid(appOpenid);
        boolean isNewUser = existingUser == null;

        String token = appUserService.wxLogin(appOpenid);
        AppUser user = appUserService.getByOpenid(appOpenid);

        if (isNewUser && inviteCode != null && !inviteCode.isBlank()) {
            try {
                inviteService.handleNewUserInvite(user.getId(), inviteCode);
            } catch (Exception e) {
                org.slf4j.LoggerFactory.getLogger(AppUserController.class)
                        .warn("App 邀请关系绑定失败: userId={}, inviteCode={}, error={}",
                                user.getId(), inviteCode, e.getMessage());
            }
        }

        boolean needUpdate = false;
        if (nickname != null && !nickname.isBlank()
                && (user.getNickname() == null || user.getNickname().equals("微信用户"))) {
            user.setNickname(nickname.trim());
            needUpdate = true;
        }
        if (avatarUrl != null && !avatarUrl.isBlank()
                && (user.getAvatarUrl() == null || user.getAvatarUrl().isEmpty())) {
            user.setAvatarUrl(avatarUrl.trim());
            needUpdate = true;
        }
        if (needUpdate) {
            appUserService.updateById(user);
        }

        return Result.success(Map.of(
                "token", token,
                "userId", user.getId(),
                "isNewUser", isNewUser,
                "nickname", user.getNickname() != null ? user.getNickname() : "",
                "avatarUrl", user.getAvatarUrl() != null ? user.getAvatarUrl() : "",
                "level", user.getLevel() != null ? user.getLevel() : 0));
    }

    /**
     * 更新用户头像和昵称
     * 安全修复：需要JWT Token验证，用户只能更新自己的资料
     */
    @PostMapping("/updateProfile")
    public Result<String> updateProfile(
            @RequestBody Map<String, Object> params,
            @RequestHeader(value = "Authorization", required = false) String token) {

        // 安全验证
        if (token == null || token.isEmpty()) {
            return Result.error("未登录，请先登录");
        }
        if (token.startsWith("Bearer ")) {
            token = token.substring(7);
        }
        if (!com.ldai.util.JwtUtil.validateToken(token)) {
            return Result.error("登录已过期，请重新登录");
        }
        Long tokenUserId = com.ldai.util.JwtUtil.getUserId(token);
        if (tokenUserId == null) {
            return Result.error("无效的Token");
        }

        Object userIdObj = params.get("userId");
        if (userIdObj == null) {
            return Result.error("用户ID不能为空");
        }
        Long userId = Long.valueOf(userIdObj.toString());

        // 验证用户只能更新自己的资料
        if (!tokenUserId.equals(userId)) {
            return Result.error("无权修改其他用户资料");
        }

        String nickname = (String) params.get("nickname");
        String avatarUrl = (String) params.get("avatarUrl");

        // 使用 LambdaUpdate 仅更新传入的字段，防止覆盖其他属性（如手机号、余额等）
        com.baomidou.mybatisplus.extension.conditions.update.LambdaUpdateChainWrapper<AppUser> updateWrapper = appUserService
                .lambdaUpdate().eq(AppUser::getId, userId);

        boolean hasUpdate = false;
        if (nickname != null && !nickname.trim().isEmpty()) {
            updateWrapper.set(AppUser::getNickname, nickname.trim());
            hasUpdate = true;
        }
        if (avatarUrl != null && !avatarUrl.trim().isEmpty()) {
            updateWrapper.set(AppUser::getAvatarUrl, avatarUrl.trim());
            hasUpdate = true;
        }

        if (!hasUpdate) {
            return Result.success("无需更新");
        }

        boolean success = updateWrapper.update();
        return success ? Result.success("更新成功") : Result.error("更新失败");
    }

    /**
     * 获取用户信息
     */
    @GetMapping("/info/{id}")
    public Result<AppUser> getInfo(@PathVariable Long id) {
        AppUser user = appUserService.getById(id);
        if (user == null) {
            return Result.error("用户不存在");
        }
        // 强制根据余额同步聚芯算力值并保存到数据库
        if (user.getBalance() != null) {
            try {
                int hashrateRate = Integer.parseInt(configService.getConfig("earnings.hashratePerYuan", "100"));
                int calculatedQuota = user.getBalance().multiply(new java.math.BigDecimal(hashrateRate)).intValue();

                // 如果数据库中的值与计算值不一致，则更新数据库
                if (user.getQuota() == null || user.getQuota() != calculatedQuota) {
                    user.setQuota(calculatedQuota);
                    appUserService.updateById(user);
                    System.out.println(
                            "Syncing quota for user " + id + ": " + user.getQuota() + " -> " + calculatedQuota);
                }
            } catch (Exception e) {
                // 降级处理
                if (user.getQuota() == null)
                    user.setQuota(0);
            }
        }
        return Result.success(user);
    }

    /**
     * 更新用户信息（管理员专用接口）
     * 安全修复：需要管理员权限
     */
    @PostMapping("/update")
    public Result<String> update(
            @RequestBody AppUser user,
            @RequestHeader(value = "Authorization", required = false) String token) {

        // 安全验证：仅管理员可用
        if (token == null || token.isEmpty()) {
            return Result.error("未登录，请先登录");
        }
        if (token.startsWith("Bearer ")) {
            token = token.substring(7);
        }
        if (!com.ldai.util.JwtUtil.validateToken(token)) {
            return Result.error("登录已过期，请重新登录");
        }
        String userType = com.ldai.util.JwtUtil.getUserType(token);
        if (!"admin".equals(userType)) {
            return Result.error("无权限执行此操作");
        }

        if (user.getId() == null) {
            return Result.error("用户ID不能为空");
        }

        if (user.getUserType() != null
                && !"personal".equals(user.getUserType())
                && !"company".equals(user.getUserType())) {
            return Result.error("用户类型不正确");
        }
        if (user.getRemark() != null && user.getRemark().length() > 500) {
            return Result.error("备注最多500个字符");
        }

        // 校验邀请人ID合法性
        if (user.getInviterId() != null) {
            if (user.getInviterId().equals(user.getId())) {
                return Result.error("邀请人不能是用户自己");
            }
            AppUser inviter = appUserService.getById(user.getInviterId());
            if (inviter == null) {
                return Result.error("指定的邀请人ID不存在");
            }
        }

        boolean success = appUserService.updateById(user);
        return success ? Result.success("更新成功") : Result.error("更新失败");
    }

    /**
     * 手动设置用户等级（后台管理员操作，优先级高于自动升级）
     */
    @PostMapping("/updateLevel")
    public Result<String> updateLevel(@RequestBody Map<String, Object> params) {
        Long userId = Long.valueOf(params.get("userId").toString());
        Integer level = Integer.valueOf(params.get("level").toString());
        // 允许外部传入 levelManual，默认 true (为了兼容旧逻辑)
        Boolean levelManual = params.get("levelManual") != null ? (Boolean) params.get("levelManual") : true;

        AppUser user = appUserService.getById(userId);
        if (user == null) {
            return Result.error("用户不存在");
        }

        if (level < 0 || level > 5) {
            return Result.error("等级必须在 0-5 之间");
        }

        user.setLevel(level);
        user.setLevelManual(levelManual); // 设置手动标记

        boolean success = appUserService.updateById(user);

        // 如果解除锁定，立即同步该用户的等级
        if (success) {
            try {
                appUserService.updateLevel(userId);
            } catch (Exception e) {
                // 防止等级重算失败影响保存响应
            }
        }

        return success ? Result.success("等级设置成功，系统已自动同步晋升状态") : Result.error("设置失败");
    }

    /**
     * 设置用户是否禁止提现（管理员专用）
     */
    @PostMapping("/toggleWithdraw")
    public Result<String> toggleWithdraw(
            @RequestBody Map<String, Object> params,
            @RequestHeader(value = "Authorization", required = false) String token) {

        // 安全验证：仅管理员可用
        if (token == null || token.isEmpty()) {
            return Result.error("未登录，请先登录");
        }
        if (token.startsWith("Bearer ")) {
            token = token.substring(7);
        }
        if (!com.ldai.util.JwtUtil.validateToken(token)) {
            return Result.error("登录已过期，请重新登录");
        }
        String userType = com.ldai.util.JwtUtil.getUserType(token);
        if (!"admin".equals(userType)) {
            return Result.error("无权限执行此操作");
        }

        Long userId = Long.valueOf(params.get("userId").toString());
        Boolean disabled = Boolean.valueOf(params.get("disabled").toString());

        AppUser user = appUserService.getById(userId);
        if (user == null) {
            return Result.error("用户不存在");
        }

        user.setWithdrawDisabled(disabled);
        boolean success = appUserService.updateById(user);

        return success ? Result.success(disabled ? "已禁止该用户提现" : "已恢复该用户提现权限") : Result.error("操作失败");
    }

    /**
     * 更新用户的邀请人
     */
    @PostMapping("/updateInviter")
    public Result<String> updateInviter(@RequestBody Map<String, Object> params) {
        Long userId = Long.valueOf(params.get("userId").toString());
        // 允许 inviterId 为 null 或 0 (表示清除邀请人)
        Long inviterId = null;
        if (params.get("inviterId") != null && !params.get("inviterId").toString().isEmpty()) {
            inviterId = Long.valueOf(params.get("inviterId").toString());
            if (inviterId == 0) {
                inviterId = null;
            }
        }

        if (userId.equals(inviterId)) {
            return Result.error("邀请人不能是用户自己");
        }

        AppUser user = appUserService.getById(userId);
        if (user == null) {
            return Result.error("用户不存在");
        }

        if (inviterId != null) {
            AppUser inviter = appUserService.getById(inviterId);
            if (inviter == null) {
                return Result.error("指定的邀请人不存在");
            }
        }

        user.setInviterId(inviterId);
        boolean success = appUserService.updateById(user);

        return success ? Result.success("邀请人更新成功") : Result.error("更新失败");
    }

    /**
     * 绑定手机号
     * 通过微信 getPhoneNumber 获取的 code 换取手机号
     */
    @PostMapping("/bindPhone")
    public Result<Object> bindPhone(@RequestBody Map<String, Object> params) {
        Long userId = Long.valueOf(params.get("userId").toString());
        String code = (String) params.get("code");

        if (code == null || code.isEmpty()) {
            return Result.error("code 不能为空");
        }

        AppUser user = appUserService.getById(userId);
        if (user == null) {
            return Result.error("用户不存在");
        }

        // 调用微信接口获取手机号
        String phone = wechatService.getPhoneNumber(code);
        if (phone == null || phone.isEmpty()) {
            return Result.error("获取手机号失败");
        }

        user.setPhone(phone);
        boolean success = appUserService.updateById(user);

        if (success) {
            return Result.success(Map.of("phone", phone));
        } else {
            return Result.error("绑定失败");
        }
    }

    /**
     * 获取用户列表（分页）- 包含设备数、任务数和邀请人信息（管理员专用）
     * 安全修复：需要管理员权限
     */
    @GetMapping("/list")
    public Result<Object> list(
            @RequestParam(defaultValue = "1") Integer page,
            @RequestParam(defaultValue = "10") Integer size,
            @RequestParam(required = false) String keyword,
            @RequestParam(required = false) String filter,
            @RequestParam(required = false, name = "userType") String requestedUserType,
            @RequestHeader(value = "Authorization", required = false) String token) {

        // 安全验证：仅管理员可访问
        if (token == null || token.isEmpty()) {
            return Result.error("未登录，请先登录");
        }
        if (token.startsWith("Bearer ")) {
            token = token.substring(7);
        }
        if (!com.ldai.util.JwtUtil.validateToken(token)) {
            return Result.error("登录已过期，请重新登录");
        }
        String userType = com.ldai.util.JwtUtil.getUserType(token);
        if (!"admin".equals(userType)) {
            return Result.error("无权限访问此接口");
        }

        Page<AppUser> pageParam = new Page<>(page, size);

        // 构建查询条件
        com.baomidou.mybatisplus.extension.conditions.query.LambdaQueryChainWrapper<AppUser> queryWrapper = appUserService
                .lambdaQuery();

        // 开放平台同步过来的外部用户不进入平台用户管理视图
        queryWrapper.isNull(AppUser::getMerchantId);

        // 关键词搜索
        if (keyword != null && !keyword.isEmpty()) {
            queryWrapper.and(q -> q
                    .like(AppUser::getNickname, keyword)
                    .or()
                    .like(AppUser::getOpenid, keyword)
                    .or()
                    .like(AppUser::getPhone, keyword)
                    .or()
                    .like(AppUser::getId, keyword));
        }

        // 筛选条件
        if (filter != null && !filter.isEmpty()) {
            if ("hasDevice".equals(filter)) {
                queryWrapper.exists("SELECT 1 FROM device WHERE device.user_id = app_user.id");
            } else if ("hasBalance".equals(filter)) {
                queryWrapper.gt(AppUser::getBalance, 0);
            }
        }

        if (requestedUserType != null && !requestedUserType.isEmpty()) {
            if (!"personal".equals(requestedUserType) && !"company".equals(requestedUserType)) {
                return Result.error("用户类型不正确");
            }
            queryWrapper.eq(AppUser::getUserType, requestedUserType);
        }

        // 按注册时间倒序
        queryWrapper.orderByDesc(AppUser::getCreateTime);

        Page<AppUser> result = queryWrapper.page(pageParam);

        // 获取算力兑换比例配置
        int hashrateRate = Integer.parseInt(configService.getConfig("earnings.hashratePerYuan", "100"));

        // 填充额外信息
        for (AppUser user : result.getRecords()) {
            // 强制根据余额同步聚芯算力值显示
            if (user.getBalance() != null) {
                user.setQuota(user.getBalance().multiply(new java.math.BigDecimal(hashrateRate)).intValue());
            }

            user.setDeviceCount(
                    deviceService.lambdaQuery().eq(com.ldai.entity.Device::getUserId, user.getId()).count().intValue());
            user.setTaskCount(
                    aiTaskService.lambdaQuery().eq(com.ldai.entity.AiTask::getUserId, user.getId()).count().intValue());

            // 填充邀请人昵称和头像
            if (user.getInviterId() != null) {
                AppUser inviter = appUserService.getById(user.getInviterId());
                if (inviter != null) {
                    user.setInviterNickname(inviter.getNickname());
                    user.setInviterAvatarUrl(inviter.getAvatarUrl());
                }
            }

        }

        return Result.success(result);
    }

    /**
     * 获取用户总数（管理员专用）
     * 安全修复：需要管理员权限
     */
    @GetMapping("/count")
    public Result<Long> count(
            @RequestHeader(value = "Authorization", required = false) String token) {

        if (token == null || token.isEmpty()) {
            return Result.error("未登录，请先登录");
        }
        if (token.startsWith("Bearer ")) {
            token = token.substring(7);
        }
        if (!com.ldai.util.JwtUtil.validateToken(token)) {
            return Result.error("登录已过期，请重新登录");
        }
        String userType = com.ldai.util.JwtUtil.getUserType(token);
        if (!"admin".equals(userType)) {
            return Result.error("无权限访问此接口");
        }

        return Result.success(appUserService.lambdaQuery().isNull(AppUser::getMerchantId).count());
    }

    /**
     * 获取用户统计数据（管理员专用）
     * 安全修复：需要管理员权限
     */
    @GetMapping("/stats")
    public Result<Object> stats(
            @RequestHeader(value = "Authorization", required = false) String token) {
        try {
            if (token == null || token.isEmpty()) {
                return Result.error("未登录，请先登录");
            }
            if (token.startsWith("Bearer ")) {
                token = token.substring(7);
            }
            if (!com.ldai.util.JwtUtil.validateToken(token)) {
                return Result.error("登录已过期，请重新登录");
            }
            String userType = com.ldai.util.JwtUtil.getUserType(token);
            if (!"admin".equals(userType)) {
                return Result.error("无权限访问此接口");
            }

            java.util.List<AppUser> platformUsers = appUserService.lambdaQuery()
                    .isNull(AppUser::getMerchantId)
                    .list();
            long totalUsers = platformUsers.size();

            java.util.Set<Long> platformUserIds = platformUsers.stream()
                    .map(AppUser::getId)
                    .collect(java.util.stream.Collectors.toSet());

            long hasDeviceCount = platformUserIds.isEmpty()
                    ? 0
                    : deviceService.lambdaQuery()
                            .in(com.ldai.entity.Device::getUserId, platformUserIds)
                            .list()
                            .stream()
                            .map(com.ldai.entity.Device::getUserId)
                            .filter(java.util.Objects::nonNull)
                            .distinct()
                            .count();

            // 获取算力兑换比例配置
            int hashrateRate = Integer.parseInt(configService.getConfig("earnings.hashratePerYuan", "100"));

            // 计算总余额和总配额
            java.math.BigDecimal totalBalance = java.math.BigDecimal.ZERO;
            int totalQuota = 0;
            for (AppUser u : platformUsers) {
                if (u.getBalance() != null) {
                    totalBalance = totalBalance.add(u.getBalance());
                    // 统计显示的算力总额也基于余额动态计算
                    totalQuota += u.getBalance().multiply(new java.math.BigDecimal(hashrateRate)).intValue();
                }
            }

            return Result.success(java.util.Map.of(
                    "totalUsers", totalUsers,
                    "hasDeviceCount", hasDeviceCount,
                    "totalBalance", totalBalance.toString(),
                    "totalQuota", totalQuota));
        } catch (Exception e) {
            e.printStackTrace();
            return Result.error("调试报错信息: " + e.getMessage());
        }
    }

    /**
     * 获取用户详情（包含设备列表和收益信息）
     * 安全修复：需要JWT Token验证，普通用户只能查看自己的信息
     */
    @GetMapping("/detail/{id}")
    public Result<Object> detail(
            @PathVariable Long id,
            @RequestHeader(value = "Authorization", required = false) String token) {

        // 安全验证：必须提供有效Token
        if (token == null || token.isEmpty()) {
            return Result.error("未登录，请先登录");
        }

        // 去除 Bearer 前缀
        if (token.startsWith("Bearer ")) {
            token = token.substring(7);
        }

        // 验证Token有效性
        if (!com.ldai.util.JwtUtil.validateToken(token)) {
            return Result.error("登录已过期，请重新登录");
        }

        Long tokenUserId = com.ldai.util.JwtUtil.getUserId(token);
        String userType = com.ldai.util.JwtUtil.getUserType(token);

        if (tokenUserId == null) {
            return Result.error("无效的Token");
        }

        // 权限验证：普通用户只能查看自己的信息，管理员可以查看任何用户
        if (!"admin".equals(userType) && !tokenUserId.equals(id)) {
            return Result.error("无权访问其他用户信息");
        }

        AppUser user = appUserService.getById(id);
        if (user == null) {
            return Result.error("用户不存在");
        }

        // 获取用户的设备列表
        java.util.List<com.ldai.entity.Device> devices = deviceService.lambdaQuery()
                .eq(com.ldai.entity.Device::getUserId, id)
                .list();

        // 计算每台设备的收益
        java.util.List<java.util.Map<String, Object>> deviceList = new java.util.ArrayList<>();
        java.math.BigDecimal totalEarnings = java.math.BigDecimal.ZERO;

        for (com.ldai.entity.Device device : devices) {
            java.util.Map<String, Object> deviceInfo = new java.util.HashMap<>();
            deviceInfo.put("id", device.getId());
            deviceInfo.put("sn", device.getSn());
            deviceInfo.put("name", device.getName());
            deviceInfo.put("status", device.getStatus());
            deviceInfo.put("location", device.getLocation());
            deviceInfo.put("lastHeartbeatTime", device.getLastHeartbeatTime());
            deviceInfo.put("bindTime", device.getBindTime());

            // 查询该设备的总收益
            java.math.BigDecimal deviceEarnings = earningsMapper.sumByDevice(device.getId());
            deviceInfo.put("earnings", deviceEarnings != null ? deviceEarnings : java.math.BigDecimal.ZERO);
            if (deviceEarnings != null) {
                totalEarnings = totalEarnings.add(deviceEarnings);
            }

            deviceList.add(deviceInfo);
        }

        // 获取创作任务数
        int taskCount = aiTaskService.lambdaQuery().eq(com.ldai.entity.AiTask::getUserId, id).count().intValue();

        // 获取邀请人信息
        String inviterNickname = null;
        String inviterAvatarUrl = null;
        if (user.getInviterId() != null) {
            AppUser inviter = appUserService.getById(user.getInviterId());
            if (inviter != null) {
                inviterNickname = inviter.getNickname();
                inviterAvatarUrl = inviter.getAvatarUrl();
            }
        }

        // 获取算力兑换比例配置
        int hashrateRate = Integer.parseInt(configService.getConfig("earnings.hashratePerYuan", "100"));

        java.util.Map<String, Object> result = new java.util.HashMap<>();
        result.put("id", user.getId());
        result.put("openid", user.getOpenid());
        result.put("nickname", user.getNickname());
        result.put("avatarUrl", user.getAvatarUrl());
        result.put("phone", user.getPhone());
        result.put("balance", user.getBalance());
        // 强制根据余额同步聚芯算力值显示, 覆盖数据库中的配额字段
        result.put("quota",
                user.getBalance() != null
                        ? user.getBalance().multiply(new java.math.BigDecimal(hashrateRate)).intValue()
                        : 0);
        result.put("inviterId", user.getInviterId());
        result.put("inviterNickname", inviterNickname);
        result.put("inviterAvatarUrl", inviterAvatarUrl);
        result.put("createTime", user.getCreateTime());
        result.put("deviceCount", devices.size());
        result.put("taskCount", taskCount);
        result.put("devices", deviceList);
        result.put("totalEarnings", totalEarnings);

        return Result.success(result);
    }

    /**
     * 充值配额
     */
    @PostMapping("/recharge-quota")
    public Result<String> rechargeQuota(@RequestBody java.util.Map<String, Object> params) {
        Long userId = Long.valueOf(params.get("userId").toString());
        Integer amount = Integer.valueOf(params.get("amount").toString());

        AppUser user = appUserService.getById(userId);
        if (user == null) {
            return Result.error("用户不存在");
        }

        int currentQuota = user.getQuota() != null ? user.getQuota() : 0;
        user.setQuota(currentQuota + amount);

        // 获取算力兑换比例配置
        int hashrateRate = Integer.parseInt(configService.getConfig("earnings.hashratePerYuan", "100"));

        // 同步增加余额
        java.math.BigDecimal balanceAdd = new java.math.BigDecimal(amount)
                .divide(new java.math.BigDecimal(hashrateRate), 2, java.math.RoundingMode.HALF_UP);
        user.setBalance((user.getBalance() != null ? user.getBalance() : java.math.BigDecimal.ZERO).add(balanceAdd));

        boolean success = appUserService.updateById(user);

        return success ? Result.success("充值成功") : Result.error("充值失败");
    }

    /**
     * 手动触发全员等级重算（管理员专用）
     */
    @GetMapping("/refresh-levels")
    public Result<String> refreshLevels(
            @RequestHeader(value = "Authorization", required = false) String token) {

        // 安全验证：仅管理员可用
        if (token == null || token.isEmpty()) {
            return Result.error("未登录，请先登录");
        }
        if (token.startsWith("Bearer ")) {
            token = token.substring(7);
        }
        if (!com.ldai.util.JwtUtil.validateToken(token)) {
            return Result.error("登录已过期，请重新登录");
        }
        String userType = com.ldai.util.JwtUtil.getUserType(token);
        if (!"admin".equals(userType)) {
            return Result.error("无权限执行此操作");
        }

        appUserService.updateAllUserLevels();
        return Result.success("全员等级重算已完成");
    }

}
