import React, { useState, useEffect } from 'react'
import { useRouter } from 'next/router'
import axios from 'axios'

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

  useEffect(() => {
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
        setLoading(false)
      }
    }

    fetchBalance()
  }, [])

  if (loading) {
    return (
      <div className="flex justify-center items-center min-h-screen">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600"></div>
      </div>
    )
  }

  return (
    <div className="space-y-8">
      <div className="flex justify-between items-start">
        <div>
          <h1 className="text-3xl font-bold text-slate-800">Account Balance</h1>
          <p className="text-slate-600 mt-2">View your account details and balance</p>
        </div>
        <button
          onClick={() => router.push('/')}
          className="text-slate-500 hover:text-slate-700 text-2xl"
        >
          ← Back
        </button>
      </div>

      {error && (
        <div className="bg-red-50 border border-red-200 text-red-700 px-6 py-4 rounded-xl">
          ❌ {error}
        </div>
      )}

      {balance && (
        <div className="space-y-6">
          {/* Main Balance Card */}
          <div className="bg-gradient-to-br from-blue-600 via-blue-500 to-cyan-500 rounded-2xl p-8 text-white shadow-lg">
            <p className="text-blue-100 text-sm font-semibold mb-2">Total Balance</p>
            <h2 className="text-5xl font-bold mb-2">
              ${(balance.balance ?? 0).toFixed(2)}
            </h2>
            <p className="text-blue-100 text-sm">
              Currency: {balance.currency || 'USD'}
            </p>
          </div>

          {/* Account Details Grid */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <div className="bg-white border border-slate-200 rounded-xl p-6 shadow-sm">
              <div className="flex items-center gap-4">
                <div className="w-12 h-12 bg-blue-100 rounded-lg flex items-center justify-center text-xl">
                  🏦
                </div>
                <div>
                  <p className="text-sm text-slate-600 font-medium">Account Number</p>
                  <p className="text-lg font-bold text-slate-800 font-mono">
                    {balance.account_number || '****'}
                  </p>
                </div>
              </div>
            </div>

            <div className="bg-white border border-slate-200 rounded-xl p-6 shadow-sm">
              <div className="flex items-center gap-4">
                <div className="w-12 h-12 bg-green-100 rounded-lg flex items-center justify-center text-xl">
                  💱
                </div>
                <div>
                  <p className="text-sm text-slate-600 font-medium">Currency</p>
                  <p className="text-lg font-bold text-slate-800">
                    {balance.currency || 'USD'}
                  </p>
                </div>
              </div>
            </div>
          </div>

          {/* Quick Actions */}
          <div className="bg-gradient-to-r from-slate-50 to-slate-100 border border-slate-200 rounded-xl p-8">
            <h3 className="text-xl font-bold text-slate-800 mb-6">Quick Actions</h3>
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              <button
                onClick={() => router.push('/transfer')}
                className="bg-white border border-slate-300 rounded-lg p-4 hover:border-blue-500 hover:shadow-md transition-all text-center"
              >
                <div className="text-3xl mb-2">💸</div>
                <span className="font-semibold text-slate-800">Send Transfer</span>
              </button>
              <button
                onClick={() => router.push('/qr-payment')}
                className="bg-white border border-slate-300 rounded-lg p-4 hover:border-blue-500 hover:shadow-md transition-all text-center"
              >
                <div className="text-3xl mb-2">📱</div>
                <span className="font-semibold text-slate-800">QR Payment</span>
              </button>
              <button
                onClick={() => window.location.reload()}
                className="bg-white border border-slate-300 rounded-lg p-4 hover:border-blue-500 hover:shadow-md transition-all text-center"
              >
                <div className="text-3xl mb-2">🔄</div>
                <span className="font-semibold text-slate-800">Refresh</span>
              </button>
            </div>
          </div>

          {/* Info Boxes */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <div className="bg-blue-50 border border-blue-200 rounded-xl p-6">
              <h3 className="font-bold text-blue-900 mb-2">📊 Real-time Updates</h3>
              <p className="text-sm text-blue-800">
                Your balance updates instantly when transfers are completed. This is a sandbox environment for testing.
              </p>
            </div>

            <div className="bg-green-50 border border-green-200 rounded-xl p-6">
              <h3 className="font-bold text-green-900 mb-2">🔒 Secure</h3>
              <p className="text-sm text-green-800">
                All balance information is encrypted and protected. Only you can access your account data.
              </p>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
