package com.ldai.service;

import com.baomidou.mybatisplus.extension.service.impl.ServiceImpl;
import com.ldai.entity.AppRelease;
import com.ldai.mapper.AppReleaseMapper;
import org.springframework.stereotype.Service;

@Service
public class AppReleaseService extends ServiceImpl<AppReleaseMapper, AppRelease> {}
