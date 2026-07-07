package com.ldai.mapper;

import com.baomidou.mybatisplus.core.mapper.BaseMapper;
import com.ldai.entity.UserFeedback;
import org.apache.ibatis.annotations.Mapper;

/**
 * 用户反馈 Mapper
 */
@Mapper
public interface UserFeedbackMapper extends BaseMapper<UserFeedback> {
}
