package com.ldai.mapper;

import com.baomidou.mybatisplus.core.mapper.BaseMapper;
import com.ldai.entity.AppUser;
import org.apache.ibatis.annotations.Mapper;
import org.apache.ibatis.annotations.Param;
import org.apache.ibatis.annotations.Update;

import java.math.BigDecimal;

@Mapper
public interface AppUserMapper extends BaseMapper<AppUser> {

    @Update("UPDATE app_user SET balance = COALESCE(balance, 0) + #{amount} WHERE id = #{userId}")
    int addBalance(@Param("userId") Long userId, @Param("amount") BigDecimal amount);
}
