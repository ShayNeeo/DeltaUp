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

  const toggleCamera = () => {
    setFacingMode(prev => prev === 'environment' ? 'user' : 'environment')
  }

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
        scanningRef.current = false
        try {
          const paymentData = JSON.parse(code.data) as ScannedPaymentData
          setScannedData(paymentData)
          if (typeof window !== 'undefined' && window.navigator && window.navigator.vibrate) {
            window.navigator.vibrate(200)
          }
        } catch (err) {
          setError('Invalid QR code format')
          scanningRef.current = true
        }
        return
      }
    }

    if (scanningRef.current) {
      requestAnimationFrame(scanQRCode)
    }
  }

  const cancelScannedPayment = () => {
    setScannedData(null)
    scanningRef.current = true
    setError('')
    requestAnimationFrame(scanQRCode)
  }

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
      setTimeout(() => setSuccess(''), 3000)
    } catch (err: any) {
      setError(err.response?.data?.error || 'Payment failed')
      setScannedData(null)
      scanningRef.current = true
      requestAnimationFrame(scanQRCode)
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="bg-background min-h-screen font-sans pb-12">
      <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 py-8 sm:py-12 animate-slideUp">
        <h1 className="text-3xl font-bold text-foreground tracking-tight mb-2">QR Payment</h1>
        <p className="text-muted mb-10">Scan to pay or generate your unique payment code</p>

        {/* Mode Switcher */}
        <div className="flex p-1 bg-surface-highlight rounded-2xl mb-10 border border-border">
          <button
            onClick={() => {
              setMode('generate')
              stopScanning()
              setSuccess('')
              setError('')
            }}
            className={`flex-1 py-3.5 rounded-xl font-bold text-sm transition-all ${mode === 'generate'
              ? 'bg-primary text-primary-foreground shadow-lg'
              : 'text-muted hover:text-foreground'
              }`}
          >
            Generate Code
          </button>
          <button
            onClick={() => {
              setMode('scan')
              setQrCodeUrl('')
              setSuccess('')
              setError('')
            }}
            className={`flex-1 py-3.5 rounded-xl font-bold text-sm transition-all ${mode === 'scan'
              ? 'bg-primary text-primary-foreground shadow-lg'
              : 'text-muted hover:text-foreground'
              }`}
          >
            Scan QR
          </button>
        </div>

        {/* Alerts */}
        {error && (
          <div className="mb-8 p-4 bg-danger/10 border border-danger/20 text-danger rounded-xl text-sm font-medium animate-slideUp">
            {error}
          </div>
        )}
        {success && (
          <div className="mb-8 p-4 bg-emerald-500/10 border border-emerald-500/20 text-emerald-600 dark:text-emerald-400 rounded-xl text-sm font-medium animate-slideUp">
            {success}
          </div>
        )}

        {/* Generate Mode */}
        {mode === 'generate' && (
          <div className="glass-panel rounded-2xl p-8 sm:p-10 text-center">
            <h2 className="text-2xl font-bold text-foreground mb-8">Receive Payment</h2>

            <div className="max-w-md mx-auto space-y-6 mb-10 text-left">
              <div>
                <label className="block text-sm font-semibold text-foreground mb-2.5">Amount (USD)</label>
                <input
                  type="number"
                  step="0.01"
                  min="0.01"
                  value={amount}
                  onChange={(e) => setAmount(e.target.value)}
                  placeholder="0.00"
                  className="w-full px-4 py-3.5 bg-surface-highlight border border-border rounded-xl text-foreground placeholder-muted focus:outline-none focus:ring-2 focus:ring-primary/50 focus:border-primary font-mono text-xl font-bold"
                />
              </div>
              <div>
                <label className="block text-sm font-semibold text-foreground mb-2.5">Description</label>
                <input
                  type="text"
                  value={description}
                  onChange={(e) => setDescription(e.target.value)}
                  placeholder="What is this for?"
                  className="w-full px-4 py-3.5 bg-surface-highlight border border-border rounded-xl text-foreground placeholder-muted focus:outline-none focus:ring-2 focus:ring-primary/50 focus:border-primary"
                />
              </div>
            </div>

            <button
              onClick={handleGenerateQR}
              className="w-full max-w-md py-4 bg-primary text-primary-foreground font-bold rounded-xl shadow-lg shadow-primary/20 hover:scale-[1.01] active:scale-[0.99] transition-all"
            >
              Generate Unique QR Code
            </button>

            {qrCodeUrl && (
              <div className="mt-12 animate-slideUp">
                <div className="inline-block p-4 bg-white rounded-3xl shadow-2xl border border-border">
                  <Image src={qrCodeUrl} alt="Payment QR Code" width={280} height={280} unoptimized={true} className="rounded-xl" />
                </div>
                <p className="mt-6 text-sm text-muted">
                  Show this code to the payer to receive <span className="font-bold text-foreground font-mono">${parseFloat(amount).toFixed(2)}</span>
                </p>
              </div>
            )}
          </div>
        )}

        {/* Scan Mode */}
        {mode === 'scan' && (
          <div className="glass-panel rounded-2xl p-8 sm:p-10 text-center">
            <h2 className="text-2xl font-bold text-foreground mb-8">Scan to Pay</h2>

            {!scanning ? (
              <div className="py-12">
                <div className="w-24 h-24 bg-primary/10 rounded-full flex items-center justify-center mx-auto mb-8 text-4xl text-primary animate-pulse">
                  📷
                </div>
                <button
                  onClick={startScanning}
                  className="w-full max-w-md py-4 bg-primary text-primary-foreground font-bold rounded-xl shadow-lg shadow-primary/20 hover:scale-[1.01] transition-all"
                >
                  Start Camera Scanner
                </button>
              </div>
            ) : (
              <div className="space-y-6">
                <div className="relative bg-black rounded-3xl overflow-hidden shadow-2xl aspect-[4/3] max-w-2xl mx-auto border border-border">
                  <video ref={videoRef} className="w-full h-full object-cover" playsInline />
                  <canvas ref={canvasRef} className="hidden" />

                  {/* Scanner UI Overlays */}
                  <div className="absolute inset-0 border-[40px] border-black/40 pointer-events-none"></div>
                  <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-64 h-64 border-2 border-primary rounded-3xl pointer-events-none">
                    <div className="absolute inset-0 bg-primary/5"></div>
                    {/* Corner accents */}
                    <div className="absolute -top-1 -left-1 w-8 h-8 border-t-4 border-l-4 border-primary rounded-tl-xl"></div>
                    <div className="absolute -top-1 -right-1 w-8 h-8 border-t-4 border-r-4 border-primary rounded-tr-xl"></div>
                    <div className="absolute -bottom-1 -left-1 w-8 h-8 border-b-4 border-l-4 border-primary rounded-bl-xl"></div>
                    <div className="absolute -bottom-1 -right-1 w-8 h-8 border-b-4 border-r-4 border-primary rounded-br-xl"></div>
                  </div>

                  {/* Confirmation Modal */}
                  {scannedData && (
                    <div className="absolute inset-0 bg-background/95 backdrop-blur-sm flex items-center justify-center p-6 animate-slideUp">
                      <div className="bg-surface rounded-2xl p-8 max-w-xs w-full shadow-2xl border border-border">
                        <h3 className="text-xl font-bold text-foreground mb-6">Payment Details</h3>
                        <div className="space-y-4 mb-8 text-left">
                          <div className="pb-3 border-b border-border flex justify-between">
                            <span className="text-muted text-sm">Amount:</span>
                            <span className="font-mono font-bold text-primary">${scannedData.amount.toFixed(2)}</span>
                          </div>
                          <div className="pb-3 border-b border-border flex justify-between">
                            <span className="text-muted text-sm">To:</span>
                            <span className="font-mono text-xs truncate max-w-[120px]">{scannedData.account}</span>
                          </div>
                        </div>

                        <div className="grid grid-cols-2 gap-3">
                          <button onClick={cancelScannedPayment} className="py-3 px-4 bg-surface-highlight hover:bg-border rounded-xl font-bold text-sm transition-all">Cancel</button>
                          <button onClick={confirmPayment} disabled={loading} className="py-3 px-4 bg-primary text-primary-foreground rounded-xl font-bold text-sm shadow-lg shadow-primary/20 transition-all">
                            {loading ? '...' : 'Pay Now'}
                          </button>
                        </div>
                      </div>
                    </div>
                  )}
                </div>

                <div className="flex gap-4 justify-center">
                   <button onClick={toggleCamera} className="py-3 px-6 bg-surface-highlight border border-border rounded-xl font-bold text-sm hover:bg-border transition-all flex items-center gap-2">
                    🔄 Switch Camera
                  </button>
                  <button onClick={stopScanning} className="py-3 px-6 bg-danger/10 text-danger border border-danger/20 rounded-xl font-bold text-sm hover:bg-danger/20 transition-all">
                    Stop Scanner
                  </button>
                </div>
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  )
}