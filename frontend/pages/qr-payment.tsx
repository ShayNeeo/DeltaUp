import { useState, useEffect, useRef } from 'react'
import { useRouter } from 'next/router'
import QRCode from 'qrcode'
import Image from 'next/image'
import { transactionAPI, getUser } from '@/lib/api'

export default function QRPayment() {
  const router = useRouter()
  const [user, setUser] = useState<any>(null)
  const [mode, setMode] = useState<'scan' | 'generate'>('generate')
  const [amount, setAmount] = useState('')
  const [description, setDescription] = useState('')
  const [qrCodeUrl, setQrCodeUrl] = useState('')
  const [scanResult, setScanResult] = useState('')
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')
  const [success, setSuccess] = useState('')
  const videoRef = useRef<HTMLVideoElement>(null)
  const canvasRef = useRef<HTMLCanvasElement>(null)
  const [scanning, setScanning] = useState(false)

  useEffect(() => {
    const token = localStorage.getItem('token')
    if (!token) {
      router.push('/login')
      return
    }
    const userData = getUser()
    setUser(userData)
  }, [router])

  // Generate QR Code
  const handleGenerateQR = async () => {
    if (!amount || parseFloat(amount) <= 0) {
      setError('Please enter a valid amount')
      return
    }

    const qrData = JSON.stringify({
      account: user?.account_number,
      amount: parseFloat(amount),
      description: description || 'Payment',
      timestamp: new Date().toISOString()
    })

    try {
      const url = await QRCode.toDataURL(qrData, {
        width: 300,
        margin: 2,
        color: {
          dark: '#000000',
          light: '#FFFFFF'
        }
      })
      setQrCodeUrl(url)
      setError('')
    } catch (err) {
      setError('Failed to generate QR code')
    }
  }

  // Start camera for scanning
  const startScanning = async () => {
    try {
      const stream = await navigator.mediaDevices.getUserMedia({
        video: { facingMode: 'environment' }
      })

      if (videoRef.current) {
        videoRef.current.srcObject = stream
        videoRef.current.play()
        setScanning(true)
        scanQRCode()
      }
    } catch (err) {
      setError('Camera access denied. Please enable camera permissions.')
    }
  }

  // Stop camera
  const stopScanning = () => {
    if (videoRef.current?.srcObject) {
      const stream = videoRef.current.srcObject as MediaStream
      stream.getTracks().forEach(track => track.stop())
      videoRef.current.srcObject = null
    }
    setScanning(false)
  }

  // Scan QR code from video
  const scanQRCode = () => {
    const canvas = canvasRef.current
    const video = videoRef.current

    if (!canvas || !video || !scanning) return

    const context = canvas.getContext('2d')
    if (!context) return

    canvas.width = video.videoWidth
    canvas.height = video.videoHeight
    context.drawImage(video, 0, 0, canvas.width, canvas.height)

    // Note: In production, use a proper QR code scanner library like jsQR
    // This is a simplified version
    setTimeout(() => {
      if (scanning) {
        scanQRCode()
      }
    }, 100)
  }

  // Process scanned QR code
  const handleProcessPayment = async () => {
    if (!scanResult) {
      setError('No QR code scanned')
      return
    }

    setLoading(true)
    setError('')
    setSuccess('')

    try {
      await transactionAPI.qrPayment({ qr_data: scanResult })
      setSuccess('Payment processed successfully!')
      setScanResult('')
      stopScanning()
    } catch (err: any) {
      setError(err.response?.data?.message || 'Payment failed')
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    return () => {
      stopScanning()
    }
  }, [])

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-50 via-white to-slate-50 py-12 px-4">
      <div className="max-w-4xl mx-auto">
        <h1 className="text-4xl font-bold text-slate-900 mb-2">QR Payment</h1>
        <p className="text-slate-600 mb-8">Scan or generate QR codes for instant payments</p>

        {/* Mode Switcher */}
        <div className="flex gap-4 mb-8">
          <button
            onClick={() => {
              setMode('generate')
              stopScanning()
            }}
            className={`flex-1 py-3 px-6 rounded-xl font-semibold transition-all ${mode === 'generate'
              ? 'bg-gradient-to-r from-purple-600 to-pink-600 text-white shadow-lg'
              : 'bg-white text-slate-600 border border-slate-200 hover:border-slate-300'
              }`}
          >
            📱 Generate QR
          </button>
          <button
            onClick={() => setMode('scan')}
            className={`flex-1 py-3 px-6 rounded-xl font-semibold transition-all ${mode === 'scan'
              ? 'bg-gradient-to-r from-purple-600 to-pink-600 text-white shadow-lg'
              : 'bg-white text-slate-600 border border-slate-200 hover:border-slate-300'
              }`}
          >
            📷 Scan QR
          </button>
        </div>

        {/* Alerts */}
        {error && (
          <div className="mb-6 p-4 bg-red-50 border border-red-200 text-red-700 rounded-xl">
            {error}
          </div>
        )}
        {success && (
          <div className="mb-6 p-4 bg-green-50 border border-green-200 text-green-700 rounded-xl">
            {success}
          </div>
        )}

        {/* Generate QR Mode */}
        {mode === 'generate' && (
          <div className="bg-white rounded-2xl shadow-lg p-8 border border-slate-200">
            <h2 className="text-2xl font-semibold text-slate-900 mb-6">Generate Payment QR Code</h2>

            <div className="space-y-4 mb-6">
              <div>
                <label className="block text-sm font-medium text-slate-700 mb-2">
                  Amount (USD)
                </label>
                <input
                  type="number"
                  step="0.01"
                  value={amount}
                  onChange={(e) => setAmount(e.target.value)}
                  className="w-full px-4 py-3 border border-slate-300 rounded-xl focus:outline-none focus:ring-2 focus:ring-purple-500"
                  placeholder="0.00"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-slate-700 mb-2">
                  Description (Optional)
                </label>
                <input
                  type="text"
                  value={description}
                  onChange={(e) => setDescription(e.target.value)}
                  className="w-full px-4 py-3 border border-slate-300 rounded-xl focus:outline-none focus:ring-2 focus:ring-purple-500"
                  placeholder="Payment for..."
                />
              </div>

              <button
                onClick={handleGenerateQR}
                className="w-full py-3 px-6 bg-gradient-to-r from-purple-600 to-pink-600 hover:from-purple-700 hover:to-pink-700 text-white font-semibold rounded-xl shadow-lg transition-all"
              >
                Generate QR Code
              </button>
            </div>

            {qrCodeUrl && (
              <div className="text-center">
                <div className="inline-block p-6 bg-white rounded-2xl border-2 border-slate-200">
                  <Image src={qrCodeUrl} alt="Payment QR Code" width={256} height={256} unoptimized={true} />
                </div>
                <p className="mt-4 text-sm text-slate-600">
                  Show this QR code to receive ${parseFloat(amount).toFixed(2)}
                </p>
              </div>
            )}
          </div>
        )}

        {/* Scan QR Mode */}
        {mode === 'scan' && (
          <div className="bg-white rounded-2xl shadow-lg p-8 border border-slate-200">
            <h2 className="text-2xl font-semibold text-slate-900 mb-6">Scan QR Code to Pay</h2>

            {!scanning ? (
              <button
                onClick={startScanning}
                className="w-full py-4 px-6 bg-gradient-to-r from-purple-600 to-pink-600 hover:from-purple-700 hover:to-pink-700 text-white font-semibold rounded-xl shadow-lg transition-all text-lg"
              >
                📷 Start Camera
              </button>
            ) : (
              <div className="space-y-4">
                <div className="relative bg-black rounded-xl overflow-hidden">
                  <video
                    ref={videoRef}
                    className="w-full h-auto"
                    playsInline
                  />
                  <canvas ref={canvasRef} className="hidden" />
                  <div className="absolute inset-0 border-4 border-dashed border-purple-500 m-12 rounded-xl pointer-events-none"></div>
                </div>

                <div className="flex gap-4">
                  <button
                    onClick={stopScanning}
                    className="flex-1 py-3 px-6 bg-slate-600 hover:bg-slate-700 text-white font-semibold rounded-xl transition-all"
                  >
                    Stop Camera
                  </button>
                  <button
                    onClick={handleProcessPayment}
                    disabled={loading || !scanResult}
                    className="flex-1 py-3 px-6 bg-gradient-to-r from-purple-600 to-pink-600 hover:from-purple-700 hover:to-pink-700 text-white font-semibold rounded-xl transition-all disabled:opacity-50 disabled:cursor-not-allowed"
                  >
                    {loading ? 'Processing...' : 'Pay Now'}
                  </button>
                </div>

                <p className="text-sm text-slate-600 text-center">
                  Position the QR code within the frame to scan
                </p>
              </div>
            )}
          </div>
        )}

        {/* Account Info */}
        {user && (
          <div className="mt-8 bg-gradient-to-r from-purple-50 to-pink-50 rounded-xl p-6 border border-purple-200">
            <div className="flex justify-between items-center">
              <div>
                <p className="text-sm text-slate-600">Your Account</p>
                <p className="text-lg font-mono font-semibold text-slate-900">{user.account_number}</p>
              </div>
              <div className="text-right">
                <p className="text-sm text-slate-600">Balance</p>
                <p className="text-2xl font-bold text-purple-600">${user.balance?.toFixed(2)}</p>
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  )
}
