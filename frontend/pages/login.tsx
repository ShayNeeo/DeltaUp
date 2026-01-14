import { useState } from 'react'
import { useRouter } from 'next/router'
import Link from 'next/link'
import { authAPI } from '@/lib/api'

export default function Login() {
    const router = useRouter()
    const [formData, setFormData] = useState({
        email: '',
        password: ''
    })
    const [error, setError] = useState('')
    const [loading, setLoading] = useState(false)

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault()
        setError('')
        setLoading(true)

        try {
            const response = await authAPI.login(formData)
            localStorage.setItem('token', response.token)
            localStorage.setItem('user', JSON.stringify(response.user))
            router.push('/dashboard')
        } catch (err: any) {
            setError(err.response?.data?.error || 'Login failed. Please try again.')
        } finally {
            setLoading(false)
        }
    }

    return (
        <div className="min-h-screen flex items-center justify-center bg-background px-4">
            <div className="absolute inset-0 overflow-hidden pointer-events-none">
                <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[600px] h-[600px] bg-primary/5 rounded-full blur-[120px]"></div>
            </div>

            <div className="relative w-full max-w-md animate-slideUp">
                <div className="glass-panel rounded-3xl p-10 shadow-2xl">
                    <div className="text-center mb-10">
                        <Link href="/" className="inline-flex items-center justify-center w-14 h-14 bg-primary rounded-2xl mb-6 shadow-lg shadow-primary/20">
                            <svg className="w-8 h-8 text-primary-foreground" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 10V3L4 14h7v7l9-11h-7z" />
                            </svg>
                        </Link>
                        <h1 className="text-3xl font-bold text-foreground">Sign In</h1>
                        <p className="text-muted mt-2">Access your DeltaUp account</p>
                    </div>

                    {error && (
                        <div className="bg-danger/10 border border-danger/20 text-danger px-4 py-3 rounded-xl mb-6 text-sm font-medium">
                            {error}
                        </div>
                    )}

                    <form onSubmit={handleSubmit} className="space-y-6">
                        <div>
                            <label htmlFor="email" className="block text-sm font-semibold text-foreground mb-2">
                                Email Address
                            </label>
                            <input
                                id="email"
                                type="email"
                                required
                                value={formData.email}
                                onChange={(e) => setFormData({ ...formData, email: e.target.value })}
                                className="w-full px-4 py-3 bg-surface-highlight border border-border rounded-xl text-foreground placeholder-muted focus:outline-none focus:ring-2 focus:ring-primary/50 focus:border-primary transition-all font-sans"
                                placeholder="name@company.com"
                            />
                        </div>

                        <div>
                            <div className="flex justify-between items-center mb-2">
                                <label htmlFor="password" className="block text-sm font-semibold text-foreground">
                                    Password
                                </label>
                                <a href="#" className="text-xs font-medium text-primary hover:underline">Forgot password?</a>
                            </div>
                            <input
                                id="password"
                                type="password"
                                required
                                value={formData.password}
                                onChange={(e) => setFormData({ ...formData, password: e.target.value })}
                                className="w-full px-4 py-3 bg-surface-highlight border border-border rounded-xl text-foreground placeholder-muted focus:outline-none focus:ring-2 focus:ring-primary/50 focus:border-primary transition-all font-sans"
                                placeholder="••••••••"
                            />
                        </div>

                        <button
                            type="submit"
                            disabled={loading}
                            className="w-full py-3.5 px-4 bg-primary text-primary-foreground font-bold rounded-xl shadow-lg shadow-primary/20 hover:scale-[1.01] active:scale-[0.99] transition-all disabled:opacity-50 disabled:cursor-not-allowed"
                        >
                            {loading ? 'Authenticating...' : 'Sign In to Dashboard'}
                        </button>
                    </form>

                    <div className="mt-8 text-center pt-8 border-t border-border">
                        <p className="text-muted text-sm">
                            New to DeltaUp?{' '}
                            <Link href="/register" className="text-primary font-bold hover:underline">
                                Create an account
                            </Link>
                        </p>
                    </div>
                </div>
                
                <p className="text-center mt-8 text-xs text-muted">
                    Secure 256-bit SSL encrypted connection
                </p>
            </div>
        </div>
    )
}