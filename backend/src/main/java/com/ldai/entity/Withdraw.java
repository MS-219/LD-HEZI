package com.ldai.entity;

import com.baomidou.mybatisplus.annotation.IdType;
import com.baomidou.mybatisplus.annotation.TableId;
import com.baomidou.mybatisplus.annotation.TableName;
import lombok.Data;

import java.math.BigDecimal;
import java.time.LocalDateTime;

/**
 * 提现记录实体
 */
@Data
@TableName("withdraw")
public class Withdraw {

    @TableId(type = IdType.AUTO)
    private Long id;

    /** 用户ID */
    private Long userId;

    /** 提现金额 */
    private BigDecimal amount;

    /** 手续费 */
    private BigDecimal fee;

    /** 实际到账金额 */
    private BigDecimal actualAmount;

    /** 提现方式: 1-微信 2-支付宝 3-银行卡 */
    private Integer type;

    /** 收款账号 */
    private String account;

    /** 收款人姓名 */
    private String realName;

    /** 收款码图片 */
    private String qrCode;

    /** 状态: 0-待审核 1-已通过 2-已拒绝 3-已打款 4-失败 */
    private Integer status;

    /** 备注 */
    private String remark;

    /** 打款失败次数 */
    private Integer paymentFailCount;

    /** 身份证号 */
    private String idCard;

    /** 手机号 */
    private String mobile;

    /** 银行卡号 */
    private String bankCardNo;

    /** 支付宝账号 */
    private String alipayAccount;

    /** 拒绝原因 */
    private String rejectReason;

    /** 处理时间 */
    private LocalDateTime processTime;

    /** 审核人ID */
    private Long auditorId;

    /** 审核时间 */
    private LocalDateTime auditTime;

    /** 创建时间 */
    private LocalDateTime createTime;

    /** 更新时间 */
    private LocalDateTime updateTime;

    // ========== 非数据库字段 ==========

    /** 用户昵称 */
    @com.baomidou.mybatisplus.annotation.TableField(exist = false)
    private String nickname;

    /** 用户头像 */
    @com.baomidou.mybatisplus.annotation.TableField(exist = false)
    private String avatarUrl;

    /** 用户类型: personal-个人用户, company-公司用户 */
    @com.baomidou.mybatisplus.annotation.TableField(exist = false)
    private String userType;

}
