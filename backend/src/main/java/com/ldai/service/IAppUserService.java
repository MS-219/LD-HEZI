package com.ldai.service;

import com.baomidou.mybatisplus.extension.service.IService;
import com.ldai.entity.AppUser;

public interface IAppUserService extends IService<AppUser> {

    /**
     * 微信登录/注册
     * 
     * @param openid 微信 OpenID
     * @return JWT Token
     */
    String wxLogin(String openid);

    /**
     * 根据 OpenID 获取用户
     */
    AppUser getByOpenid(String openid);

    /**
     * 自动更新所有用户的分润等级
     */
    void updateAllUserLevels();

    /**
     * 更新指定用户的等级
     */
    void updateLevel(Long userId);

    /**
     * 根据商户ID和外部用户ID同步用户
     */
    AppUser syncExternalUser(Long merchantId, String externalUserId, String nickname, String avatarUrl);
}
