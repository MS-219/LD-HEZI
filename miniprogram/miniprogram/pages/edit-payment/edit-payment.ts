import { request } from '../../utils/request';
export { };

Page({
    data: {
        navBarTop: 0,
        currentInfo: {
            realName: '',
            bankCardNo: '',
            bankCardNoMask: ''
        },
        form: {
            cardNo: ''
        },
        submitting: false,
        canSubmit: false
    },

    onLoad() {
        const menuButtonInfo = wx.getMenuButtonBoundingClientRect();
        this.setData({
            navBarTop: menuButtonInfo.top
        });
        this.loadCurrentInfo();
    },

    // 加载当前收款信息
    loadCurrentInfo() {
        const userId = wx.getStorageSync('userId');
        if (!userId) return;

        // 获取钱包信息（包含银行卡号等）
        request({
            url: '/api/withdraw/wallet',
            method: 'GET',
            data: { userId }
        }).then(res => {
            if (res.code === 200) {
                const data = res.data;
                const bankCardNo = data.bankCardNo || '';
                const realName = data.bankHolderName || data.savedRealName || '';

                this.setData({
                    currentInfo: {
                        realName,
                        bankCardNo,
                        bankCardNoMask: this.maskCardNo(bankCardNo)
                    }
                });
            }
        });
    },

    // 银行卡号脱敏
    maskCardNo(cardNo: string) {
        if (!cardNo || cardNo.length < 8) return cardNo;
        return cardNo.substring(0, 4) + ' **** **** ' + cardNo.substring(cardNo.length - 4);
    },

    selectType(e: any) {
        this.setData({
            'form.cardNo': ''
        });
        this.validateForm();
    },

    onCardNoInput(e: any) {
        this.setData({ 'form.cardNo': e.detail.value });
        this.validateForm();
    },

    validateForm() {
        const { form } = this.data;
        // 银行卡：15-19位数字
        const cardNo = form.cardNo.replace(/\s/g, '');
        const canSubmit = /^\d{15,19}$/.test(cardNo);

        this.setData({ canSubmit });
    },

    submitChange() {
        if (!this.data.canSubmit || this.data.submitting) return;

        const { form } = this.data;

        // 二次确认
        wx.showModal({
            title: '确认修改',
            content: `确定将银行卡号修改为：${form.cardNo}？`,
            success: (res) => {
                if (res.confirm) {
                    this.doSubmit();
                }
            }
        });
    },

    doSubmit() {
        this.setData({ submitting: true });

        request({
            url: '/api/withdraw/save-payment-info',
            method: 'POST',
            data: {
                userId: wx.getStorageSync('userId'),
                type: 3,
                bankCardNo: this.data.form.cardNo.trim(),
                bankHolderName: this.data.currentInfo.realName
            }
        }).then(res => {
            if (res.code === 200) {
                wx.showToast({ title: '修改成功', icon: 'success' });
                // 延迟返回上一页
                setTimeout(() => {
                    wx.navigateBack();
                }, 1500);
            } else {
                wx.showToast({ title: res.msg || '修改失败', icon: 'none' });
            }
        }).catch(() => {
            wx.showToast({ title: '网络错误', icon: 'none' });
        }).finally(() => {
            this.setData({ submitting: false });
        });
    },

    goBack() {
        wx.navigateBack();
    }
});
