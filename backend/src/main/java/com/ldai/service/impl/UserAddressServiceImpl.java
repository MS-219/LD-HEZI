package com.ldai.service.impl;

import com.baomidou.mybatisplus.extension.service.impl.ServiceImpl;
import com.ldai.entity.UserAddress;
import com.ldai.mapper.UserAddressMapper;
import com.ldai.service.IUserAddressService;
import org.springframework.stereotype.Service;

@Service
public class UserAddressServiceImpl extends ServiceImpl<UserAddressMapper, UserAddress> implements IUserAddressService {
}
