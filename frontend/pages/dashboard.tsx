import { useState, useEffect } from 'react'
import { useRouter } from 'next/router'
import Link from 'next/link'
import axios from 'axios'

interface User {
    username: string
    email: string
    account_number: string
    balance: number
}

interface Transaction {
    id: string
    from_account: string
    to_account: string
    amount: number
    description: string
    status: string
    created_at: string
}

export default function Dashboard() {
    const router = useRouter()
    const [user, setUser] = useState<User | null>(null)
    const [transactions, setTransactions] = useState<Transaction[]>([])
    const [loading, setLoading] = useState(true)

    useEffect(() => {
        const token = localStorage.getItem('token')
        if (!token) {
            router.push('/login')
            return
        }

        fetchUserData()
        fetchTransactions()
    }, [])

    const fetchUserData = async () => {
        try {
            const apiUrl = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:8000'
            const token = localStorage.getItem('token')
            const response = await axios.get(`${apiUrl}/api/user/profile`, {
                headers: { Authorization: `Bearer ${token}` }
            })
            setUser(response.data)
        } catch (err) {
            console.error('Failed to fetch user data:', err)
            router.push('/login')
        } finally {
            setLoading(false)
        }
    }

    const fetchTransactions = async () => {
        try {
            const apiUrl = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:8000'
            const token = localStorage.getItem('token')
            const response = await axios.get(`${apiUrl}/api/transactions`, {
                headers: { Authorization: `Bearer ${token}` }
            })
            setTransactions(response.data.slice(0, 5))
        } catch (err) {
            console.error('Failed to fetch transactions:', err)
        }
    }

    if (loading) {
        return (
            <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-slate-900 via-purple-900 to-slate-900">
                <div className="animate-spin rounded-full h-16 w-16 border-t-2 border-b-2 border-purple-500"></div>
            </div>
        )
    }

    return (
        <div className="min-h-screen bg-gradient-to-br from-slate-900 via-purple-900 to-slate-900">
            <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
                {/* Header */}
                <div className="flex justify-between items-center mb-8">
                    <div>
                        <h1 className="text-4xl font-bold text-white mb-2">Dashboard</h1>
                        <p className="text-purple-300">Welcome back, {user?.username}</p>
                    </div>
                    <Link
                        href="/profile"
                        className="px-6 py-3 bg-white/10 backdrop-blur-md border border-white/20 rounded-xl text-white hover:bg-white/20 transition-all"
                    >
                        Profile
                    </Link>
                </div>

                {/* Balance Card */}
                <div className="bg-gradient-to-r from-purple-600 to-pink-600 rounded-3xl shadow-2xl p-8 mb-8 border border-white/20">
                    <p className="text-purple-100 text-sm mb-2">Total Balance</p>
                    <h2 className="text-5xl font-bold text-white mb-4">
                        ${user?.balance.toLocaleString('en-US', { minimumFractionDigits: 2 })}
                    </h2>
                    <p className="text-purple-100 text-sm">Account: {user?.account_number}</p>
                </div>

                {/* Quick Actions */}
                <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-8">
                    <Link href="/transfer">
                        <div className="bg-white/10 backdrop-blur-xl rounded-2xl p-6 border border-white/20 hover:bg-white/20 transition-all cursor-pointer group">
                            <div className="text-4xl mb-4 group-hover:scale-110 transition-transform">💸</div>
                            <h3 className="text-xl font-semibold text-white mb-2">Bank Transfer</h3>
                            <p className="text-purple-200">Send money to any account</p>
                        </div>
                    </Link>

                    <Link href="/qr-payment">
                        <div className="bg-white/10 backdrop-blur-xl rounded-2xl p-6 border border-white/20 hover:bg-white/20 transition-all cursor-pointer group">
                            <div className="text-4xl mb-4 group-hover:scale-110 transition-transform">📱</div>
                            <h3 className="text-xl font-semibold text-white mb-2">QR Payment</h3>
                            <p className="text-purple-200">Pay with QR code</p>
                        </div>
                    </Link>

                    <Link href="/balance">
                        <div className="bg-white/10 backdrop-blur-xl rounded-2xl p-6 border border-white/20 hover:bg-white/20 transition-all cursor-pointer group">
                            <div className="text-4xl mb-4 group-hover:scale-110 transition-transform">💰</div>
                            <h3 className="text-xl font-semibold text-white mb-2">Balance</h3>
                            <p className="text-purple-200">Check your balance</p>
                        </div>
                    </Link>
                </div>

                {/* Recent Transactions */}
                <div className="bg-white/10 backdrop-blur-xl rounded-2xl p-6 border border-white/20">
                    <h3 className="text-2xl font-bold text-white mb-6">Recent Transactions</h3>
                    {transactions.length === 0 ? (
                        <p className="text-purple-300 text-center py-8">No transactions yet</p>
                    ) : (
                        <div className="space-y-4">
                            {transactions.map((tx) => (
                                <div
                                    key={tx.id}
                                    className="bg-white/5 rounded-xl p-4 border border-white/10 hover:bg-white/10 transition-all"
                                >
                                    <div className="flex justify-between items-start">
                                        <div>
                                            <p className="text-white font-semibold">
                                                {tx.from_account === user?.account_number ? 'Sent to' : 'Received from'}{' '}
                                                {tx.from_account === user?.account_number ? tx.to_account : tx.from_account}
                                            </p>
                                            <p className="text-purple-300 text-sm mt-1">{tx.description || 'No description'}</p>
                                            <p className="text-purple-400 text-xs mt-1">
                                                {new Date(tx.created_at).toLocaleString()}
                                            </p>
                                        </div>
                                        <div className="text-right">
                                            <p
                                                className={`text-lg font-bold ${tx.from_account === user?.account_number ? 'text-red-400' : 'text-green-400'
                                                    }`}
                                            >
                                                {tx.from_account === user?.account_number ? '-' : '+'}$
                                                {tx.amount.toLocaleString('en-US', { minimumFractionDigits: 2 })}
                                            </p>
                                            <span
                                                className={`text-xs px-2 py-1 rounded-full ${tx.status === 'completed'
                                                        ? 'bg-green-500/20 text-green-300'
                                                        : 'bg-yellow-500/20 text-yellow-300'
                                                    }`}
                                            >
                                                {tx.status}
                                            </span>
                                        </div>
                                    </div>
                                </div>
                            ))}
                        </div>
                    )}
                </div>
            </div>
        </div>
    )
}
