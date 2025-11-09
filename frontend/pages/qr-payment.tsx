import React, { useState } from 'react'
import { useRouter } from 'next/router'
import QRCode from 'qrcode.react'
import axios from 'axios'

interface QRData {
  account?: string
  amount: number
  timestamp: string
}

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
    setError('')
    try {
      const user = JSON.parse(localStorage.getItem('user') || '{}')
      
      const qrData: QRData = {
        account: user.account_number,
        amount: parseFloat(amount),
        timestamp: new Date().toISOString(),
      }
      
      setQrValue(JSON.stringify(qrData))
      setSuccess('QR code generated successfully! 🎉')
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
      await axios.post(`${process.env.NEXT_PUBLIC_API_URL}/api/qr-payment`, { qr_data: qrValue }, {
        headers: { Authorization: `Bearer ${token}` }
      })

      setSuccess('QR payment processed successfully! 🎉')
      setQrValue('')
      setTimeout(() => router.push('/'), 2000)
    } catch (err: any) {
      setError(err.response?.data?.message || 'QR payment failed')
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="space-y-8">
      <div className="flex justify-between items-start">
        <div>
          <h1 className="text-3xl font-bold text-slate-800">QR Payment</h1>
          <p className="text-slate-600 mt-2">Generate and scan QR codes for instant payments</p>
        </div>
        <button
          onClick={() => router.push('/')}
          className="text-slate-500 hover:text-slate-700 text-2xl"
        >
          ← Back
        </button>
      </div>

      {/* Mode Selector */}
      <div className="bg-white border border-slate-200 rounded-xl p-2 flex gap-2 inline-flex">
        <button
          onClick={() => {
            setMode('generate')
            setQrValue('')
            setError('')
            setSuccess('')
          }}
          className={`px-6 py-2 rounded-lg font-semibold transition-all ${
            mode === 'generate'
              ? 'bg-blue-600 text-white'
              : 'bg-slate-100 text-slate-700 hover:bg-slate-200'
          }`}
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
          className={`px-6 py-2 rounded-lg font-semibold transition-all ${
            mode === 'scan'
              ? 'bg-blue-600 text-white'
              : 'bg-slate-100 text-slate-700 hover:bg-slate-200'
          }`}
        >
          Scan QR
        </button>
      </div>

      {error && (
        <div className="bg-red-50 border border-red-200 text-red-700 px-4 py-3 rounded-lg">
          ❌ {error}
        </div>
      )}
      {success && (
        <div className="bg-green-50 border border-green-200 text-green-700 px-4 py-3 rounded-lg">
          ✓ {success}
        </div>
      )}

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
        {/* Main Content */}
        <div className="lg:col-span-2">
          {mode === 'generate' ? (
            <div className="bg-white border border-slate-200 rounded-xl p-8 shadow-sm space-y-6">
              <h2 className="text-2xl font-bold text-slate-800">Generate Payment QR</h2>
              
              <div>
                <label className="block text-sm font-semibold text-slate-700 mb-2">
                  Amount (USD)
                </label>
                <div className="relative">
                  <span className="absolute left-4 top-3 text-slate-600 font-semibold">$</span>
                  <input
                    type="number"
                    value={amount}
                    onChange={(e) => setAmount(e.target.value)}
                    placeholder="0.00"
                    step="0.01"
                    min="0"
                    className="w-full pl-8 pr-4 py-3 border border-slate-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                  />
                </div>
              </div>

              <button
                onClick={handleGenerateQR}
                disabled={loading}
                className="w-full bg-gradient-to-r from-blue-600 to-cyan-600 text-white py-3 rounded-lg font-bold hover:from-blue-700 hover:to-cyan-700 disabled:opacity-50 disabled:cursor-not-allowed transition-all"
              >
                {loading ? '⏳ Generating...' : '📱 Generate QR Code'}
              </button>

              {qrValue && (
                <div className="mt-8 flex flex-col items-center p-6 bg-slate-50 rounded-lg border-2 border-dashed border-slate-300">
                  <p className="text-slate-600 mb-6 font-semibold">Scan this QR code to pay:</p>
                  <div className="bg-white p-4 rounded-lg border border-slate-200">
                    <QRCode value={qrValue} size={256} level="H" includeMargin={true} />
                  </div>
                  <p className="text-sm text-slate-500 mt-4">Amount: ${amount} USD</p>
                </div>
              )}
            </div>
          ) : (
            <form onSubmit={handleScanSubmit} className="bg-white border border-slate-200 rounded-xl p-8 shadow-sm space-y-6">
              <h2 className="text-2xl font-bold text-slate-800">Process QR Payment</h2>

              <div>
                <label className="block text-sm font-semibold text-slate-700 mb-2">
                  QR Data / Scan Result
                </label>
                <textarea
                  value={qrValue}
                  onChange={(e) => setQrValue(e.target.value)}
                  placeholder="Paste QR data or scan result here"
                  rows={4}
                  className="w-full px-4 py-3 border border-slate-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent resize-none"
                />
              </div>

              <button
                type="submit"
                disabled={loading}
                className="w-full bg-gradient-to-r from-blue-600 to-cyan-600 text-white py-3 rounded-lg font-bold hover:from-blue-700 hover:to-cyan-700 disabled:opacity-50 disabled:cursor-not-allowed transition-all"
              >
                {loading ? '⏳ Processing...' : '💳 Pay via QR'}
              </button>
            </form>
          )}
        </div>

        {/* Info Sidebar */}
        <div className="space-y-6">
          <div className="bg-blue-50 border border-blue-200 rounded-xl p-6">
            <h3 className="font-bold text-blue-900 mb-3">📱 How It Works</h3>
            <p className="text-sm text-blue-800 leading-relaxed">
              Generate a unique QR code with your payment amount, then share it. Others can scan and process the payment instantly.
            </p>
          </div>

          <div className="bg-green-50 border border-green-200 rounded-xl p-6">
            <h3 className="font-bold text-green-900 mb-3">⚡ Instant</h3>
            <p className="text-sm text-green-800 leading-relaxed">
              QR payments are processed instantly in our sandbox environment.
            </p>
          </div>

          <div className="bg-purple-50 border border-purple-200 rounded-xl p-6">
            <h3 className="font-bold text-purple-900 mb-3">🔒 Secure</h3>
            <p className="text-sm text-purple-800 leading-relaxed">
              All QR data is encrypted and verified before processing.
            </p>
          </div>

          <div className="bg-amber-50 border border-amber-200 rounded-xl p-6">
            <h3 className="font-bold text-amber-900 mb-3">💡 Tips</h3>
            <ul className="text-sm text-amber-800 space-y-2">
              <li>• Keep QR codes private</li>
              <li>• Verify amounts carefully</li>
              <li>• Use for testing only</li>
            </ul>
          </div>
        </div>
      </div>
    </div>
  )
}
