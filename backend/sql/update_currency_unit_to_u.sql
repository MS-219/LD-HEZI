UPDATE system_config
SET description = '每小时收益（U）'
WHERE config_key = 'earnings.hourlyRate';

UPDATE system_config
SET description = '算力兑换比例（多少算力值=1U）'
WHERE config_key = 'earnings.hashratePerYuan';

UPDATE system_config
SET description = '最低提现金额（U）'
WHERE config_key = 'earnings.minWithdraw';
