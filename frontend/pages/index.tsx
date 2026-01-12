import { useEffect } from 'react'
import { useRouter } from 'next/router'
import Link from 'next/link'

export default function Home() {
  const router = useRouter()

  useEffect(() => {
    const token = localStorage.getItem('token')
    if (token) {
      router.push('/dashboard')
    }
  }, [router])

  return (
    <div className="min-h-screen bg-gradient-to-br from-indigo-900 via-purple-900 to-pink-900 relative overflow-hidden">
      {/* Animated background elements */}
      <div className="absolute inset-0 overflow-hidden">
        <div className="absolute -top-40 -right-40 w-80 h-80 bg-purple-500 rounded-full mix-blend-multiply filter blur-xl opacity-70 animate-blob"></div>
        <div className="absolute -bottom-40 -left-40 w-80 h-80 bg-pink-500 rounded-full mix-blend-multiply filter blur-xl opacity-70 animate-blob animation-delay-2000"></div>
        <div className="absolute top-1/2 left-1/2 w-80 h-80 bg-indigo-500 rounded-full mix-blend-multiply filter blur-xl opacity-70 animate-blob animation-delay-4000"></div>
      </div>

      {/* Content */}
      <div className="relative z-10 min-h-screen flex flex-col items-center justify-center px-4 py-12">
        {/* Hero Section */}
        <div className="max-w-4xl mx-auto text-center mb-12">
          <div className="inline-flex items-center justify-center w-20 h-20 bg-white/10 backdrop-blur-md rounded-3xl mb-8 shadow-2xl">
            <svg className="w-12 h-12 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 10V3L4 14h7v7l9-11h-7z" />
            </svg>
          </div>

          <h1 className="text-6xl md:text-7xl font-bold text-white mb-6 tracking-tight">
            DeltaUp
          </h1>

          <p className="text-2xl md:text-3xl text-purple-100 mb-4 font-light">
            The Future of Financial Management
          </p>

          <p className="text-lg text-purple-200 max-w-2xl mx-auto">
            Experience seamless transactions, instant transfers, and modern QR payments all in one secure platform
          </p>
        </div>

        {/* Features Grid */}
        <div className="max-w-5xl mx-auto grid grid-cols-1 md:grid-cols-3 gap-6 mb-12 w-full">
          <div className="bg-white/10 backdrop-blur-lg rounded-2xl p-6 border border-white/20 hover:bg-white/20 transition-all transform hover:scale-105">
            <div className="text-5xl mb-4">⚡</div>
            <h3 className="font-semibold text-white mb-2 text-xl">Lightning Fast</h3>
            <p className="text-purple-200 text-sm">Instant money transfers with real-time processing</p>
          </div>

          <div className="bg-white/10 backdrop-blur-lg rounded-2xl p-6 border border-white/20 hover:bg-white/20 transition-all transform hover:scale-105">
            <div className="text-5xl mb-4">🔒</div>
            <h3 className="font-semibold text-white mb-2 text-xl">Bank-Grade Security</h3>
            <p className="text-purple-200 text-sm">Your data protected with enterprise-level encryption</p>
          </div>

          <div className="bg-white/10 backdrop-blur-lg rounded-2xl p-6 border border-white/20 hover:bg-white/20 transition-all transform hover:scale-105">
            <div className="text-5xl mb-4">📱</div>
            <h3 className="font-semibold text-white mb-2 text-xl">QR Payments</h3>
            <p className="text-purple-200 text-sm">Modern payment methods for the digital age</p>
          </div>
        </div>

        {/* CTA Buttons */}
        <div className="flex flex-col sm:flex-row gap-4 mb-8">
          <Link
            href="/register"
            className="px-10 py-4 bg-white text-purple-900 font-semibold rounded-xl shadow-2xl hover:shadow-white/20 transition-all transform hover:scale-105 hover:-translate-y-1 text-center"
          >
            Get Started Free
          </Link>
          <Link
            href="/login"
            className="px-10 py-4 bg-white/10 backdrop-blur-md border border-white/30 text-white font-semibold rounded-xl hover:bg-white/20 transition-all text-center"
          >
            Sign In
          </Link>
        </div>

        {/* Stats */}
        <div className="grid grid-cols-3 gap-8 max-w-2xl mx-auto mt-16">
          <div className="text-center">
            <div className="text-4xl font-bold text-white mb-1">99.9%</div>
            <div className="text-purple-200 text-sm">Uptime</div>
          </div>
          <div className="text-center">
            <div className="text-4xl font-bold text-white mb-1">&lt;1s</div>
            <div className="text-purple-200 text-sm">Transaction Speed</div>
          </div>
          <div className="text-center">
            <div className="text-4xl font-bold text-white mb-1">24/7</div>
            <div className="text-purple-200 text-sm">Support</div>
          </div>
        </div>
      </div>

      <style jsx>{`
        @keyframes blob {
          0% {
            transform: translate(0px, 0px) scale(1);
          }
          33% {
            transform: translate(30px, -50px) scale(1.1);
          }
          66% {
            transform: translate(-20px, 20px) scale(0.9);
          }
          100% {
            transform: translate(0px, 0px) scale(1);
          }
        }
        .animate-blob {
          animation: blob 7s infinite;
        }
        .animation-delay-2000 {
          animation-delay: 2s;
        }
        .animation-delay-4000 {
          animation-delay: 4s;
        }
      `}</style>
    </div>
  )
}
