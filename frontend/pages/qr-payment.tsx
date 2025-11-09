import React, { useState } from 'react'
import { useRouter } from 'next/router'
import QRCode from 'qrcode.react'
import axios from 'axios'

export default function QRPayment() {
  const router = useRouter()
  const [mode, setMode] = useState<'generate' | 'scan'>('generate')
  const [qrValue, setQrValue] = useState('')
  const [amount, setAmount] = useState('')
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')
  const [success, setSuccess] = useState('')

  const handleGenerateQR = async () => {
    if (!amount) {
      setError('Please enter an amount')
      return
    }

    setLoading(true)
    try {
      const token = localStorage.getItem('token')
      const user = JSON.parse(localStorage.getItem('user') || '{}')
      
      const qrData = {
        account: user.account_number,
        amount: parseFloat(amount),
        timestamp: new Date().toISOString(),
      }
      
      setQrValue(JSON.stringify(qrData))
      setSuccess('QR code generated successfully!')
    } catch (err) {
      setError('Failed to generate QR code')
    } finally {
      setLoading(false)
    }
  }

  const handleScanSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setLoading(true)
    setError('')
    setSuccess('')

    try {
      const token = localStorage.getItem('token')
      const response = await axios.post(`${process.env.NEXT_PUBLIC_API_URL}/api/qr-payment`, { qr_data: qrValue }, {
        headers: { Authorization: `Bearer ${token}` }
      })

      setSuccess('QR payment processed successfully!')
      setQrValue('')
      setTimeout(() => router.push('/'), 2000)
    } catch (err: any) {
      setError(err.response?.data?.message || 'QR payment failed')
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
          <h1 className="text-3xl font-bold text-gray-800 mb-6">QR Payment</h1>

          <div className="flex gap-4 mb-6">
            <button
              onClick={() => {
                setMode('generate')
                setQrValue('')
                setError('')
                setSuccess('')
              }}
              className={`px-4 py-2 rounded font-semibold ${mode === 'generate' ? 'bg-primary text-white' : 'bg-gray-200 text-gray-800'}`}
            >
              Generate QR
            </button>
            <button
              onClick={() => {
                setMode('scan')
                setQrValue('')
                setError('')
                setSuccess('')
              }}
              className={`px-4 py-2 rounded font-semibold ${mode === 'scan' ? 'bg-primary text-white' : 'bg-gray-200 text-gray-800'}`}
            >
              Scan QR
            </button>
          </div>

          {error && <div className="bg-red-100 border border-red-400 text-red-700 px-4 py-3 rounded mb-4">{error}</div>}
          {success && <div className="bg-green-100 border border-green-400 text-green-700 px-4 py-3 rounded mb-4">{success}</div>}

          {mode === 'generate' ? (
            <div className="space-y-4">
              <div>
                <label className="block text-gray-700 font-semibold mb-2">Amount</label>
                <input
                  type="number"
                  value={amount}
                  onChange={(e) => setAmount(e.target.value)}
                  placeholder="0.00"
                  step="0.01"
                  className="w-full px-4 py-2 border border-gray-300 rounded focus:outline-none focus:border-primary"
                />
              </div>

              <button
                onClick={handleGenerateQR}
                disabled={loading}
                className="w-full bg-primary text-white py-3 rounded font-semibold hover:bg-blue-700 disabled:opacity-50"
              >
                {loading ? 'Generating...' : 'Generate QR Code'}
              </button>

              {qrValue && (
                <div className="mt-6 flex flex-col items-center">
                  <p className="text-gray-600 mb-4">Scan this QR code to pay:</p>
                  <QRCode value={qrValue} size={256} level="H" includeMargin={true} />
                </div>
              )}
            </div>
          ) : (
            <form onSubmit={handleScanSubmit} className="space-y-4">
              <div>
                <label className="block text-gray-700 font-semibold mb-2">QR Data</label>
                <textarea
                  value={qrValue}
                  onChange={(e) => setQrValue(e.target.value)}
                  placeholder="Paste QR data or scan result"
                  className="w-full px-4 py-2 border border-gray-300 rounded focus:outline-none focus:border-primary"
                  rows={4}
                />
              </div>

              <button
                type="submit"
                disabled={loading}
                className="w-full bg-primary text-white py-3 rounded font-semibold hover:bg-blue-700 disabled:opacity-50"
              >
                {loading ? 'Processing...' : 'Pay via QR'}
              </button>
            </form>
          )}
        </div>
      </div>
    </div>
  )
}
