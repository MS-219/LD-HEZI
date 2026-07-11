package com.ldai.entity;

import com.baomidou.mybatisplus.annotation.IdType;
import com.baomidou.mybatisplus.annotation.TableField;
import com.baomidou.mybatisplus.annotation.TableId;
import com.baomidou.mybatisplus.annotation.TableName;
import lombok.Data;

import java.math.BigDecimal;
import java.time.LocalDateTime;

/**
 * 小程序用户实体
 */
@Data
@TableName("app_user")
public class AppUser {

    @TableId(type = IdType.INPUT)
    private Long id;

    /** 微信 OpenID */
    private String openid;

    /** 昵称 */
    private String nickname;

    /** 头像 URL */
    private String avatarUrl;

    /** 手机号 */
    private String phone;

    /** 用户余额 */
    private BigDecimal balance;

    /** 剩余配额（用于AI创作） */
    private Integer quota;

    /** 邀请人ID */
    private Long inviterId;

    /** 用户等级: 0-普通用户, 1-一级, 2-二级, 3-三级, 4-四级 */
    private Integer level;

    /** 等级是否由后台手动设置（手动设置优先级高于自动升级） */
    private Boolean levelManual;

    /** 微信收款码 */
    private String wxQrCode;

    /** 支付宝收款码 */
    private String aliQrCode;

    /** 银行名称 */
    private String bankName;

    /** 银行卡号 */
    private String bankCardNo;

    /** 持卡人姓名 */
    private String bankHolderName;

    /** 身份证号 */
    private String idCard;

    /** 身份证人像面照片URL */
    private String idCardFront;

    /** 身份证国徽面照片URL */
    private String idCardBack;

    /** 支付宝账号 */
    private String alipayAccount;

    /** 是否禁止提现 */
    private Boolean withdrawDisabled;

    /** 用户类型: personal-个人用户, company-公司用户 */
    private String userType;

    /** 后台备注 */
    private String remark;

    /** BCrypt 密码散列（严禁序列化返回客户端） */
    @com.fasterxml.jackson.annotation.JsonIgnore
    private String passwordHash;

    /** 是否必须修改临时密码 */
    private Boolean mustChangePassword;

    /** 账号是否启用 */
    private Boolean accountEnabled;

    /** 当前唯一会话键，新登录/改密/停用时轮换 */
    @com.fasterxml.jackson.annotation.JsonIgnore
    private String sessionKey;

    /** 连续登录失败次数 */
    private Integer loginFailCount;

    /** 密码登录锁定截止时间 */
    private LocalDateTime lockedUntil;

    /** 密码最近修改时间 */
    private LocalDateTime passwordUpdatedAt;

    /** 最近登录时间 */
    private LocalDateTime lastLoginAt;

    /** 创建时间 */
    private LocalDateTime createTime;

    /** 所属商户ID */
    private Long merchantId;

    /** 外部系统用户ID */
    private String externalUserId;

    // ========== 非数据库字段 ==========

    /** 绑定的设备数量 */
    @TableField(exist = false)
    private Integer deviceCount;

    /** 创作任务数量 */
    @TableField(exist = false)
    private Integer taskCount;

    /** 邀请人昵称 */
    @TableField(exist = false)
    private String inviterNickname;

    /** 邀请人头像 */
    @TableField(exist = false)
    private String inviterAvatarUrl;

}
