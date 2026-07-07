package com.ldai.service.impl;

import com.baomidou.mybatisplus.extension.service.impl.ServiceImpl;
import com.ldai.entity.ExchangeLogistics;
import com.ldai.mapper.ExchangeLogisticsMapper;
import com.ldai.service.IExchangeLogisticsService;
import org.springframework.stereotype.Service;

@Service
public class ExchangeLogisticsServiceImpl extends ServiceImpl<ExchangeLogisticsMapper, ExchangeLogistics> implements IExchangeLogisticsService {
}
