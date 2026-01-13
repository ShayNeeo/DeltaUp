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
  const [facingMode, setFacingMode] = useState<'user' | 'environment'>('environment')

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
        video: { facingMode: facingMode }
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

  // Toggle camera between front and rear
  const toggleCamera = async () => {
    stopScanning()
    setFacingMode(prev => prev === 'environment' ? 'user' : 'environment')
    // Restart scanning with new camera after a brief delay
    setTimeout(() => {
      startScanning()
    }, 100)
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
                <div className="relative bg-black rounded-3xl overflow-hidden shadow-2xl group border-4 border-purple-500/30">
                  <video
                    ref={videoRef}
                    className="w-full h-[400px] object-cover"
                    playsInline
                  />
                  <canvas ref={canvasRef} className="hidden" />

                  {/* Viewfinder Overlay */}
                  <div className="absolute inset-0 flex items-center justify-center p-8 pointer-events-none">
                    <div className="relative w-full aspect-square max-w-[280px]">
                      {/* Corners */}
                      <div className="absolute top-0 left-0 w-8 h-8 border-l-4 border-t-4 border-purple-500 rounded-tl-lg"></div>
                      <div className="absolute top-0 right-0 w-8 h-8 border-r-4 border-t-4 border-purple-500 rounded-tr-lg"></div>
                      <div className="absolute bottom-0 left-0 w-8 h-8 border-l-4 border-b-4 border-purple-500 rounded-bl-lg"></div>
                      <div className="absolute bottom-0 right-0 w-8 h-8 border-r-4 border-b-4 border-purple-500 rounded-br-lg"></div>

                      {/* Animated Scanning Line */}
                      <div className="absolute left-0 right-0 h-1 bg-gradient-to-r from-transparent via-purple-400 to-transparent shadow-[0_0_15px_rgba(168,85,247,0.8)] animate-scanner"></div>
                    </div>
                  </div>

                  {/* Shading Layer */}
                  <div className="absolute inset-0 bg-black/20 pointer-events-none"></div>

                  {/* Camera Toggle Button Overlay */}
                  <button
                    onClick={toggleCamera}
                    className="absolute top-6 right-6 p-4 bg-white/10 hover:bg-white/20 text-white rounded-full shadow-lg transition-all backdrop-blur-md border border-white/20 group-hover:scale-110 active:scale-95"
                    title={`Switch to ${facingMode === 'environment' ? 'front' : 'rear'} camera`}
                  >
                    <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" />
                    </svg>
                  </button>

                  <div className="absolute bottom-6 left-1/2 -translate-x-1/2 bg-black/40 backdrop-blur-md px-4 py-1.5 rounded-full border border-white/10">
                    <p className="text-white text-xs font-medium tracking-wider uppercase">
                      Scanning for QR code...
                    </p>
                  </div>
                </div>

                <style jsx>{`
                  @keyframes scanner {
                    0% { top: 0%; opacity: 0; }
                    10% { opacity: 1; }
                    90% { opacity: 1; }
                    100% { top: 100%; opacity: 0; }
                  }
                  .animate-scanner {
                    position: absolute;
                    animation: scanner 2s linear infinite;
                  }
                `}</style>

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
