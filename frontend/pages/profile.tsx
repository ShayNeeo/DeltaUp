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
            const apiUrl = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:8000'
            const token = localStorage.getItem('token')
            const response = await axios.get(`${apiUrl}/api/user/profile`, {
                headers: { Authorization: `Bearer ${token}` }
            })
            setUser(response.data)
            setFormData({
                username: response.data.username,
                email: response.data.email
            })
        } catch (err) {
            console.error('Failed to fetch user data:', err)
            router.push('/login')
        } finally {
            setLoading(false)
        }
    }

    const handleUpdate = async (e: React.FormEvent) => {
        e.preventDefault()
        try {
            const apiUrl = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:8000'
            const token = localStorage.getItem('token')
            await axios.put(`${apiUrl}/api/user/profile`, formData, {
                headers: { Authorization: `Bearer ${token}` }
            })
            setEditing(false)
            fetchUserData()
        } catch (err) {
            console.error('Failed to update profile:', err)
        }
    }

    const handleLogout = () => {
        localStorage.removeItem('token')
        localStorage.removeItem('user')
        router.push('/logout')
    }

    if (loading) {
        return (
            <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-slate-900 via-indigo-900 to-slate-900">
                <div className="animate-spin rounded-full h-16 w-16 border-t-2 border-b-2 border-indigo-500"></div>
            </div>
        )
    }

    return (
        <div className="min-h-screen bg-gradient-to-br from-slate-900 via-indigo-900 to-slate-900">
            <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
                <div className="flex justify-between items-center mb-8">
                    <h1 className="text-4xl font-bold text-white">Profile</h1>
                    <Link
                        href="/dashboard"
                        className="px-6 py-3 bg-white/10 backdrop-blur-md border border-white/20 rounded-xl text-white hover:bg-white/20 transition-all"
                    >
                        Dashboard
                    </Link>
                </div>

                <div className="bg-white/10 backdrop-blur-xl rounded-3xl shadow-2xl p-8 border border-white/20">
                    {!editing ? (
                        <div className="space-y-6">
                            <div className="flex items-center justify-center mb-8">
                                <div className="w-32 h-32 rounded-full bg-gradient-to-r from-indigo-600 to-purple-600 flex items-center justify-center text-white text-5xl font-bold">
                                    {user?.username.charAt(0).toUpperCase()}
                                </div>
                            </div>

                            <div>
                                <label className="block text-sm font-medium text-indigo-300 mb-2">Username</label>
                                <p className="text-2xl text-white font-semibold">{user?.username}</p>
                            </div>

                            <div>
                                <label className="block text-sm font-medium text-indigo-300 mb-2">Email</label>
                                <p className="text-xl text-white">{user?.email}</p>
                            </div>

                            <div>
                                <label className="block text-sm font-medium text-indigo-300 mb-2">Account Number</label>
                                <p className="text-xl text-white font-mono">{user?.account_number}</p>
                            </div>

                            <div>
                                <label className="block text-sm font-medium text-indigo-300 mb-2">Balance</label>
                                <p className="text-2xl text-white font-bold">
                                    ${user?.balance.toLocaleString('en-US', { minimumFractionDigits: 2 })}
                                </p>
                            </div>

                            <div className="flex gap-4 pt-6">
                                <button
                                    onClick={() => setEditing(true)}
                                    className="flex-1 py-3 px-6 bg-gradient-to-r from-indigo-600 to-purple-600 hover:from-indigo-700 hover:to-purple-700 text-white font-semibold rounded-xl shadow-lg transition-all"
                                >
                                    Edit Profile
                                </button>
                                <button
                                    onClick={handleLogout}
                                    className="flex-1 py-3 px-6 bg-red-600 hover:bg-red-700 text-white font-semibold rounded-xl shadow-lg transition-all"
                                >
                                    Logout
                                </button>
                            </div>
                        </div>
                    ) : (
                        <form onSubmit={handleUpdate} className="space-y-6">
                            <div>
                                <label htmlFor="username" className="block text-sm font-medium text-indigo-300 mb-2">
                                    Username
                                </label>
                                <input
                                    id="username"
                                    type="text"
                                    value={formData.username}
                                    onChange={(e) => setFormData({ ...formData, username: e.target.value })}
                                    className="w-full px-4 py-3 bg-white/10 border border-white/20 rounded-xl text-white placeholder-indigo-300 focus:outline-none focus:ring-2 focus:ring-indigo-500 transition-all"
                                />
                            </div>

                            <div>
                                <label htmlFor="email" className="block text-sm font-medium text-indigo-300 mb-2">
                                    Email
                                </label>
                                <input
                                    id="email"
                                    type="email"
                                    value={formData.email}
                                    onChange={(e) => setFormData({ ...formData, email: e.target.value })}
                                    className="w-full px-4 py-3 bg-white/10 border border-white/20 rounded-xl text-white placeholder-indigo-300 focus:outline-none focus:ring-2 focus:ring-indigo-500 transition-all"
                                />
                            </div>

                            <div className="flex gap-4">
                                <button
                                    type="submit"
                                    className="flex-1 py-3 px-6 bg-gradient-to-r from-indigo-600 to-purple-600 hover:from-indigo-700 hover:to-purple-700 text-white font-semibold rounded-xl shadow-lg transition-all"
                                >
                                    Save Changes
                                </button>
                                <button
                                    type="button"
                                    onClick={() => setEditing(false)}
                                    className="flex-1 py-3 px-6 bg-white/10 border border-white/20 hover:bg-white/20 text-white font-semibold rounded-xl transition-all"
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
