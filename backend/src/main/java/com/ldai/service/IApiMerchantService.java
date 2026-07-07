package com.ldai.service;

import com.baomidou.mybatisplus.extension.service.IService;
import com.ldai.entity.ApiMerchant;

/**
 * 接口商户 Service
 */
public interface IApiMerchantService extends IService<ApiMerchant> {

    /**
     * 根据 appId 获取商户
     */
    ApiMerchant getByAppId(String appId);
}
