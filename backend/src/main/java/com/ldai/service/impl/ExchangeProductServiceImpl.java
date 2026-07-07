package com.ldai.service.impl;

import com.baomidou.mybatisplus.extension.service.impl.ServiceImpl;
import com.ldai.entity.ExchangeProduct;
import com.ldai.mapper.ExchangeProductMapper;
import com.ldai.service.IExchangeProductService;
import org.springframework.stereotype.Service;

@Service
public class ExchangeProductServiceImpl extends ServiceImpl<ExchangeProductMapper, ExchangeProduct> implements IExchangeProductService {
}
