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
    <div className="min-h-screen bg-background relative overflow-hidden font-sans">
      {/* Background Decor */}
      <div className="absolute inset-0 overflow-hidden pointer-events-none">
        <div className="absolute -top-[10%] -right-[10%] w-[40%] h-[40%] bg-primary/5 rounded-full blur-3xl"></div>
        <div className="absolute -bottom-[10%] -left-[10%] w-[40%] h-[40%] bg-accent/5 rounded-full blur-3xl"></div>
      </div>

      {/* Content */}
      <div className="relative z-10 min-h-screen flex flex-col items-center justify-center px-4 py-12">
        {/* Hero Section */}
        <div className="max-w-4xl mx-auto text-center mb-16 animate-slideUp">
          <div className="inline-flex items-center justify-center w-20 h-20 bg-primary rounded-3xl mb-8 shadow-xl shadow-primary/20">
            <svg className="w-12 h-12 text-primary-foreground" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 10V3L4 14h7v7l9-11h-7z" />
            </svg>
          </div>

          <h1 className="text-5xl md:text-7xl font-bold text-foreground mb-6 tracking-tight">
            DeltaUp
          </h1>

          <p className="text-xl md:text-2xl text-muted mb-8 max-w-2xl mx-auto leading-relaxed">
            The modern financial engine for your digital life. Secure, instant, and borderless.
          </p>
        </div>

        {/* CTA Buttons */}
        <div className="flex flex-col sm:flex-row gap-4 mb-20 animate-slideUp" style={{ animationDelay: '100ms' }}>
          <Link
            href="/register"
            className="px-10 py-4 bg-primary text-primary-foreground font-semibold rounded-xl shadow-lg shadow-primary/20 hover:scale-105 transition-all text-center"
          >
            Get Started Free
          </Link>
          <Link
            href="/login"
            className="px-10 py-4 bg-surface border border-border text-foreground font-semibold rounded-xl hover:bg-surface-highlight transition-all text-center"
          >
            Sign In
          </Link>
        </div>

        {/* Features Grid */}
        <div className="max-w-6xl mx-auto grid grid-cols-1 md:grid-cols-3 gap-8 w-full animate-slideUp" style={{ animationDelay: '200ms' }}>
          <div className="glass-panel p-8 rounded-2xl group hover:border-primary/50 transition-colors">
            <div className="w-14 h-14 bg-primary/10 rounded-xl flex items-center justify-center text-3xl mb-6 group-hover:scale-110 transition-transform">⚡</div>
            <h3 className="font-bold text-foreground mb-3 text-xl">Instant Settlement</h3>
            <p className="text-muted leading-relaxed">Send and receive funds in seconds, not days. Built on high-performance infrastructure.</p>
          </div>

          <div className="glass-panel p-8 rounded-2xl group hover:border-primary/50 transition-colors">
            <div className="w-14 h-14 bg-primary/10 rounded-xl flex items-center justify-center text-3xl mb-6 group-hover:scale-110 transition-transform">🔒</div>
            <h3 className="font-bold text-foreground mb-3 text-xl">Bank-Grade Trust</h3>
            <p className="text-muted leading-relaxed">Enterprise encryption and ACID-compliant transactions ensure your assets are always safe.</p>
          </div>

          <div className="glass-panel p-8 rounded-2xl group hover:border-primary/50 transition-colors">
            <div className="w-14 h-14 bg-primary/10 rounded-xl flex items-center justify-center text-3xl mb-6 group-hover:scale-110 transition-transform">📱</div>
            <h3 className="font-bold text-foreground mb-3 text-xl">QR Ecosystem</h3>
            <p className="text-muted leading-relaxed">Next-gen QR technology for contactless payments, scanning, and instant requests.</p>
          </div>
        </div>

        {/* Stats */}
        <div className="flex flex-wrap justify-center gap-12 md:gap-24 mt-24 opacity-60">
          <div className="text-center">
            <div className="text-3xl font-bold text-foreground font-mono">99.9%</div>
            <div className="text-muted text-xs uppercase tracking-widest mt-1">Uptime</div>
          </div>
          <div className="text-center">
            <div className="text-3xl font-bold text-foreground font-mono">&lt;100ms</div>
            <div className="text-muted text-xs uppercase tracking-widest mt-1">API Latency</div>
          </div>
          <div className="text-center">
            <div className="text-3xl font-bold text-foreground font-mono">256-bit</div>
            <div className="text-muted text-xs uppercase tracking-widest mt-1">Encryption</div>
          </div>
        </div>
      </div>
    </div>
  )
}