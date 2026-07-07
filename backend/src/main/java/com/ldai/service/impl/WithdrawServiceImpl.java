package com.ldai.service.impl;

import com.baomidou.mybatisplus.extension.plugins.pagination.Page;
import com.baomidou.mybatisplus.extension.service.impl.ServiceImpl;
import com.ldai.entity.Withdraw;
import com.ldai.mapper.DeviceEarningsMapper;
import com.ldai.mapper.WithdrawMapper;
import com.ldai.service.IWithdrawService;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.math.BigDecimal;
import java.math.RoundingMode;
import java.time.LocalDateTime;
import java.util.HashMap;
import java.util.Map;

@Service
public class WithdrawServiceImpl extends ServiceImpl<WithdrawMapper, Withdraw> implements IWithdrawService {

    @Autowired
    private WithdrawMapper withdrawMapper;

    @Autowired
    private DeviceEarningsMapper earningsMapper;

    @Autowired
    private com.ldai.service.ISystemConfigService configService;

    @Autowired
    private com.ldai.service.IAppUserService appUserService;

    @Override
    @Transactional
    public String applyWithdraw(Long userId, BigDecimal amount, Integer type, String account, String realName,
            String qrCode) {
        // 从系统配置读取最低提现金额。手续费由最终打款方式决定：线上扣，线下不扣。
        String minWithdrawStr = configService.getConfig("earnings.minWithdraw", "10");

        BigDecimal minWithdraw = new BigDecimal(minWithdrawStr);

        // 校验最低提现金额
        if (amount.compareTo(minWithdraw) < 0) {
            return "最低提现金额为 " + minWithdraw + " 元";
        }

        // 获取用户并校验余额
        com.ldai.entity.AppUser user = appUserService.getById(userId);
        if (user == null) {
            return "用户不存在";
        }

        BigDecimal available = user.getBalance();
        if (amount.compareTo(available) > 0) {
            return "余额不足";
        }

        // 扣除用户余额和算力
        user.setBalance(available.subtract(amount));

        // 获取动态配置的算力兑换比例
        int hashrateRate = Integer.parseInt(configService.getConfig("earnings.hashratePerYuan", "100"));

        int quotaChange = amount.multiply(new java.math.BigDecimal(hashrateRate)).intValue();
        user.setQuota((user.getQuota() != null ? user.getQuota() : 0) - quotaChange);

        boolean updateSuccess = appUserService.updateById(user);
        if (!updateSuccess) {
            return "系统繁忙，请重试";
        }

        // 创建提现记录
        Withdraw withdraw = new Withdraw();
        withdraw.setUserId(userId);
        withdraw.setAmount(amount);
        withdraw.setFee(BigDecimal.ZERO.setScale(2, RoundingMode.HALF_UP));
        withdraw.setActualAmount(amount.setScale(2, RoundingMode.HALF_UP));
        withdraw.setType(type);
        withdraw.setAccount(account);
        withdraw.setRealName(realName);
        withdraw.setQrCode(qrCode);
        withdraw.setStatus(0); // 待审核
        withdraw.setCreateTime(LocalDateTime.now());
        withdraw.setUpdateTime(LocalDateTime.now());

        this.save(withdraw);

        // 持久化保存用户的收款账号信息
        if (type == 1 && qrCode != null && !qrCode.isEmpty()) { // 微信收款码
            user.setWxQrCode(qrCode);
        } else if (type == 2) { // 支付宝
            if (qrCode != null && !qrCode.isEmpty())
                user.setAliQrCode(qrCode);
            user.setAlipayAccount(account); // 保存支付宝账号
            user.setBankHolderName(realName); // 支付宝也用这个实名
        } else if (type == 3) { // 银行卡
            user.setBankCardNo(account);
            user.setBankHolderName(realName);
            // 注意：applyWithdraw 参数里没有 bankName，如果前端传了最好，或者只能以后补充
        }

        // 统一更新用户信息
        appUserService.updateById(user);

        return null; // 成功返回 null
    }

    @Override
    public Map<String, BigDecimal> getWalletInfo(Long userId) {
        Map<String, BigDecimal> result = new HashMap<>();

        // 累计收益
        BigDecimal totalEarnings = earningsMapper.sumByUser(userId);
        if (totalEarnings == null)
            totalEarnings = BigDecimal.ZERO;

        // 已提现金额
        BigDecimal withdrawn = withdrawMapper.sumWithdrawnByUser(userId);
        if (withdrawn == null)
            withdrawn = BigDecimal.ZERO;

        // 待审核提现金额
        BigDecimal pending = withdrawMapper.sumPendingByUser(userId);
        if (pending == null)
            pending = BigDecimal.ZERO;

        // 可提现余额 - 直接读取用户余额
        com.ldai.entity.AppUser user = appUserService.getById(userId);
        BigDecimal available = (user != null && user.getBalance() != null) ? user.getBalance() : BigDecimal.ZERO;

        result.put("total", totalEarnings);
        result.put("withdrawn", withdrawn);
        result.put("pending", pending);
        result.put("available", available);

        return result;
    }

    /**
     * 扩展：获取包含收款码的钱包详细信息
     */
    public Map<String, Object> getFullWalletInfo(Long userId) {
        Map<String, BigDecimal> basic = getWalletInfo(userId);
        Map<String, Object> result = new HashMap<>(basic);

        com.ldai.entity.AppUser user = appUserService.getById(userId);
        if (user != null) {
            result.put("wxQrCode", user.getWxQrCode());
            result.put("aliQrCode", user.getAliQrCode());
            result.put("savedRealName",
                    user.getBankHolderName() != null ? user.getBankHolderName() : user.getNickname());
            result.put("bankCardNo", user.getBankCardNo());
            result.put("bankHolderName", user.getBankHolderName());
            result.put("alipayAccount", user.getAlipayAccount());

        }
        return result;
    }

    @Override
    public Page<Withdraw> getUserWithdrawList(Long userId, Integer page, Integer size) {
        Page<Withdraw> pageParam = new Page<>(page, size);
        return this.lambdaQuery()
                .eq(Withdraw::getUserId, userId)
                .orderByDesc(Withdraw::getCreateTime)
                .page(pageParam);
    }

    @Override
    @Transactional
    public boolean approve(Long id, Long auditorId) {
        Withdraw withdraw = this.getById(id);
        if (withdraw == null || withdraw.getStatus() != 0) {
            return false;
        }

        withdraw.setStatus(1); // 已通过
        withdraw.setAuditorId(auditorId);
        withdraw.setAuditTime(LocalDateTime.now());
        withdraw.setUpdateTime(LocalDateTime.now());

        return this.updateById(withdraw);
    }

    @Override
    @Transactional
    public boolean reject(Long id, Long auditorId, String remark) {
        Withdraw withdraw = this.getById(id);
        if (withdraw == null || (withdraw.getStatus() != 0 && withdraw.getStatus() != 1 && withdraw.getStatus() != 4)) {
            return false;
        }

        withdraw.setStatus(2); // 已拒绝
        withdraw.setAuditorId(auditorId);
        withdraw.setAuditTime(LocalDateTime.now());
        withdraw.setRemark(remark);
        withdraw.setUpdateTime(LocalDateTime.now());

        boolean success = this.updateById(withdraw);

        // 拒绝后，返还金额给用户
        if (success) {
            com.ldai.entity.AppUser user = appUserService.getById(withdraw.getUserId());
            if (user != null) {
                user.setBalance(user.getBalance().add(withdraw.getAmount()));

                // 获取动态配置的算力兑换比例
                int hashrateRate = Integer.parseInt(configService.getConfig("earnings.hashratePerYuan", "100"));

                int quotaChange = withdraw.getAmount().multiply(new java.math.BigDecimal(hashrateRate)).intValue();
                user.setQuota((user.getQuota() != null ? user.getQuota() : 0) + quotaChange);
                appUserService.updateById(user);
            }
        }

        return success;
    }

    @Override
    @Transactional
    public boolean confirmPaid(Long id, Long auditorId) {
        Withdraw withdraw = this.getById(id);
        if (withdraw == null || (withdraw.getStatus() != 1 && withdraw.getStatus() != 4)) {
            return false;
        }

        applyOfflinePayoutAmount(withdraw);
        withdraw.setStatus(3); // 已打款
        withdraw.setAuditorId(auditorId);
        withdraw.setProcessTime(LocalDateTime.now());
        withdraw.setUpdateTime(LocalDateTime.now());

        return this.updateById(withdraw);
    }
    private void applyOfflinePayoutAmount(Withdraw withdraw) {
        BigDecimal amount = withdraw.getAmount() != null ? withdraw.getAmount() : BigDecimal.ZERO;
        withdraw.setFee(BigDecimal.ZERO.setScale(2, RoundingMode.HALF_UP));
        withdraw.setActualAmount(amount.setScale(2, RoundingMode.HALF_UP));
    }
}
