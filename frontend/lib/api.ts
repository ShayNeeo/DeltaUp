import axios, { AxiosInstance, AxiosError } from 'axios'

const API_URL = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:8000'

// Create axios instance
const api: AxiosInstance = axios.create({
    baseURL: API_URL,
    headers: {
        'Content-Type': 'application/json',
    },
})

// Request interceptor to add auth token
api.interceptors.request.use(
    (config) => {
        if (typeof window !== 'undefined') {
            const token = localStorage.getItem('token')
            if (token) {
                config.headers.Authorization = `Bearer ${token}`
            }
        }
        return config
    },
    (error) => Promise.reject(error)
)

// Response interceptor for error handling
api.interceptors.response.use(
    (response) => response,
    (error: AxiosError) => {
        if (error.response?.status === 401 && typeof window !== 'undefined') {
            // Unauthorized - clear token and redirect to login
            localStorage.removeItem('token')
            localStorage.removeItem('user')
            window.location.href = '/login'
        }
        return Promise.reject(error)
    }
)

// API functions
export const authAPI = {
    register: async (data: { username: string; email: string; password: string }) => {
        const response = await api.post('/api/auth/register', data)
        return response.data
    },

    login: async (data: { email: string; password: string }) => {
        const response = await api.post('/api/auth/login', data)
        return response.data
    },

    getProfile: async () => {
        const response = await api.get('/api/user/profile')
        return response.data
    },
}

export const transactionAPI = {
    transfer: async (data: { recipient_account: string; amount: number; description?: string }) => {
        const response = await api.post('/api/transfer', data)
        return response.data
    },

    getBalance: async () => {
        const response = await api.get('/api/balance')
        return response.data
    },

    qrPayment: async (data: { qr_data: string }) => {
        const response = await api.post('/api/qr-payment', data)
        return response.data
    },

    getTransactions: async () => {
        const response = await api.get('/api/transactions')
        return response.data
    },
}

export const healthAPI = {
    check: async () => {
        const response = await api.get('/api/health')
        return response.data
    },
}

// Helper function to check authentication
export const isAuthenticated = (): boolean => {
    if (typeof window === 'undefined') return false
    const token = localStorage.getItem('token')
    return !!token
}

// Helper function to get user from localStorage
export const getUser = () => {
    if (typeof window === 'undefined') return null
    const userStr = localStorage.getItem('user')
    return userStr ? JSON.parse(userStr) : null
}

// Helper function to logout
export const logout = () => {
    if (typeof window !== 'undefined') {
        localStorage.removeItem('token')
        localStorage.removeItem('user')
        window.location.href = '/logout'
    }
}

export default api
