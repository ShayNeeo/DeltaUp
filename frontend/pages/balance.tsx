import React, { useState, useEffect } from 'react'
import { useRouter } from 'next/router'
import { transactionAPI } from '@/lib/api'
import Preloader from '@/components/Preloader'

interface BalanceData {
  balance?: number
  account_number?: string
  currency?: string
}

export default function Balance() {
  const router = useRouter()
  const [balance, setBalance] = useState<BalanceData | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')
  const [showContent, setShowContent] = useState(false)

  useEffect(() => {
    const startTime = Date.now()
    const minDisplayTime = 600

    const fetchBalance = async () => {
      try {
        const token = localStorage.getItem('token')
        if (!token) {
          router.push('/login')
          return
        }
        const response = await transactionAPI.getBalance()
        setBalance(response)
      } catch (err: any) {
        setError(err.response?.data?.error || 'Failed to fetch balance')
      } finally {
        const elapsed = Date.now() - startTime
        const remaining = Math.max(0, minDisplayTime - elapsed)
        setTimeout(() => {
          setLoading(false)
          setTimeout(() => setShowContent(true), 100)
        }, remaining)
      }
    }

    fetchBalance()
  }, [])

  if (loading) {
    return <Preloader message="Fetching secure balance data..." />
  }

  return (
    <div className={`bg-background min-h-screen font-sans pb-12 transition-opacity duration-500 ${showContent ? 'opacity-100' : 'opacity-0'}`}>
      <div className="max-w-5xl mx-auto px-4 sm:px-6 lg:px-8 py-8 sm:py-12 animate-slideUp">
        <div className="flex justify-between items-center mb-10">
          <div>
            <h1 className="text-3xl font-bold text-foreground tracking-tight">Account Balance</h1>
            <p className="text-muted mt-1">Detailed overview of your liquid assets</p>
          </div>
          <button
            onClick={() => router.push('/dashboard')}
            className="p-2 rounded-xl text-muted hover:text-foreground hover:bg-surface-highlight transition-all border border-transparent hover:border-border"
          >
            <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10 19l-7-7m0 0l7-7m-7 7h18" />
            </svg>
          </button>
        </div>

        {error && (
          <div className="mb-8 p-4 bg-danger/10 border border-danger/20 text-danger rounded-xl text-sm font-medium">
            {error}
          </div>
        )}

        {balance && (
          <div className="space-y-8">
            {/* Balance Card */}
            <div className="bg-gradient-to-br from-primary via-primary to-accent rounded-3xl p-10 sm:p-12 text-primary-foreground shadow-2xl shadow-primary/20 relative overflow-hidden">
               <div className="absolute top-0 right-0 w-80 h-80 bg-white/10 rounded-full -mr-20 -mt-20 blur-3xl"></div>
               <div className="absolute bottom-0 left-0 w-64 h-64 bg-white/5 rounded-full -ml-32 -mb-32 blur-2xl"></div>
               
               <div className="relative z-10">
                <p className="text-primary-foreground/70 text-sm font-bold uppercase tracking-widest mb-4">Current Liquidity</p>
                <h2 className="text-5xl sm:text-7xl font-mono font-bold tracking-tighter mb-4">
                  ${(balance.balance ?? 0).toLocaleString('en-US', { minimumFractionDigits: 2 })}
                </h2>
                <div className="flex items-center gap-4">
                  <span className="px-3 py-1 bg-white/20 rounded-lg text-xs font-bold tracking-wide backdrop-blur-md">
                    {balance.currency || 'USD'}
                  </span>
                  <span className="text-primary-foreground/60 text-xs font-medium">Live sync enabled</span>
                </div>
              </div>
            </div>

            {/* Details Grid */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              <div className="glass-panel p-6 rounded-2xl flex items-center gap-5">
                <div className="w-14 h-14 bg-primary/10 rounded-xl flex items-center justify-center text-primary">
                   <svg className="w-7 h-7" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 10h18M7 15h1m4 0h1m-7 4h12a3 3 0 003-3V8a3 3 0 00-3-3H6a3 3 0 00-3 3v8a3 3 0 003 3z" />
                    </svg>
                </div>
                <div>
                  <p className="text-xs font-bold text-muted uppercase tracking-widest mb-1">Account Number</p>
                  <p className="text-xl font-bold font-mono text-foreground tracking-tight">{balance.account_number || '****'}</p>
                </div>
              </div>

              <div className="glass-panel p-6 rounded-2xl flex items-center gap-5">
                <div className="w-14 h-14 bg-emerald-500/10 rounded-xl flex items-center justify-center text-emerald-500">
                    <svg className="w-7 h-7" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8c-1.657 0-3 .895-3 2s1.343 2 3 2 3 .895 3 2-1.343 2-3 2m0-8c1.11 0 2.08.402 2.599 1M12 8V7m0 1v8m0 0v1m0-1c-1.11 0-2.08-.402-2.599-1M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                    </svg>
                </div>
                <div>
                  <p className="text-xs font-bold text-muted uppercase tracking-widest mb-1">Status</p>
                  <p className="text-xl font-bold text-foreground">Active & Secure</p>
                </div>
              </div>
            </div>

            {/* Action Cards */}
            <div className="glass-panel p-8 rounded-3xl">
              <h3 className="text-xl font-bold text-foreground mb-8">Quick Actions</h3>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <button
                  onClick={() => router.push('/transfer')}
                  className="group glass-card p-6 rounded-2xl text-left"
                >
                  <div className="w-12 h-12 bg-primary/10 rounded-xl flex items-center justify-center mb-4 group-hover:bg-primary group-hover:text-primary-foreground transition-all">
                    💸
                  </div>
                  <span className="font-bold text-foreground block mb-1">Send Funds</span>
                  <span className="text-xs text-muted">Instant transfer to any account</span>
                </button>
                <button
                  onClick={() => router.push('/qr-payment')}
                  className="group glass-card p-6 rounded-2xl text-left"
                >
                  <div className="w-12 h-12 bg-accent/10 rounded-xl flex items-center justify-center mb-4 group-hover:bg-accent group-hover:text-white transition-all">
                    📱
                  </div>
                  <span className="font-bold text-foreground block mb-1">QR Payment</span>
                  <span className="text-xs text-muted">Pay or request via QR code</span>
                </button>
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  )
}