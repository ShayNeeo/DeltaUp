import React, { useState, useEffect } from 'react'
import { useRouter } from 'next/router'
import axios from 'axios'
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
    const minDisplayTime = 600 // Minimum 600ms display time

    const fetchBalance = async () => {
      try {
        const token = localStorage.getItem('token')
        const response = await axios.get(`${process.env.NEXT_PUBLIC_API_URL}/api/balance`, {
          headers: { Authorization: `Bearer ${token}` }
        })
        setBalance(response.data)
      } catch (err: any) {
        setError(err.response?.data?.message || 'Failed to fetch balance')
      } finally {
        const elapsed = Date.now() - startTime
        const remaining = Math.max(0, minDisplayTime - elapsed)
        
        setTimeout(() => {
          setLoading(false)
          // Small delay before showing content for smooth transition
          setTimeout(() => setShowContent(true), 100)
        }, remaining)
      }
    }

    fetchBalance()
  }, [])

  if (loading) {
    return <Preloader message="Fetching your balance..." />
  }

  return (
    <div className={`max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8 sm:py-12 transition-opacity duration-300 ${showContent ? 'opacity-100' : 'opacity-0'}`}>
      <div className="space-y-10">
        <div className="flex justify-between items-start">
          <div>
            <h1 className="text-4xl sm:text-5xl font-light text-slate-900 mb-2 tracking-tight">Account Balance</h1>
            <p className="text-base text-slate-600">View your account details and balance</p>
          </div>
          <button
            onClick={() => router.push('/')}
            className="p-2 rounded-xl text-slate-500 hover:text-slate-700 hover:bg-slate-100 transition-all"
            aria-label="Go back"
          >
            <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10 19l-7-7m0 0l7-7m-7 7h18" />
            </svg>
          </button>
        </div>

        {error && (
          <div className="bg-red-50 border border-red-200/80 text-red-700 px-6 py-4 rounded-xl flex items-center gap-2">
            <svg className="w-5 h-5 flex-shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
            </svg>
            <span>{error}</span>
          </div>
        )}

        {balance && (
          <div className="space-y-8">
            {/* Main Balance Card */}
            <div className="bg-gradient-to-br from-blue-600 via-blue-600 to-cyan-600 rounded-3xl p-10 sm:p-12 text-white shadow-xl relative overflow-hidden">
              <div className="absolute top-0 right-0 w-64 h-64 bg-white/10 rounded-full -mr-32 -mt-32"></div>
              <div className="absolute bottom-0 left-0 w-48 h-48 bg-white/10 rounded-full -ml-24 -mb-24"></div>
              <div className="relative">
                <p className="text-blue-100 text-sm font-medium mb-3 uppercase tracking-wide">Total Balance</p>
                <h2 className="text-5xl sm:text-6xl font-light mb-3 tracking-tight">
                  ${(balance.balance ?? 0).toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                </h2>
                <p className="text-blue-100 text-sm">
                  Currency: <span className="font-medium">{balance.currency || 'USD'}</span>
                </p>
              </div>
            </div>

            {/* Account Details Grid */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
              <div className="bg-white border border-slate-200/80 rounded-2xl p-6 shadow-sm hover:shadow-md transition-shadow">
                <div className="flex items-center gap-4">
                  <div className="w-14 h-14 bg-gradient-to-br from-blue-50 to-blue-100 rounded-xl flex items-center justify-center">
                    <svg className="w-7 h-7 text-blue-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 10h18M7 15h1m4 0h1m-7 4h12a3 3 0 003-3V8a3 3 0 00-3-3H6a3 3 0 00-3 3v8a3 3 0 003 3z" />
                    </svg>
                  </div>
                  <div>
                    <p className="text-xs font-medium text-slate-500 mb-1 uppercase tracking-wide">Account Number</p>
                    <p className="text-xl font-semibold text-slate-900 font-mono">
                      {balance.account_number || '****'}
                    </p>
                  </div>
                </div>
              </div>

              <div className="bg-white border border-slate-200/80 rounded-2xl p-6 shadow-sm hover:shadow-md transition-shadow">
                <div className="flex items-center gap-4">
                  <div className="w-14 h-14 bg-gradient-to-br from-emerald-50 to-emerald-100 rounded-xl flex items-center justify-center">
                    <svg className="w-7 h-7 text-emerald-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8c-1.657 0-3 .895-3 2s1.343 2 3 2 3 .895 3 2-1.343 2-3 2m0-8c1.11 0 2.08.402 2.599 1M12 8V7m0 1v8m0 0v1m0-1c-1.11 0-2.08-.402-2.599-1M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                    </svg>
                  </div>
                  <div>
                    <p className="text-xs font-medium text-slate-500 mb-1 uppercase tracking-wide">Currency</p>
                    <p className="text-xl font-semibold text-slate-900">
                      {balance.currency || 'USD'}
                    </p>
                  </div>
                </div>
              </div>
            </div>

            {/* Quick Actions */}
            <div className="bg-white border border-slate-200/80 rounded-2xl p-8 shadow-sm">
              <h3 className="text-xl font-semibold text-slate-900 mb-6">Quick Actions</h3>
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                <button
                  onClick={() => router.push('/transfer')}
                  className="group bg-gradient-to-br from-slate-50 to-white border border-slate-200 rounded-xl p-6 hover:border-blue-400 hover:shadow-lg transition-all text-center transform hover:-translate-y-0.5"
                >
                  <div className="w-12 h-12 bg-gradient-to-br from-blue-50 to-blue-100 rounded-xl flex items-center justify-center mx-auto mb-3 group-hover:scale-110 transition-transform">
                    <svg className="w-6 h-6 text-blue-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M7 16a4 4 0 01-.88-7.903A5 5 0 1115.9 6L16 6a5 5 0 011 9.9M15 13l-3-3m0 0l-3 3m3-3v12" />
                    </svg>
                  </div>
                  <span className="font-semibold text-slate-900">Send Transfer</span>
                </button>
                <button
                  onClick={() => router.push('/qr-payment')}
                  className="group bg-gradient-to-br from-slate-50 to-white border border-slate-200 rounded-xl p-6 hover:border-violet-400 hover:shadow-lg transition-all text-center transform hover:-translate-y-0.5"
                >
                  <div className="w-12 h-12 bg-gradient-to-br from-violet-50 to-violet-100 rounded-xl flex items-center justify-center mx-auto mb-3 group-hover:scale-110 transition-transform">
                    <svg className="w-6 h-6 text-violet-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v1m6 11h2m-6 0h-2v4m0-11v3m0 0h.01M12 12h4.01M16 20h4M4 12h4m12 0h.01M5 8h2a1 1 0 001-1V5a1 1 0 00-1-1H5a1 1 0 00-1 1v2a1 1 0 001 1zm12 0h2a1 1 0 001-1V5a1 1 0 00-1-1h-2a1 1 0 00-1 1v2a1 1 0 001 1zM5 20h2a1 1 0 001-1v-2a1 1 0 00-1-1H5a1 1 0 00-1 1v2a1 1 0 001 1z" />
                    </svg>
                  </div>
                  <span className="font-semibold text-slate-900">QR Payment</span>
                </button>
                <button
                  onClick={() => window.location.reload()}
                  className="group bg-gradient-to-br from-slate-50 to-white border border-slate-200 rounded-xl p-6 hover:border-slate-400 hover:shadow-lg transition-all text-center transform hover:-translate-y-0.5"
                >
                  <div className="w-12 h-12 bg-gradient-to-br from-slate-100 to-slate-200 rounded-xl flex items-center justify-center mx-auto mb-3 group-hover:scale-110 transition-transform">
                    <svg className="w-6 h-6 text-slate-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" />
                    </svg>
                  </div>
                  <span className="font-semibold text-slate-900">Refresh</span>
                </button>
              </div>
            </div>

            {/* Info Boxes */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
              <div className="bg-gradient-to-br from-blue-50 to-blue-100/50 border border-blue-200/80 rounded-xl p-6 hover:shadow-md transition-shadow">
                <div className="flex items-center gap-3 mb-3">
                  <div className="w-10 h-10 bg-blue-600 rounded-lg flex items-center justify-center">
                    <svg className="w-5 h-5 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 19v-6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2a2 2 0 002-2zm0 0V9a2 2 0 012-2h2a2 2 0 012 2v10m-6 0a2 2 0 002 2h2a2 2 0 002-2m0 0V5a2 2 0 012-2h2a2 2 0 012 2v14a2 2 0 01-2 2h-2a2 2 0 01-2-2z" />
                    </svg>
                  </div>
                  <h3 className="font-semibold text-blue-900">Real-time Updates</h3>
                </div>
                <p className="text-sm text-blue-800 leading-relaxed">
                  Your balance updates instantly when transfers are completed. This is a sandbox environment for testing.
                </p>
              </div>

              <div className="bg-gradient-to-br from-emerald-50 to-emerald-100/50 border border-emerald-200/80 rounded-xl p-6 hover:shadow-md transition-shadow">
                <div className="flex items-center gap-3 mb-3">
                  <div className="w-10 h-10 bg-emerald-600 rounded-lg flex items-center justify-center">
                    <svg className="w-5 h-5 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 15v2m-6 4h12a2 2 0 002-2v-6a2 2 0 00-2-2H6a2 2 0 00-2 2v6a2 2 0 002 2zm10-10V7a4 4 0 00-8 0v4h8z" />
                    </svg>
                  </div>
                  <h3 className="font-semibold text-emerald-900">Secure</h3>
                </div>
                <p className="text-sm text-emerald-800 leading-relaxed">
                  All balance information is encrypted and protected. Only you can access your account data.
                </p>
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  )
}
