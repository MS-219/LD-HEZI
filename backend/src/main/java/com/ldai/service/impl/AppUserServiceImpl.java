package com.ldai.service.impl;

import com.baomidou.mybatisplus.core.conditions.query.LambdaQueryWrapper;
import com.baomidou.mybatisplus.extension.service.impl.ServiceImpl;
import com.ldai.entity.AppUser;
import com.ldai.mapper.AppUserMapper;
import com.ldai.service.IAppUserService;
import com.ldai.util.JwtUtil;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.context.annotation.Lazy;
import org.springframework.stereotype.Service;
import com.ldai.entity.Device;
import com.ldai.service.IDeviceService;
import com.ldai.service.ISystemConfigService;

import java.math.BigDecimal;
import java.time.LocalDateTime;
import java.util.List;
import java.util.Map;

@Service
public class AppUserServiceImpl extends ServiceImpl<AppUserMapper, AppUser> implements IAppUserService {

    @Autowired
    private ISystemConfigService configService;

    @Autowired
    @Lazy
    private IDeviceService deviceService;

    @Override
    public String wxLogin(String openid) {
        AppUser user = getByOpenid(openid);

        if (user == null) {
            // 新用户自动注册
            user = new AppUser();
            user.setId(generateUniqueId()); // 生成 6 位唯一随机 ID
            user.setOpenid(openid);
            user.setNickname("微信用户");
            user.setBalance(BigDecimal.ZERO);
            user.setQuota(0);
            user.setCreateTime(LocalDateTime.now());
            this.save(user);
        }

        // 生成 JWT Token
        return JwtUtil.generateToken(user.getId(), user.getOpenid(), "app");
    }

    @Override
    public AppUser getByOpenid(String openid) {
        LambdaQueryWrapper<AppUser> wrapper = new LambdaQueryWrapper<>();
        wrapper.eq(AppUser::getOpenid, openid);
        return this.getOne(wrapper);
    }

    /**
     * 生成唯一的 6 位随机数字 ID
     */
    private Long generateUniqueId() {
        java.util.Random random = new java.util.Random();
        while (true) {
            // 生成 100000 - 999999 之间的随机数
            long id = 100000 + random.nextInt(900000);
            // 检查数据库中是否存在该 ID
            if (this.getById(id) == null) {
                return id;
            }
        }
    }

    @Override
    public void updateLevel(Long userId) {
        if (userId == null)
            return;

        // 1. 获取该用户
        AppUser user = this.getById(userId);
        if (user == null || Boolean.TRUE.equals(user.getLevelManual())) {
            return; // 锁定状态不自动更新
        }

        // 2. 获取等级配置阈值
        int[] thresholds = new int[6];
        for (int i = 1; i <= 5; i++) {
            String val = configService.getConfig("invite.level" + i + ".threshold", null);
            thresholds[i] = (val != null) ? Integer.parseInt(val) : (new int[] { 0, 1, 100, 300, 1000, 3000 })[i];
        }

        // 3. 统计该用户【名下全团队】总设备数 (递归下级)
        List<Device> allDevices = deviceService.lambdaQuery().isNotNull(Device::getUserId).list();
        List<AppUser> allUsers = this.list();
        Map<Long, Long> userInviterMap = new java.util.HashMap<>();
        for (AppUser u : allUsers) {
            userInviterMap.put(u.getId(), u.getInviterId());
        }

        int teamTotal = 0;
        for (Device d : allDevices) {
            Long currentId = d.getUserId();
            int depth = 0;
            while (currentId != null && depth < 50) {
                if (currentId.equals(userId)) {
                    teamTotal++;
                    break;
                }
                currentId = userInviterMap.get(currentId);
                depth++;
            }
        }

        // 4. 计算新等级
        int newLevel = 0;
        for (int i = 5; i >= 1; i--) {
            if (teamTotal >= thresholds[i]) {
                newLevel = i;
                break;
            }
        }

        // 5. 仅更新该用户
        if (user.getLevel() == null || user.getLevel() != newLevel) {
            this.lambdaUpdate()
                    .set(AppUser::getLevel, newLevel)
                    .eq(AppUser::getId, userId)
                    .update();
        }
    }

    @Override
    public void updateAllUserLevels() {
        // 1. 获取等级配置阈值
        int[] thresholds = new int[6];
        for (int i = 1; i <= 5; i++) {
            String val = configService.getConfig("invite.level" + i + ".threshold", null);
            thresholds[i] = (val != null) ? Integer.parseInt(val) : (new int[] { 0, 1, 100, 300, 1000, 3000 })[i];
        }

        // 2. 获取所有用户
        List<AppUser> allUsers = this.list();
        Map<Long, AppUser> userMap = new java.util.HashMap<>();
        for (AppUser u : allUsers) {
            userMap.put(u.getId(), u);
        }

        // 3. 统计每个用户自身拥有的设备数
        List<Device> allBoundDevices = deviceService.lambdaQuery().isNotNull(Device::getUserId).list();
        Map<Long, Integer> userOwnDevices = new java.util.HashMap<>();
        for (Device d : allBoundDevices) {
            if (d.getUserId() != null) {
                Long uid = Long.valueOf(d.getUserId().toString());
                userOwnDevices.put(uid, userOwnDevices.getOrDefault(uid, 0) + 1);
            }
        }

        // 4. 计算全员团队总设备数
        Map<Long, Integer> teamDeviceCount = new java.util.HashMap<>();
        for (AppUser user : allUsers) {
            Long uid = user.getId();
            int ownCount = userOwnDevices.getOrDefault(uid, 0);
            if (ownCount > 0) {
                Long currentId = uid;
                int depth = 0;
                while (currentId != null && depth < 50) {
                    teamDeviceCount.put(currentId, teamDeviceCount.getOrDefault(currentId, 0) + ownCount);
                    AppUser current = userMap.get(currentId);
                    currentId = (current != null && current.getInviterId() != null)
                            ? Long.valueOf(current.getInviterId().toString())
                            : null;
                    depth++;
                }
            }
        }

        // 5. 更新所有符合条件的用户
        for (AppUser user : allUsers) {
            if (Boolean.TRUE.equals(user.getLevelManual())) {
                continue;
            }
            int totalDevices = teamDeviceCount.getOrDefault(user.getId(), 0);
            int newLevel = 0;
            for (int i = 5; i >= 1; i--) {
                if (totalDevices >= thresholds[i]) {
                    newLevel = i;
                    break;
                }
            }
            if (user.getLevel() == null || user.getLevel() != newLevel) {
                this.lambdaUpdate()
                        .set(AppUser::getLevel, newLevel)
                        .eq(AppUser::getId, user.getId())
                        .update();
            }
        }
    }

    @Autowired
    private com.ldai.service.IApiMerchantService apiMerchantService;

    @Override
    public AppUser syncExternalUser(Long merchantId, String externalUserId, String nickname, String avatarUrl) {
        LambdaQueryWrapper<AppUser> wrapper = new LambdaQueryWrapper<>();
        wrapper.eq(AppUser::getMerchantId, merchantId)
                .eq(AppUser::getExternalUserId, externalUserId);
        AppUser user = this.getOne(wrapper);

        if (user == null) {
            user = new AppUser();
            user.setId(generateUniqueId());
            user.setOpenid(buildExternalOpenid(merchantId, externalUserId));
            user.setMerchantId(merchantId);
            user.setExternalUserId(externalUserId);
            user.setNickname(nickname != null ? nickname : "外部用户");
            user.setAvatarUrl(avatarUrl != null ? avatarUrl : "");
            user.setBalance(BigDecimal.ZERO);
            user.setQuota(0);
            user.setCreateTime(LocalDateTime.now());

            // 继承商户等级，确保外部用户按商户费率结算收益
            try {
                com.ldai.entity.ApiMerchant merchant = apiMerchantService.getById(merchantId);
                if (merchant != null && merchant.getLevel() != null) {
                    user.setLevel(merchant.getLevel());
                }
            } catch (Exception e) {
                // 查询商户失败不影响用户创建
            }

            this.save(user);
        } else if (nickname != null || avatarUrl != null) {
            // 更新资料
            if (user.getOpenid() == null || user.getOpenid().isEmpty()) {
                user.setOpenid(buildExternalOpenid(merchantId, externalUserId));
            }
            if (nickname != null)
                user.setNickname(nickname);
            if (avatarUrl != null)
                user.setAvatarUrl(avatarUrl);
            this.updateById(user);
        }
        return user;
    }

    private String buildExternalOpenid(Long merchantId, String externalUserId) {
        String safeMerchantId = merchantId != null ? merchantId.toString() : "0";
        String safeExternalUserId = externalUserId != null ? externalUserId.trim() : "";
        return "ext_" + safeMerchantId + "_" + safeExternalUserId;
    }
}
