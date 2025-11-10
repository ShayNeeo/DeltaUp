import React, { useState } from 'react'
import { useRouter } from 'next/router'
import Image from 'next/image'
import axios from 'axios'
import QRCode from 'qrcode'

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
  const [qrDataUrl, setQrDataUrl] = useState('')

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
      
      const qrString = JSON.stringify(qrData)
      setQrValue(qrString)
      
      // Generate QR code as data URL
      const dataUrl = await QRCode.toDataURL(qrString)
      setQrDataUrl(dataUrl)
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
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8 sm:py-12">
      <div className="space-y-10">
        <div className="flex justify-between items-start">
          <div>
            <h1 className="text-4xl sm:text-5xl font-light text-slate-900 mb-2 tracking-tight">QR Payment</h1>
            <p className="text-base text-slate-600">Generate and scan QR codes for instant payments</p>
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

        {/* Mode Selector */}
        <div className="bg-white border border-slate-200/80 rounded-2xl p-2 inline-flex gap-2 shadow-sm">
          <button
            onClick={() => {
              setMode('generate')
              setQrValue('')
              setError('')
              setSuccess('')
              setQrDataUrl('')
              setAmount('')
            }}
            className={`px-6 py-2.5 rounded-xl font-semibold text-sm transition-all duration-200 ${
              mode === 'generate'
                ? 'bg-gradient-to-r from-blue-600 to-blue-700 text-white shadow-md'
                : 'bg-transparent text-slate-600 hover:text-slate-900 hover:bg-slate-50'
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
              setQrDataUrl('')
              setAmount('')
            }}
            className={`px-6 py-2.5 rounded-xl font-semibold text-sm transition-all duration-200 ${
              mode === 'scan'
                ? 'bg-gradient-to-r from-blue-600 to-blue-700 text-white shadow-md'
                : 'bg-transparent text-slate-600 hover:text-slate-900 hover:bg-slate-50'
            }`}
          >
            Scan QR
          </button>
        </div>

        {error && (
          <div className="bg-red-50 border border-red-200/80 text-red-700 px-5 py-4 rounded-xl flex items-center gap-2">
            <svg className="w-5 h-5 flex-shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
            </svg>
            <span>{error}</span>
          </div>
        )}
        {success && (
          <div className="bg-emerald-50 border border-emerald-200/80 text-emerald-700 px-5 py-4 rounded-xl flex items-center gap-2">
            <svg className="w-5 h-5 flex-shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
            </svg>
            <span>{success}</span>
          </div>
        )}

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
          {/* Main Content */}
          <div className="lg:col-span-2">
            {mode === 'generate' ? (
              <div className="bg-white border border-slate-200/80 rounded-2xl p-8 sm:p-10 shadow-sm space-y-8">
                <div>
                  <h2 className="text-2xl font-semibold text-slate-900 mb-1">Generate Payment QR</h2>
                  <p className="text-sm text-slate-500">Create a QR code for others to scan and pay</p>
                </div>
                
                <div>
                  <label className="block text-sm font-semibold text-slate-700 mb-2.5">
                    Amount (USD)
                  </label>
                  <div className="relative">
                    <span className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-600 font-semibold text-lg">$</span>
                    <input
                      type="number"
                      value={amount}
                      onChange={(e) => setAmount(e.target.value)}
                      placeholder="0.00"
                      step="0.01"
                      min="0"
                      className="w-full pl-9 pr-4 py-3.5 border border-slate-300 rounded-xl focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent transition-all bg-white text-lg"
                    />
                  </div>
                </div>

                <button
                  onClick={handleGenerateQR}
                  disabled={loading || !amount}
                  className="w-full bg-gradient-to-r from-blue-600 to-blue-700 hover:from-blue-700 hover:to-blue-800 text-white py-4 rounded-xl font-semibold disabled:opacity-50 disabled:cursor-not-allowed transition-all duration-200 shadow-md hover:shadow-lg transform hover:-translate-y-0.5 text-base"
                >
                  {loading ? (
                    <span className="flex items-center justify-center gap-2">
                      <svg className="animate-spin h-5 w-5" fill="none" viewBox="0 0 24 24">
                        <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                        <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                      </svg>
                      Generating...
                    </span>
                  ) : (
                    <span className="flex items-center justify-center gap-2">
                      <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v1m6 11h2m-6 0h-2v4m0-11v3m0 0h.01M12 12h4.01M16 20h4M4 12h4m12 0h.01M5 8h2a1 1 0 001-1V5a1 1 0 00-1-1H5a1 1 0 00-1 1v2a1 1 0 001 1zm12 0h2a1 1 0 001-1V5a1 1 0 00-1-1h-2a1 1 0 00-1 1v2a1 1 0 001 1zM5 20h2a1 1 0 001-1v-2a1 1 0 00-1-1H5a1 1 0 00-1 1v2a1 1 0 001 1z" />
                      </svg>
                      Generate QR Code
                    </span>
                  )}
                </button>

                {qrDataUrl && (
                  <div className="mt-8 flex flex-col items-center p-8 bg-gradient-to-br from-slate-50 to-slate-100/50 rounded-2xl border-2 border-dashed border-slate-300">
                    <p className="text-slate-700 mb-6 font-semibold text-base">Scan this QR code to pay:</p>
                    <div className="bg-white p-6 rounded-2xl border border-slate-200 shadow-lg">
                      <Image 
                        src={qrDataUrl} 
                        alt="QR Code" 
                        width={288} 
                        height={288}
                        className="w-72 h-72"
                        unoptimized
                      />
                    </div>
                    <div className="mt-6 px-5 py-2.5 bg-white rounded-xl border border-slate-200">
                      <p className="text-sm font-medium text-slate-600">Amount</p>
                      <p className="text-xl font-semibold text-slate-900">${parseFloat(amount).toFixed(2)} USD</p>
                    </div>
                  </div>
                )}
              </div>
            ) : (
              <form onSubmit={handleScanSubmit} className="bg-white border border-slate-200/80 rounded-2xl p-8 sm:p-10 shadow-sm space-y-8">
                <div>
                  <h2 className="text-2xl font-semibold text-slate-900 mb-1">Process QR Payment</h2>
                  <p className="text-sm text-slate-500">Paste QR data or scan result to process payment</p>
                </div>

                <div>
                  <label className="block text-sm font-semibold text-slate-700 mb-2.5">
                    QR Data / Scan Result
                  </label>
                  <textarea
                    value={qrValue}
                    onChange={(e) => setQrValue(e.target.value)}
                    placeholder="Paste QR data or scan result here..."
                    rows={6}
                    className="w-full px-4 py-3.5 border border-slate-300 rounded-xl focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent resize-none transition-all bg-white font-mono text-sm"
                  />
                </div>

                <button
                  type="submit"
                  disabled={loading || !qrValue}
                  className="w-full bg-gradient-to-r from-blue-600 to-blue-700 hover:from-blue-700 hover:to-blue-800 text-white py-4 rounded-xl font-semibold disabled:opacity-50 disabled:cursor-not-allowed transition-all duration-200 shadow-md hover:shadow-lg transform hover:-translate-y-0.5 text-base"
                >
                  {loading ? (
                    <span className="flex items-center justify-center gap-2">
                      <svg className="animate-spin h-5 w-5" fill="none" viewBox="0 0 24 24">
                        <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                        <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                      </svg>
                      Processing...
                    </span>
                  ) : (
                    <span className="flex items-center justify-center gap-2">
                      <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 10h18M7 15h1m4 0h1m-7 4h12a3 3 0 003-3V8a3 3 0 00-3-3H6a3 3 0 00-3 3v8a3 3 0 003 3z" />
                      </svg>
                      Pay via QR
                    </span>
                  )}
                </button>
              </form>
            )}
          </div>

          {/* Info Sidebar */}
          <div className="space-y-5">
            <div className="bg-gradient-to-br from-blue-50 to-blue-100/50 border border-blue-200/80 rounded-xl p-6 hover:shadow-md transition-shadow">
              <div className="flex items-center gap-3 mb-3">
                <div className="w-10 h-10 bg-blue-600 rounded-lg flex items-center justify-center">
                  <svg className="w-5 h-5 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9.663 17h4.673M12 3v1m6.364 1.636l-.707.707M21 12h-1M4 12H3m3.343-5.657l-.707-.707m2.828 9.9a5 5 0 117.072 0l-.548.547A3.374 3.374 0 0014 18.469V19a2 2 0 11-4 0v-.531c0-.895-.356-1.754-.988-2.386l-.548-.547z" />
                  </svg>
                </div>
                <h3 className="font-semibold text-blue-900">How It Works</h3>
              </div>
              <p className="text-sm text-blue-800 leading-relaxed">
                Generate a unique QR code with your payment amount, then share it. Others can scan and process the payment instantly.
              </p>
            </div>

            <div className="bg-gradient-to-br from-emerald-50 to-emerald-100/50 border border-emerald-200/80 rounded-xl p-6 hover:shadow-md transition-shadow">
              <div className="flex items-center gap-3 mb-3">
                <div className="w-10 h-10 bg-emerald-600 rounded-lg flex items-center justify-center">
                  <svg className="w-5 h-5 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 10V3L4 14h7v7l9-11h-7z" />
                  </svg>
                </div>
                <h3 className="font-semibold text-emerald-900">Instant</h3>
              </div>
              <p className="text-sm text-emerald-800 leading-relaxed">
                QR payments are processed instantly in our sandbox environment.
              </p>
            </div>

            <div className="bg-gradient-to-br from-violet-50 to-violet-100/50 border border-violet-200/80 rounded-xl p-6 hover:shadow-md transition-shadow">
              <div className="flex items-center gap-3 mb-3">
                <div className="w-10 h-10 bg-violet-600 rounded-lg flex items-center justify-center">
                  <svg className="w-5 h-5 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 15v2m-6 4h12a2 2 0 002-2v-6a2 2 0 00-2-2H6a2 2 0 00-2 2v6a2 2 0 002 2zm10-10V7a4 4 0 00-8 0v4h8z" />
                  </svg>
                </div>
                <h3 className="font-semibold text-violet-900">Secure</h3>
              </div>
              <p className="text-sm text-violet-800 leading-relaxed">
                All QR data is encrypted and verified before processing.
              </p>
            </div>

            <div className="bg-gradient-to-br from-amber-50 to-amber-100/50 border border-amber-200/80 rounded-xl p-6 hover:shadow-md transition-shadow">
              <div className="flex items-center gap-3 mb-3">
                <div className="w-10 h-10 bg-amber-600 rounded-lg flex items-center justify-center">
                  <svg className="w-5 h-5 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9.663 17h4.673M12 3v1m6.364 1.636l-.707.707M21 12h-1M4 12H3m3.343-5.657l-.707-.707m2.828 9.9a5 5 0 117.072 0l-.548.547A3.374 3.374 0 0014 18.469V19a2 2 0 11-4 0v-.531c0-.895-.356-1.754-.988-2.386l-.548-.547z" />
                  </svg>
                </div>
                <h3 className="font-semibold text-amber-900">Tips</h3>
              </div>
              <ul className="text-sm text-amber-800 space-y-2 leading-relaxed">
                <li className="flex items-start gap-2">
                  <span className="text-amber-600 mt-0.5">•</span>
                  <span>Keep QR codes private</span>
                </li>
                <li className="flex items-start gap-2">
                  <span className="text-amber-600 mt-0.5">•</span>
                  <span>Verify amounts carefully</span>
                </li>
                <li className="flex items-start gap-2">
                  <span className="text-amber-600 mt-0.5">•</span>
                  <span>Use for testing only</span>
                </li>
              </ul>
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}
