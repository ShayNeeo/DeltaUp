import React, { useState } from 'react'
import { useRouter } from 'next/router'
import axios from 'axios'

export default function Transfer() {
  const router = useRouter()
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')
  const [success, setSuccess] = useState('')
  const [formData, setFormData] = useState({
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

      setSuccess('Transfer successful!')
      setFormData({ recipient_account: '', amount: '', description: '' })
      setTimeout(() => router.push('/'), 2000)
    } catch (err: any) {
      setError(err.response?.data?.message || 'Transfer failed')
    } finally {
      setLoading(false)
    }
  }

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
          <h1 className="text-3xl font-bold text-gray-800 mb-6">Bank Transfer</h1>

          {error && <div className="bg-red-100 border border-red-400 text-red-700 px-4 py-3 rounded mb-4">{error}</div>}
          {success && <div className="bg-green-100 border border-green-400 text-green-700 px-4 py-3 rounded mb-4">{success}</div>}

          <form onSubmit={handleSubmit} className="space-y-4">
            <div>
              <label className="block text-gray-700 font-semibold mb-2">Recipient Account</label>
              <input
                type="text"
                name="recipient_account"
                value={formData.recipient_account}
                onChange={handleChange}
                placeholder="Enter recipient account number"
                required
                className="w-full px-4 py-2 border border-gray-300 rounded focus:outline-none focus:border-primary"
              />
            </div>

            <div>
              <label className="block text-gray-700 font-semibold mb-2">Amount</label>
              <input
                type="number"
                name="amount"
                value={formData.amount}
                onChange={handleChange}
                placeholder="0.00"
                step="0.01"
                required
                className="w-full px-4 py-2 border border-gray-300 rounded focus:outline-none focus:border-primary"
              />
            </div>

            <div>
              <label className="block text-gray-700 font-semibold mb-2">Description</label>
              <textarea
                name="description"
                value={formData.description}
                onChange={handleChange}
                placeholder="Optional description"
                className="w-full px-4 py-2 border border-gray-300 rounded focus:outline-none focus:border-primary"
              />
            </div>

            <button
              type="submit"
              disabled={loading}
              className="w-full bg-primary text-white py-3 rounded font-semibold hover:bg-blue-700 disabled:opacity-50"
            >
              {loading ? 'Processing...' : 'Send Transfer'}
            </button>
          </form>
        </div>
      </div>
    </div>
  )
}
