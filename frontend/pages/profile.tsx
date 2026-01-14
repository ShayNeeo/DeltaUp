import { useState, useEffect } from 'react'
import { useRouter } from 'next/router'
import Link from 'next/link'
import { authAPI, logout } from '@/lib/api'

interface User {
    username: string
    email: string
    account_number: string
    balance: number
}

export default function Profile() {
    const router = useRouter()
    const [user, setUser] = useState<User | null>(null)
    const [loading, setLoading] = useState(true)
    const [editing, setEditing] = useState(false)
    const [formData, setFormData] = useState({
        username: '',
        email: ''
    })

    useEffect(() => {
        const token = localStorage.getItem('token')
        if (!token) {
            router.push('/login')
            return
        }

        fetchUserData()
    }, [])

    const fetchUserData = async () => {
        try {
            const response = await authAPI.getProfile()
            setUser(response)
            setFormData({
                username: response.username,
                email: response.email
            })
            localStorage.setItem('user', JSON.stringify(response))
        } catch (err) {
            console.error('Failed to fetch user data:', err)
            router.push('/login')
        } finally {
            setLoading(false)
        }
    }

    const handleUpdate = (e: React.FormEvent) => {
        e.preventDefault()
        // Feature to be implemented in backend
        setEditing(false)
    }

    if (loading) {
        return (
            <div className="min-h-screen flex items-center justify-center bg-background">
                <div className="animate-spin rounded-full h-16 w-16 border-t-2 border-b-2 border-primary"></div>
            </div>
        )
    }

    return (
        <div className="bg-background min-h-screen font-sans pb-12">
            <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 py-8 sm:py-12 animate-slideUp">
                <div className="flex justify-between items-center mb-10">
                    <h1 className="text-3xl font-bold text-foreground tracking-tight">Account Profile</h1>
                    <Link
                        href="/dashboard"
                        className="px-6 py-2.5 bg-surface border border-border rounded-xl text-foreground font-medium hover:bg-surface-highlight transition-all"
                    >
                        Back to Dashboard
                    </Link>
                </div>

                <div className="glass-panel rounded-3xl p-8 sm:p-10 shadow-xl">
                    {!editing ? (
                        <div className="space-y-10">
                            <div className="flex flex-col items-center justify-center mb-4">
                                <div className="w-28 h-28 rounded-full bg-primary flex items-center justify-center text-primary-foreground text-4xl font-bold shadow-lg shadow-primary/20 mb-4">
                                    {user?.username.charAt(0).toUpperCase()}
                                </div>
                                <h2 className="text-2xl font-bold text-foreground">{user?.username}</h2>
                                <p className="text-muted">{user?.email}</p>
                            </div>

                            <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
                                <div className="space-y-1">
                                    <label className="text-xs font-bold text-muted uppercase tracking-widest">Legal Name</label>
                                    <p className="text-lg font-medium text-foreground">{user?.username}</p>
                                </div>

                                <div className="space-y-1">
                                    <label className="text-xs font-bold text-muted uppercase tracking-widest">Email Address</label>
                                    <p className="text-lg font-medium text-foreground">{user?.email}</p>
                                </div>

                                <div className="space-y-1">
                                    <label className="text-xs font-bold text-muted uppercase tracking-widest">Account Number</label>
                                    <p className="text-lg font-mono font-bold text-foreground">{user?.account_number}</p>
                                </div>

                                <div className="space-y-1">
                                    <label className="text-xs font-bold text-muted uppercase tracking-widest">Available Balance</label>
                                    <p className="text-lg font-mono font-bold text-emerald-600 dark:text-emerald-400">
                                        ${user?.balance.toLocaleString('en-US', { minimumFractionDigits: 2 })}
                                    </p>
                                </div>
                            </div>

                            <div className="flex flex-col sm:flex-row gap-4 pt-10 border-t border-border">
                                <button
                                    onClick={() => setEditing(true)}
                                    className="flex-1 py-3.5 px-6 bg-primary text-primary-foreground font-bold rounded-xl shadow-lg shadow-primary/20 hover:scale-[1.01] active:scale-[0.99] transition-all"
                                >
                                    Edit Account Details
                                </button>
                                <button
                                    onClick={logout}
                                    className="flex-1 py-3.5 px-6 bg-surface-highlight text-danger border border-border hover:bg-danger/10 hover:border-danger/30 font-bold rounded-xl transition-all"
                                >
                                    Sign Out
                                </button>
                            </div>
                        </div>
                    ) : (
                        <form onSubmit={handleUpdate} className="space-y-6">
                            <div className="text-center mb-8">
                                <h2 className="text-2xl font-bold text-foreground">Edit Profile</h2>
                                <p className="text-muted text-sm mt-1">Update your account information</p>
                            </div>

                            <div className="space-y-4">
                                <div>
                                    <label htmlFor="username" className="block text-sm font-semibold text-foreground mb-2">
                                        Username
                                    </label>
                                    <input
                                        id="username"
                                        type="text"
                                        value={formData.username}
                                        onChange={(e) => setFormData({ ...formData, username: e.target.value })}
                                        className="w-full px-4 py-3 bg-surface-highlight border border-border rounded-xl text-foreground placeholder-muted focus:outline-none focus:ring-2 focus:ring-primary/50 transition-all"
                                    />
                                </div>

                                <div>
                                    <label htmlFor="email" className="block text-sm font-semibold text-foreground mb-2">
                                        Email Address
                                    </label>
                                    <input
                                        id="email"
                                        type="email"
                                        value={formData.email}
                                        onChange={(e) => setFormData({ ...formData, email: e.target.value })}
                                        className="w-full px-4 py-3 bg-surface-highlight border border-border rounded-xl text-foreground placeholder-muted focus:outline-none focus:ring-2 focus:ring-primary/50 transition-all"
                                    />
                                </div>
                            </div>

                            <div className="flex gap-4 pt-6">
                                <button
                                    type="submit"
                                    className="flex-1 py-3.5 px-6 bg-primary text-primary-foreground font-bold rounded-xl shadow-lg transition-all"
                                >
                                    Save Changes
                                </button>
                                <button
                                    type="button"
                                    onClick={() => setEditing(false)}
                                    className="flex-1 py-3.5 px-6 bg-surface-highlight text-foreground border border-border font-bold rounded-xl transition-all"
                                >
                                    Cancel
                                </button>
                            </div>
                        </form>
                    )}
                </div>
            </div>
        </div>
    )
}