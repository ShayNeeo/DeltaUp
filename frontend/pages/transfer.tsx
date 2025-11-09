import React, { useState } from 'react'
import { useRouter } from 'next/router'
import axios from 'axios'

interface FormData {
  recipient_account: string
  amount: string
  description: string
}

export default function Transfer() {
  const router = useRouter()
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')
  const [success, setSuccess] = useState('')
  const [formData, setFormData] = useState<FormData>({
    recipient_account: '',
    amount: '',
    description: '',
  })

  const handleChange = (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) => {
    const { name, value } = e.target
    setFormData(prev => ({ ...prev, [name]: value }))
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setLoading(true)
    setError('')
    setSuccess('')

    try {
      const token = localStorage.getItem('token')
      await axios.post(`${process.env.NEXT_PUBLIC_API_URL}/api/transfer`, formData, {
        headers: { Authorization: `Bearer ${token}` }
      })

      setSuccess('Transfer successful! 🎉')
      setFormData({ recipient_account: '', amount: '', description: '' })
      setTimeout(() => router.push('/'), 2000)
    } catch (err: any) {
      setError(err.response?.data?.message || 'Transfer failed')
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="space-y-8">
      <div className="flex justify-between items-start">
        <div>
          <h1 className="text-3xl font-bold text-slate-800">Bank Transfer</h1>
          <p className="text-slate-600 mt-2">Send money to another account securely</p>
        </div>
        <button
          onClick={() => router.push('/')}
          className="text-slate-500 hover:text-slate-700 text-2xl"
        >
          ← Back
        </button>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
        {/* Form */}
        <div className="lg:col-span-2">
          <div className="bg-white rounded-xl shadow-md p-8 border border-slate-200">
            {error && (
              <div className="mb-6 bg-red-50 border border-red-200 text-red-700 px-4 py-3 rounded-lg">
                ❌ {error}
              </div>
            )}
            {success && (
              <div className="mb-6 bg-green-50 border border-green-200 text-green-700 px-4 py-3 rounded-lg">
                ✓ {success}
              </div>
            )}

            <form onSubmit={handleSubmit} className="space-y-6">
              <div>
                <label className="block text-sm font-semibold text-slate-700 mb-2">
                  Recipient Account Number
                </label>
                <input
                  type="text"
                  name="recipient_account"
                  value={formData.recipient_account}
                  onChange={handleChange}
                  placeholder="Enter account number (e.g., 1234567890)"
                  required
                  className="w-full px-4 py-3 border border-slate-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                />
              </div>

              <div>
                <label className="block text-sm font-semibold text-slate-700 mb-2">
                  Amount (USD)
                </label>
                <div className="relative">
                  <span className="absolute left-4 top-3 text-slate-600 font-semibold">$</span>
                  <input
                    type="number"
                    name="amount"
                    value={formData.amount}
                    onChange={handleChange}
                    placeholder="0.00"
                    step="0.01"
                    min="0"
                    required
                    className="w-full pl-8 pr-4 py-3 border border-slate-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                  />
                </div>
              </div>

              <div>
                <label className="block text-sm font-semibold text-slate-700 mb-2">
                  Description (Optional)
                </label>
                <textarea
                  name="description"
                  value={formData.description}
                  onChange={handleChange}
                  placeholder="What is this transfer for?"
                  rows={3}
                  className="w-full px-4 py-3 border border-slate-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent resize-none"
                />
              </div>

              <button
                type="submit"
                disabled={loading}
                className="w-full bg-gradient-to-r from-blue-600 to-cyan-600 text-white py-3 rounded-lg font-bold hover:from-blue-700 hover:to-cyan-700 disabled:opacity-50 disabled:cursor-not-allowed transition-all"
              >
                {loading ? '⏳ Processing...' : '💸 Send Transfer'}
              </button>
            </form>
          </div>
        </div>

        {/* Info Section */}
        <div className="space-y-6">
          <div className="bg-blue-50 border border-blue-200 rounded-xl p-6">
            <h3 className="text-lg font-bold text-blue-900 mb-3">🔒 Security</h3>
            <p className="text-sm text-blue-800">
              All transfers are encrypted and processed securely through our API sandbox.
            </p>
          </div>

          <div className="bg-green-50 border border-green-200 rounded-xl p-6">
            <h3 className="text-lg font-bold text-green-900 mb-3">⚡ Fast</h3>
            <p className="text-sm text-green-800">
              Transfers are processed instantly in our sandbox environment.
            </p>
          </div>

          <div className="bg-purple-50 border border-purple-200 rounded-xl p-6">
            <h3 className="text-lg font-bold text-purple-900 mb-3">🧪 Sandbox</h3>
            <p className="text-sm text-purple-800">
              This is a test environment. No real money is transferred.
            </p>
          </div>

          <div className="bg-amber-50 border border-amber-200 rounded-xl p-6">
            <h3 className="text-lg font-bold text-amber-900 mb-3">💡 Tips</h3>
            <ul className="text-sm text-amber-800 space-y-2">
              <li>• Double-check recipient account</li>
              <li>• Add a description for reference</li>
              <li>• Transfers are instant</li>
            </ul>
          </div>
        </div>
      </div>
    </div>
  )
}
