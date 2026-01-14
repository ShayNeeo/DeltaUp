import { useState, useEffect } from 'react'
import { useRouter } from 'next/router'
import Link from 'next/link'
import { authAPI, transactionAPI } from '@/lib/api'
import { externalAPI, CryptoPrice } from '@/lib/external'

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
    const [marketData, setMarketData] = useState<CryptoPrice[]>([])
    const [loading, setLoading] = useState(true)

    useEffect(() => {
        const token = localStorage.getItem('token')
        if (!token) {
            router.push('/login')
            return
        }

        fetchUserData()
        fetchTransactions()
        fetchMarketData()
    }, [])

    const fetchUserData = async () => {
        try {
            const response = await authAPI.getProfile()
            setUser(response)
            localStorage.setItem('user', JSON.stringify(response))
        } catch (err) {
            console.error('Failed to fetch user data:', err)
            router.push('/login')
        } finally {
            setLoading(false)
        }
    }

    const fetchTransactions = async () => {
        try {
            const response = await transactionAPI.getTransactions()
            setTransactions(Array.isArray(response) ? response.slice(0, 5) : [])
        } catch (err) {
            console.error('Failed to fetch transactions:', err)
        }
    }

    const fetchMarketData = async () => {
        try {
            const data = await externalAPI.getMarketData()
            setMarketData(data)
        } catch (err) {
            console.error('Failed to fetch market data:', err)
        }
    }

    if (loading) {
        return (
            <div className="min-h-screen flex items-center justify-center bg-background">
                <div className="animate-spin rounded-full h-16 w-16 border-t-2 border-b-2 border-primary"></div>
            </div>
        )
    }

    return (
        <div className="min-h-screen bg-background pb-12">
            <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
                {/* Header */}
                <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 mb-8 animate-slideUp">
                    <div>
                        <h1 className="text-3xl font-bold text-foreground tracking-tight">Dashboard</h1>
                        <p className="text-muted mt-1">Welcome back, {user?.username}</p>
                    </div>
                    <Link
                        href="/profile"
                        className="inline-flex justify-center items-center px-6 py-2.5 bg-surface border border-border rounded-xl text-foreground font-medium hover:bg-surface-highlight transition-all shadow-sm hover:shadow"
                    >
                        View Profile
                    </Link>
                </div>

                {/* Balance Card */}
                <div className="bg-gradient-to-br from-primary to-accent rounded-3xl shadow-xl shadow-primary/20 p-8 mb-8 text-primary-foreground relative overflow-hidden animate-slideUp" style={{ animationDelay: '100ms' }}>
                    <div className="absolute top-0 right-0 w-64 h-64 bg-white/10 rounded-full -translate-y-1/2 translate-x-1/3 blur-3xl"></div>
                    <div className="relative z-10">
                        <p className="text-primary-foreground/80 text-sm font-medium mb-1">Total Balance</p>
                        <h2 className="text-5xl font-bold font-mono tracking-tighter mb-4">
                            ${user?.balance.toLocaleString('en-US', { minimumFractionDigits: 2 })}
                        </h2>
                        <div className="flex items-center gap-2 text-primary-foreground/90 bg-white/10 w-fit px-3 py-1.5 rounded-lg backdrop-blur-sm">
                            <span className="text-xs uppercase tracking-wider font-semibold opacity-70">Account</span>
                            <span className="font-mono">{user?.account_number}</span>
                        </div>
                    </div>
                </div>

                {/* Quick Actions */}
                <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-8 animate-slideUp" style={{ animationDelay: '200ms' }}>
                    <Link href="/transfer">
                        <div className="glass-panel p-6 rounded-2xl hover:scale-[1.02] transition-transform cursor-pointer group">
                            <div className="w-12 h-12 bg-primary/10 rounded-xl flex items-center justify-center text-2xl mb-4 group-hover:bg-primary group-hover:text-primary-foreground transition-colors">
                                💸
                            </div>
                            <h3 className="text-lg font-semibold text-foreground mb-1">Bank Transfer</h3>
                            <p className="text-sm text-muted">Send money to any DeltaUp account instantly.</p>
                        </div>
                    </Link>

                    <Link href="/qr-payment">
                        <div className="glass-panel p-6 rounded-2xl hover:scale-[1.02] transition-transform cursor-pointer group">
                            <div className="w-12 h-12 bg-accent/10 rounded-xl flex items-center justify-center text-2xl mb-4 group-hover:bg-accent group-hover:text-white transition-colors">
                                📱
                            </div>
                            <h3 className="text-lg font-semibold text-foreground mb-1">QR Payment</h3>
                            <p className="text-sm text-muted">Scan to pay or generate your code.</p>
                        </div>
                    </Link>

                    <Link href="/balance">
                        <div className="glass-panel p-6 rounded-2xl hover:scale-[1.02] transition-transform cursor-pointer group">
                            <div className="w-12 h-12 bg-emerald-500/10 rounded-xl flex items-center justify-center text-2xl mb-4 group-hover:bg-emerald-500 group-hover:text-white transition-colors">
                                💰
                            </div>
                            <h3 className="text-lg font-semibold text-foreground mb-1">Detailed Balance</h3>
                            <p className="text-sm text-muted">View your full transaction history and analytics.</p>
                        </div>
                    </Link>
                </div>

                {/* Market Watch (External API) */}
                <div className="glass-panel rounded-2xl p-6 mb-8 animate-slideUp" style={{ animationDelay: '300ms' }}>
                    <div className="flex justify-between items-center mb-6">
                        <h3 className="text-xl font-bold text-foreground">Market Watch</h3>
                        <span className="text-xs font-medium text-muted bg-surface-highlight px-2 py-1 rounded border border-border">
                            Live Data • CoinGecko API
                        </span>
                    </div>
                    
                    <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-5 gap-4">
                        {marketData.map((coin) => (
                            <div key={coin.id} className="glass-card rounded-xl p-4">
                                <div className="flex items-center gap-3 mb-3">
                                    <img src={coin.image} alt={coin.name} className="w-8 h-8 rounded-full shadow-sm" />
                                    <div>
                                        <p className="font-bold text-foreground leading-none">{coin.symbol.toUpperCase()}</p>
                                        <p className="text-xs text-muted mt-0.5">{coin.name}</p>
                                    </div>
                                </div>
                                <div className="space-y-1">
                                    <p className="text-foreground font-mono font-semibold">${coin.current_price.toLocaleString()}</p>
                                    <p className={`text-xs font-medium ${coin.price_change_percentage_24h >= 0 ? 'text-emerald-500' : 'text-red-500'}`}>
                                        {coin.price_change_percentage_24h >= 0 ? '↑' : '↓'} {Math.abs(coin.price_change_percentage_24h).toFixed(2)}%
                                    </p>
                                </div>
                            </div>
                        ))}
                    </div>
                </div>

                {/* Recent Transactions */}
                <div className="glass-panel rounded-2xl p-6 animate-slideUp" style={{ animationDelay: '400ms' }}>
                    <div className="flex justify-between items-center mb-6">
                        <h3 className="text-xl font-bold text-foreground">Recent Transactions</h3>
                        <Link href="/balance" className="text-sm text-primary hover:text-primary/80 font-medium">View All</Link>
                    </div>

                    {transactions.length === 0 ? (
                        <div className="text-center py-12">
                            <div className="w-16 h-16 bg-surface-highlight rounded-full flex items-center justify-center mx-auto mb-4 text-2xl">📝</div>
                            <p className="text-muted">No transactions yet.</p>
                        </div>
                    ) : (
                        <div className="space-y-3">
                            {transactions.map((tx) => (
                                <div
                                    key={tx.id}
                                    className="group flex flex-col sm:flex-row justify-between sm:items-center p-4 rounded-xl hover:bg-surface-highlight transition-colors border border-transparent hover:border-border"
                                >
                                    <div className="flex items-start gap-4 mb-3 sm:mb-0">
                                        <div className={`w-10 h-10 rounded-full flex items-center justify-center text-lg shrink-0 ${
                                            tx.from_account === user?.account_number 
                                            ? 'bg-red-500/10 text-red-500' 
                                            : 'bg-emerald-500/10 text-emerald-500'
                                        }`}>
                                            {tx.from_account === user?.account_number ? '↗' : '↙'}
                                        </div>
                                        <div>
                                            <p className="font-semibold text-foreground">
                                                {tx.from_account === user?.account_number ? 'Sent to' : 'Received from'}{' '}
                                                <span className="font-mono text-sm opacity-80">
                                                    {tx.from_account === user?.account_number ? tx.to_account : tx.from_account}
                                                </span>
                                            </p>
                                            <p className="text-sm text-muted">{tx.description || 'No description'}</p>
                                        </div>
                                    </div>
                                    <div className="text-right pl-14 sm:pl-0">
                                        <p className={`font-mono font-bold ${
                                            tx.from_account === user?.account_number ? 'text-foreground' : 'text-emerald-600 dark:text-emerald-400'
                                        }`}>
                                            {tx.from_account === user?.account_number ? '-' : '+'}${tx.amount.toLocaleString('en-US', { minimumFractionDigits: 2 })}
                                        </p>
                                        <p className="text-xs text-muted">
                                            {new Date(tx.created_at).toLocaleDateString(undefined, { month: 'short', day: 'numeric', hour: '2-digit', minute: '2-digit' })}
                                        </p>
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