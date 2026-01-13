import { useState, useEffect, useRef } from 'react'
import { useRouter } from 'next/router'
import QRCode from 'qrcode'
import Image from 'next/image'
import jsqr from 'jsqr'
import { transactionAPI, getUser } from '@/lib/api'

interface ScannedPaymentData {
  account: string
  amount: number
  description: string
  timestamp: string
}

export default function QRPayment() {
  const router = useRouter()
  const [user, setUser] = useState<any>(null)
  const [mode, setMode] = useState<'scan' | 'generate'>('generate')
  const [amount, setAmount] = useState('')
  const [description, setDescription] = useState('')
  const [qrCodeUrl, setQrCodeUrl] = useState('')
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')
  const [success, setSuccess] = useState('')
  const videoRef = useRef<HTMLVideoElement>(null)
  const canvasRef = useRef<HTMLCanvasElement>(null)
  const [scanning, setScanning] = useState(false)
  const [facingMode, setFacingMode] = useState<'user' | 'environment'>('environment')
  const [scannedData, setScannedData] = useState<ScannedPaymentData | null>(null)
  const scanningRef = useRef(false)

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
    setScanning(true)
    scanningRef.current = true
    setError('')
    setSuccess('')
    setScannedData(null)
  }

  useEffect(() => {
    let stream: MediaStream | null = null

    const enableCamera = async () => {
      if (scanning && videoRef.current) {
        try {
          stream = await navigator.mediaDevices.getUserMedia({
            video: { facingMode: facingMode }
          })
          if (videoRef.current) {
            videoRef.current.srcObject = stream
            videoRef.current.play()
            scanQRCode()
          }
        } catch (err) {
          setError('Camera access denied. Please enable camera permissions.')
          setScanning(false)
          scanningRef.current = false
        }
      }
    }

    enableCamera()

    return () => {
      if (stream) {
        stream.getTracks().forEach(track => track.stop())
      }
    }
  }, [scanning, facingMode])

  // Toggle camera between front and rear
  const toggleCamera = () => {
    setFacingMode(prev => prev === 'environment' ? 'user' : 'environment')
  }

  // Stop camera
  const stopScanning = () => {
    if (videoRef.current?.srcObject) {
      const stream = videoRef.current.srcObject as MediaStream
      stream.getTracks().forEach(track => track.stop())
      videoRef.current.srcObject = null
    }
    setScanning(false)
    scanningRef.current = false
    setScannedData(null)
  }

  // Scan QR code from video
  const scanQRCode = () => {
    const canvas = canvasRef.current
    const video = videoRef.current

    if (!canvas || !video || !scanningRef.current) return

    const context = canvas.getContext('2d', { willReadFrequently: true })
    if (!context) return

    if (video.readyState === video.HAVE_ENOUGH_DATA) {
      canvas.width = video.videoWidth
      canvas.height = video.videoHeight
      context.drawImage(video, 0, 0, canvas.width, canvas.height)

      const imageData = context.getImageData(0, 0, canvas.width, canvas.height)
      const code = jsqr(imageData.data, imageData.width, imageData.height, {
        inversionAttempts: "dontInvert",
      })

      if (code) {
        console.log('QR Code detected:', code.data)

        // Pause scanning loop
        scanningRef.current = false

        // Parse QR data
        try {
          const paymentData = JSON.parse(code.data) as ScannedPaymentData
          setScannedData(paymentData)

          // Visual/Haptic feedback
          if (typeof window !== 'undefined' && window.navigator && window.navigator.vibrate) {
            window.navigator.vibrate(200)
          }
        } catch (err) {
          setError('Invalid QR code format')
          scanningRef.current = true // Resume scanning
        }
        return
      }
    }

    if (scanningRef.current) {
      requestAnimationFrame(scanQRCode)
    }
  }

  // Cancel scanned payment
  const cancelScannedPayment = () => {
    setScannedData(null)
    scanningRef.current = true
    setError('')
    requestAnimationFrame(scanQRCode)
  }

  // Confirm and process scanned payment
  const confirmPayment = async () => {
    if (!scannedData) return

    setLoading(true)
    setError('')
    setSuccess('')

    try {
      const qrData = JSON.stringify(scannedData)
      await transactionAPI.qrPayment({ qr_data: qrData })
      setSuccess(`Payment of $${scannedData.amount.toFixed(2)} sent successfully!`)
      stopScanning()

      // Reset after 3 seconds
      setTimeout(() => {
        setSuccess('')
      }, 3000)
    } catch (err: any) {
      setError(err.response?.data?.message || 'Payment failed')
      setScannedData(null)
      scanningRef.current = true
      requestAnimationFrame(scanQRCode)
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
              setSuccess('')
              setError('')
            }}
            className={`flex-1 py-3 px-6 rounded-xl font-semibold transition-all ${mode === 'generate'
              ? 'bg-gradient-to-r from-purple-600 to-pink-600 text-white shadow-lg'
              : 'bg-white text-slate-600 border border-slate-200 hover:border-slate-300'
              }`}
          >
            📱 Generate QR
          </button>
          <button
            onClick={() => {
              setMode('scan')
              setQrCodeUrl('')
              setSuccess('')
              setError('')
            }}
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
                  min="0"
                  value={amount}
                  onChange={(e) => setAmount(e.target.value)}
                  placeholder="0.00"
                  className="w-full px-4 py-3 rounded-xl border border-slate-300 focus:outline-none focus:ring-2 focus:ring-purple-500"
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
                  placeholder="Payment for..."
                  className="w-full px-4 py-3 rounded-xl border border-slate-300 focus:outline-none focus:ring-2 focus:ring-purple-500"
                />
              </div>
            </div>

            <button
              onClick={handleGenerateQR}
              className="w-full py-4 px-6 bg-gradient-to-r from-purple-600 to-pink-600 hover:from-purple-700 hover:to-pink-700 text-white font-semibold rounded-xl shadow-lg transition-all text-lg"
            >
              Generate QR Code
            </button>

            {qrCodeUrl && (
              <div className="mt-8 text-center">
                <div className="inline-block p-6 bg-white rounded-2xl shadow-xl border-4 border-purple-500">
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
                    disabled={!!scannedData}
                    className="absolute top-6 right-6 p-4 bg-white/10 hover:bg-white/20 text-white rounded-full shadow-lg transition-all backdrop-blur-md border border-white/20 group-hover:scale-110 active:scale-95 disabled:opacity-50 disabled:cursor-not-allowed"
                    title={`Switch to ${facingMode === 'environment' ? 'front' : 'rear'} camera`}
                  >
                    <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" />
                    </svg>
                  </button>

                  <div className="absolute bottom-6 left-1/2 -translate-x-1/2 bg-black/40 backdrop-blur-md px-4 py-1.5 rounded-full border border-white/10">
                    <p className="text-white text-xs font-medium tracking-wider uppercase">
                      {scannedData ? '✓ QR Code Detected' : 'Scanning for QR code...'}
                    </p>
                  </div>

                  {/* Confirmation Modal Overlay */}
                  {scannedData && (
                    <div className="absolute inset-0 bg-black/80 backdrop-blur-sm flex items-center justify-center p-6 animate-fadeIn">
                      <div className="bg-white rounded-2xl p-6 max-w-sm w-full shadow-2xl">
                        <div className="text-center mb-4">
                          <div className="w-16 h-16 bg-green-100 rounded-full flex items-center justify-center mx-auto mb-3">
                            <svg className="w-8 h-8 text-green-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                            </svg>
                          </div>
                          <h3 className="text-xl font-bold text-slate-900">Payment Confirmation</h3>
                        </div>

                        <div className="space-y-3 mb-6">
                          <div className="flex justify-between items-center pb-2 border-b border-slate-200">
                            <span className="text-slate-600">Amount:</span>
                            <span className="text-2xl font-bold text-purple-600">${scannedData.amount.toFixed(2)}</span>
                          </div>
                          <div className="flex justify-between items-center pb-2 border-b border-slate-200">
                            <span className="text-slate-600">To Account:</span>
                            <span className="font-mono text-sm text-slate-900">{scannedData.account}</span>
                          </div>
                          <div className="flex justify-between items-center">
                            <span className="text-slate-600">Description:</span>
                            <span className="text-slate-900">{scannedData.description}</span>
                          </div>
                        </div>

                        <div className="flex gap-3">
                          <button
                            onClick={cancelScannedPayment}
                            disabled={loading}
                            className="flex-1 py-3 px-4 bg-slate-100 hover:bg-slate-200 text-slate-700 font-semibold rounded-xl transition-all disabled:opacity-50"
                          >
                            Cancel
                          </button>
                          <button
                            onClick={confirmPayment}
                            disabled={loading}
                            className="flex-1 py-3 px-4 bg-gradient-to-r from-purple-600 to-pink-600 hover:from-purple-700 hover:to-pink-700 text-white font-semibold rounded-xl transition-all disabled:opacity-50"
                          >
                            {loading ? 'Processing...' : 'Confirm Payment'}
                          </button>
                        </div>
                      </div>
                    </div>
                  )}
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
                  @keyframes fadeIn {
                    from { opacity: 0; }
                    to { opacity: 1; }
                  }
                  .animate-fadeIn {
                    animation: fadeIn 0.3s ease-out;
                  }
                `}</style>

                <button
                  onClick={stopScanning}
                  className="w-full py-3 px-6 bg-slate-600 hover:bg-slate-700 text-white font-semibold rounded-xl transition-all"
                >
                  Stop Camera
                </button>
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  )
}
