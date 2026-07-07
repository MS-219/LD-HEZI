import axios from 'axios'

// 请求拦截器：自动添加 Authorization header
axios.interceptors.request.use(
    (config) => {
        const token = localStorage.getItem('token')
        if (token) {
            config.headers['Authorization'] = `Bearer ${token}`
        }
        return config
    },
    (error) => {
        return Promise.reject(error)
    }
)

// 响应拦截器：处理401错误
axios.interceptors.response.use(
    (response) => {
        return response
    },
    (error) => {
        if (error.response && error.response.status === 401) {
            // 清除token并跳转登录
            localStorage.removeItem('token')
            window.location.href = '/login'
        }
        return Promise.reject(error)
    }
)

export default axios
