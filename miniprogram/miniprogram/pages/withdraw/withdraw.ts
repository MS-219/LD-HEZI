import { API_BASE } from '../../config';
import { request, isTokenExpired, handleTokenExpired } from '../../utils/request';
export { }; // 使文件成为 ES 模块

Page({
    data: {
        navBarTop: 0,
        hashratePerYuan: 100, // 算力兑换比例
        minWithdraw: 10,       // 最低提现金额
        walletInfo: {
            available: '0.00',
            total: '0.00',
            pending: '0.00',
            withdrawn: '0.00',
            hashrateBalance: 0,  // 可提现算力值
            totalHashrate: 0     // 累计算力值
        },
        form: {
            type: 3, // 1-微信(暂关) 2-支付宝 3-银行卡
            amount: '',
            account: '',
            realName: '',
            qrCode: ''
        },
        savedWxQrCode: '',
        savedAliQrCode: '',
        savedBankCardNo: '',
        savedAlipayAccount: '',
        savedRealName: '',
        previewAmount: '0.00',
        submitting: false,
        // 提现日期限制
        canWithdraw: true,
        withdrawMessage: '',
        firstShowHandled: false,
        walletLoading: false,
        walletReady: false
    },

    onLoad() {
        const menuButtonInfo = wx.getMenuButtonBoundingClientRect();
        this.setData({
            navBarTop: menuButtonInfo.top
        });

        this.hydrateWalletSnapshot();

        this.checkWithdrawStatus();
        this.fetchSystemConfig();
        this.fetchWalletInfo();
    },

    onShow() {
        if (!this.data.firstShowHandled) {
            this.setData({ firstShowHandled: true });
            return;
        }

        this.fetchWalletInfo();
    },

    hydrateWalletSnapshot() {
        const snapshot = wx.getStorageSync('withdrawWalletSnapshot');
        if (!snapshot || !snapshot.ts || Date.now() - snapshot.ts > 5 * 60 * 1000) {
            return;
        }

        const rate = parseInt(snapshot.hashratePerYuan || this.data.hashratePerYuan, 10) || 100;
        const available = parseFloat(snapshot.available || '0') || 0;
        const total = parseFloat(snapshot.total || '0') || 0;

        this.setData({
            hashratePerYuan: rate,
            walletInfo: {
                ...this.data.walletInfo,
                available: available.toFixed(2),
                total: total.toFixed(2),
                hashrateBalance: snapshot.hashrateBalance || Math.round(available * rate),
                totalHashrate: snapshot.totalHashrate || Math.round(total * rate)
            }
        });
    },

    // 检查今天是否可以提现
    checkWithdrawStatus() {
        request({
            url: '/api/settings/withdraw-status',
            method: 'GET'
        }).then(res => {
            if (res.code === 200) {
                const data = res.data;
                this.setData({
                    canWithdraw: data.canWithdraw,
                    withdrawMessage: data.message || ''
                });
            }
        });
    },

    // 获取系统配置（算力兑换比例等）
    fetchSystemConfig(callback?: () => void) {
        return request({
            url: '/api/settings/earnings-config',
            method: 'GET'
        }).then(res => {
            if (res.code === 200) {
                const config = res.data;
                const hashratePerYuan = parseInt(config.hashratePerYuan || 100, 10) || 100;
                this.setData({
                    hashratePerYuan,
                    minWithdraw: config.minWithdraw || 10
                });
                this.refreshHashrateDisplay(hashratePerYuan);
            }
            return res;
        }).finally(() => {
            if (callback) callback();
        });
    },

    fetchWalletInfo() {
        if (this.data.walletLoading) {
            return Promise.resolve(null);
        }

        const userId = wx.getStorageSync('userId');
        if (!userId) {
            wx.showToast({ title: '请先登录', icon: 'none' });
            setTimeout(() => wx.navigateBack(), 1500);
            return Promise.resolve(null);
        }

        this.setData({ walletLoading: true, walletReady: false });

        return request({
            url: '/api/withdraw/wallet',
            method: 'GET',
            data: { userId }
        }).then(res => {
            if (res.code === 200) {
                const data = res.data;
                const available = parseFloat(data.available) || 0;
                const total = parseFloat(data.total) || 0;
                const hashratePerYuan = this.data.hashratePerYuan;

                this.setData({
                    walletInfo: {
                        available: available.toFixed(2),
                        total: data.total || '0.00',
                        pending: data.pending || '0.00',
                        withdrawn: data.withdrawn || '0.00',
                        hashrateBalance: Math.round(available * hashratePerYuan),
                        totalHashrate: Math.round(total * hashratePerYuan)
                    },
                    savedWxQrCode: data.wxQrCode || '',
                    savedAliQrCode: data.aliQrCode || '',
                    savedBankCardNo: data.bankCardNo || '',
                    savedAlipayAccount: data.alipayAccount || '',
                    savedRealName: data.bankHolderName || data.savedRealName || ''
                });

                // 自动填充信息
                const form = this.data.form;
                form.realName = this.data.savedRealName;

                if (form.type === 1) { // 微信
                    form.qrCode = data.wxQrCode || '';
                } else if (form.type === 2) { // 支付宝
                    form.qrCode = data.aliQrCode || '';
                    form.account = data.alipayAccount || '';
                } else if (form.type === 3) { // 银行卡
                    form.account = data.bankCardNo || '';
                }
                this.setData({ form });
                wx.setStorageSync('withdrawWalletSnapshot', {
                    available: available.toFixed(2),
                    total: (data.total || '0.00').toString(),
                    pending: (data.pending || '0.00').toString(),
                    hashrateBalance: Math.round(available * hashratePerYuan),
                    totalHashrate: Math.round(total * hashratePerYuan),
                    hashratePerYuan,
                    ts: Date.now()
                });
                this.setData({ walletReady: true });
            }
            return res;
        }).finally(() => {
            this.setData({ walletLoading: false });
        });
    },

    refreshHashrateDisplay(hashratePerYuan: number) {
        const available = parseFloat(this.data.walletInfo.available) || 0;
        const total = parseFloat(this.data.walletInfo.total) || 0;

        this.setData({
            'walletInfo.hashrateBalance': Math.round(available * hashratePerYuan),
            'walletInfo.totalHashrate': Math.round(total * hashratePerYuan)
        });
    },

    goBack() {
        wx.navigateBack();
    },

    goRecords() {
        wx.navigateTo({
            url: '/pages/withdraw-list/withdraw-list'
        });
    },

    selectType(e: any) {
        const type = parseInt(e.currentTarget.dataset.type);
        const { savedWxQrCode, savedAliQrCode } = this.data;
        this.setData({
            'form.type': type,
            'form.qrCode': type === 1 ? savedWxQrCode : (type === 2 ? savedAliQrCode : '')
        });
    },

    onAmountInput(e: any) {
        const amount = e.detail.value;
        this.setData({ 'form.amount': amount });
        this.calculatePreview(amount);
    },

    onAccountInput(e: any) {
        this.setData({ 'form.account': e.detail.value });
    },

    onRealNameInput(e: any) {
        this.setData({ 'form.realName': e.detail.value });
    },

    setAmount(e: any) {
        const amount = e.currentTarget.dataset.amount;
        this.setData({ 'form.amount': amount.toString() });
        this.calculatePreview(amount);
    },

    setAllAmount() {
        const available = parseFloat(this.data.walletInfo.available) || 0;
        this.setData({ 'form.amount': available.toFixed(2) });
        this.calculatePreview(available);
    },

    calculatePreview(amount: number | string) {
        const num = parseFloat(amount as string) || 0;
        this.setData({ previewAmount: num.toFixed(2) });
    },

    uploadQRCode() {
        wx.chooseImage({
            count: 1,
            sizeType: ['compressed'],
            sourceType: ['album', 'camera'],
            success: (res) => {
                const tempFilePaths = res.tempFilePaths;
                wx.showLoading({ title: '上传中...' });

                const token = wx.getStorageSync('token');
                wx.uploadFile({
                    url: `${API_BASE}/api/upload/image`,
                    filePath: tempFilePaths[0],
                    name: 'file',
                    header: {
                        'Authorization': `Bearer ${token}`
                    },
                    success: (uploadRes) => {
                        try {
                            const result = JSON.parse(uploadRes.data);
                            if (result.code === 200) {
                                const url = result.data.url;
                                this.setData({ 'form.qrCode': url });

                                // 立即保存到后端
                                this.savePaymentInfoToServer(url);

                                wx.showToast({ title: '上传成功', icon: 'success' });
                            } else {
                                wx.showToast({ title: result.msg || '上传失败', icon: 'none' });
                            }
                        } catch (e) {
                            wx.showToast({ title: '解析失败', icon: 'none' });
                        }
                    },
                    fail: () => {
                        wx.showToast({ title: '上传失败', icon: 'none' });
                    },
                    complete: () => {
                        wx.hideLoading();
                    }
                });
            }
        });
    },

    // 保存收款信息到服务器
    savePaymentInfoToServer(qrCode: string) {
        const userId = wx.getStorageSync('userId');
        if (!userId) return;

        const { form } = this.data;

        request({
            url: '/api/withdraw/save-payment-info',
            method: 'POST',
            data: {
                userId,
                type: form.type,
                qrCode: qrCode
            }
        }).then(res => {
            if (res.code === 200) {
                // 更新本地缓存
                if (form.type === 1) {
                    this.setData({ savedWxQrCode: qrCode });
                } else if (form.type === 2) {
                    this.setData({ savedAliQrCode: qrCode });
                }
                console.log('收款码保存成功');
            } else {
                console.error('收款码保存失败:', res.msg);
            }
        }).catch(err => {
            console.error('保存收款码请求失败:', err);
        });
    },

    submitWithdraw() {
        if (!this.data.walletReady) {
            wx.showToast({ title: '余额刷新中，请稍后', icon: 'none' });
            return;
        }

        const { form, walletInfo } = this.data;
        const amount = parseFloat(form.amount) || 0;
        const available = parseFloat(walletInfo.available) || 0;

        // 表单验证
        if (amount < 10) {
            wx.showToast({ title: '最低提现金额为10元', icon: 'none' });
            return;
        }

        if (amount > available) {
            wx.showToast({ title: '提现金额超过可用余额', icon: 'none' });
            return;
        }

        // 银行卡号格式校验（type=3 为银行卡）
        if (form.type === 3) {
            const cardNo = (form.account || '').replace(/\s/g, '');
            if (!/^\d{15,19}$/.test(cardNo)) {
                wx.showToast({ title: '请输入正确的银行卡号（15-19位数字）', icon: 'none' });
                return;
            }
        }

        const userId = wx.getStorageSync('userId');
        if (!userId) {
            wx.showToast({ title: '请先登录', icon: 'none' });
            return;
        }

        this.setData({ submitting: true });

        request({
            url: '/api/withdraw/apply',
            method: 'POST',
            data: {
                userId,
                amount: form.amount,
                type: form.type,
                account: form.account,
                realName: form.realName,
                qrCode: form.qrCode
            }
        }).then(res => {
            if (res.code === 200) {
                wx.showToast({ title: '提现申请已提交', icon: 'success' });
                setTimeout(() => {
                    wx.navigateBack();
                }, 1500);
            } else {
                wx.showToast({ title: res.msg || '提交失败', icon: 'none' });
            }
        }).catch(() => {
            wx.showToast({ title: '网络错误', icon: 'none' });
        }).finally(() => {
            this.setData({ submitting: false });
        });
    }
})
