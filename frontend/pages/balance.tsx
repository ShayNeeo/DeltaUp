import React, { useState, useEffect } from 'react'
import { useRouter } from 'next/router'
import axios from 'axios'

export default function Balance() {
  const router = useRouter()
  const [balance, setBalance] = useState<any>(null)
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

  return (
    <div className="min-h-screen bg-gradient-to-br from-primary to-secondary">
      <nav className="bg-white shadow-lg">
        <div className="max-w-7xl mx-auto px-4 py-4">
          <button onClick={() => router.push('/')} className="text-primary font-bold">
            ← Back
          </button>
        </div>
      </nav>

      <div className="max-w-2xl mx-auto px-4 py-12">
        <div className="bg-white p-8 rounded-lg shadow-lg">
          <h1 className="text-3xl font-bold text-gray-800 mb-6">Account Balance</h1>

          {error && <div className="bg-red-100 border border-red-400 text-red-700 px-4 py-3 rounded mb-4">{error}</div>}

          {loading ? (
            <p className="text-gray-600">Loading...</p>
          ) : balance ? (
            <div className="space-y-4">
              <div className="bg-gradient-to-r from-primary to-secondary p-6 rounded text-white">
                <p className="text-lg opacity-90">Total Balance</p>
                <h2 className="text-4xl font-bold">${balance.balance?.toFixed(2)}</h2>
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div className="bg-blue-50 p-4 rounded">
                  <p className="text-gray-600">Account Number</p>
                  <p className="text-xl font-semibold text-gray-800">{balance.account_number}</p>
                </div>
                <div className="bg-green-50 p-4 rounded">
                  <p className="text-gray-600">Currency</p>
                  <p className="text-xl font-semibold text-gray-800">{balance.currency || 'USD'}</p>
                </div>
              </div>
            </div>
          ) : null}
        </div>
      </div>
    </div>
  )
}
