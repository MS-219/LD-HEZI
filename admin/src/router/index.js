import { createRouter, createWebHistory } from 'vue-router'
import Login from '../views/Login.vue'
import Dashboard from '../views/Dashboard.vue'
import DeviceList from '../views/DeviceList.vue'
import UserList from '../views/UserList.vue'
import Statistics from '../views/Statistics.vue'
import NoticeList from '../views/NoticeList.vue'
import WithdrawList from '../views/WithdrawList.vue'
import PaymentApplyList from '../views/PaymentApplyList.vue'
import EarningsList from '../views/EarningsList.vue'
import AiTaskList from '../views/AiTaskList.vue'
import FeedbackList from '../views/FeedbackList.vue'
import RewardList from '../views/RewardList.vue'
import Settings from '../views/Settings.vue'
import TeamList from '../views/TeamList.vue'
import MerchantList from '../views/MerchantList.vue'
import ApiDoc from '../views/ApiDoc.vue'
import DeviceTerminal from '../views/DeviceTerminal.vue'
import ExchangeProductList from '../views/ExchangeProductList.vue'
import ExchangeOrderList from '../views/ExchangeOrderList.vue'
import ImageLicenseList from '../views/ImageLicenseList.vue'

const routes = [
    {
        path: '/login',
        name: 'Login',
        component: Login,
        meta: { requiresAuth: false }
    },
    {
        path: '/terminal',
        name: 'Terminal',
        component: DeviceTerminal,
        meta: { requiresAuth: true, title: '远程终端' }
    },
    {
        path: '/',
        name: 'Dashboard',
        component: Dashboard,
        meta: { requiresAuth: true },
        redirect: () => {
            return localStorage.getItem('userRole') === 'factory' ? '/device' : '/statistics'
        },
        children: [
            {
                path: 'statistics',
                name: 'Statistics',
                component: Statistics,
                meta: { title: '数据统计' }
            },
            {
                path: 'device',
                name: 'DeviceList',
                component: DeviceList,
                meta: { title: '设备管理' }
            },
            {
                path: 'image-licenses',
                name: 'ImageLicenseList',
                component: ImageLicenseList,
                meta: { title: '镜像管理' }
            },
            {
                path: 'user',
                name: 'UserList',
                component: UserList,
                meta: { title: '用户管理' }
            },
            {
                path: 'notice',
                name: 'NoticeList',
                component: NoticeList,
                meta: { title: '公告管理' }
            },
            {
                path: 'withdraw',
                name: 'WithdrawList',
                component: WithdrawList,
                meta: { title: '提现管理' }
            },
            {
                path: 'payment-apply',
                name: 'PaymentApplyList',
                component: PaymentApplyList,
                meta: { title: '账户变更审核' }
            },
            {
                path: 'earnings',
                name: 'EarningsList',
                component: EarningsList,
                meta: { title: '收益管理' }
            },
            {
                path: 'ai-tasks',
                name: 'AiTaskList',
                component: AiTaskList,
                meta: { title: 'AI创作管理' }
            },
            {
                path: 'feedback',
                name: 'FeedbackList',
                component: FeedbackList,
                meta: { title: '意见反馈' }
            },
            {
                path: 'reward',
                name: 'RewardList',
                component: RewardList,
                meta: { title: '分润流水' }
            },
            {
                path: 'settings',
                name: 'Settings',
                component: Settings,
                meta: { title: '系统设置' }
            },
            {
                path: 'team',
                name: 'TeamList',
                component: TeamList,
                meta: { title: '团队管理' }
            },
            {
                path: 'merchant',
                name: 'MerchantList',
                component: MerchantList,
                meta: { title: '接口商户' }
            },
            {
                path: 'api-doc',
                name: 'ApiDoc',
                component: ApiDoc,
                meta: { title: 'API文档' }
            },
            {
                path: 'exchange-products',
                name: 'ExchangeProductList',
                component: ExchangeProductList,
                meta: { title: '兑换商品' }
            },
            {
                path: 'exchange-orders',
                name: 'ExchangeOrderList',
                component: ExchangeOrderList,
                meta: { title: '兑换订单' }
            }
        ]
    }
]

const router = createRouter({
    history: createWebHistory(),
    routes
})

// 路由守卫
router.beforeEach((to, from, next) => {
    const token = localStorage.getItem('token')
    const userRole = localStorage.getItem('userRole')

    if (to.meta.requiresAuth !== false && !token) {
        // 需要登录但没有 token，跳转登录页
        next('/login')
    } else if (to.path === '/login' && token) {
        // 已登录访问登录页，跳转首页
        if (userRole === 'factory') {
            next('/device')
        } else {
            next('/')
        }
    } else if (userRole === 'factory' && to.path !== '/device' && to.path !== '/login') {
        // 工厂用户只能访问设备二维码导出页
        next('/device')
    } else {
        next()
    }
})

export default router
