import React, { useState, useEffect } from 'react'
import Link from 'next/link'

interface UserData {
  name: string
  email?: string
  account_number?: string
}

export default function Home() {
  const [isAuthenticated, setIsAuthenticated] = useState(false)
  const [user, setUser] = useState<UserData | null>(null)

  useEffect(() => {
    const token = localStorage.getItem('token')
    const userData = localStorage.getItem('user')
    if (token && userData) {
      setIsAuthenticated(true)
      setUser(JSON.parse(userData))
    }
  }, [])

  const handleOAuthLogin = () => {
    const clientId = process.env.NEXT_PUBLIC_CLIENT_ID || 'deltaup-client'
    const redirectUri = `${typeof window !== 'undefined' ? window.location.origin : ''}/oauth/callback`
    const oauthUrl = `${process.env.NEXT_PUBLIC_API_URL}/oauth/authorize?client_id=${clientId}&redirect_uri=${encodeURIComponent(redirectUri)}&response_type=code&scope=transfer%20balance`
    window.location.href = oauthUrl
  }

  const handleLogout = () => {
    localStorage.clear()
    setIsAuthenticated(false)
    setUser(null)
  }

  if (isAuthenticated && user) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-slate-50 via-white to-slate-50">
        {/* Welcome Section */}
        <div className="max-w-5xl mx-auto px-4 sm:px-6 lg:px-8 py-16 sm:py-20">
          <div className="mb-16">
            <h1 className="text-4xl sm:text-5xl font-light text-slate-900 mb-3 tracking-tight">
              Welcome back, <span className="font-medium">{user.name}</span>
            </h1>
            <p className="text-base text-slate-600">Manage your finances with ease</p>
          </div>

          {/* Quick Actions Grid */}
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-5 mb-16">
            {/* Transfer */}
            <Link href="/transfer">
              <div className="group relative p-7 bg-white rounded-2xl border border-slate-200/80 hover:border-blue-400/60 hover:shadow-lg hover:shadow-blue-100/50 transition-all duration-300 cursor-pointer transform hover:-translate-y-0.5">
                <div className="w-14 h-14 bg-gradient-to-br from-blue-50 to-blue-100 rounded-xl flex items-center justify-center mb-5 group-hover:scale-110 transition-transform duration-300">
                  <svg className="w-7 h-7 text-blue-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M7 16a4 4 0 01-.88-7.903A5 5 0 1115.9 6L16 6a5 5 0 011 9.9M15 13l-3-3m0 0l-3 3m3-3v12" />
                  </svg>
                </div>
                <h3 className="font-semibold text-slate-900 mb-1.5 text-lg">Send Money</h3>
                <p className="text-sm text-slate-500 group-hover:text-slate-600 transition-colors">Transfer funds instantly</p>
              </div>
            </Link>

            {/* Balance */}
            <Link href="/balance">
              <div className="group relative p-7 bg-white rounded-2xl border border-slate-200/80 hover:border-emerald-400/60 hover:shadow-lg hover:shadow-emerald-100/50 transition-all duration-300 cursor-pointer transform hover:-translate-y-0.5">
                <div className="w-14 h-14 bg-gradient-to-br from-emerald-50 to-emerald-100 rounded-xl flex items-center justify-center mb-5 group-hover:scale-110 transition-transform duration-300">
                  <svg className="w-7 h-7 text-emerald-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8c-1.657 0-3 .895-3 2s1.343 2 3 2 3 .895 3 2-1.343 2-3 2m0-8c1.11 0 2.08.402 2.599 1M12 8V7m0 1v8m0 0v1m0-1c-1.11 0-2.08-.402-2.599-1M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                  </svg>
                </div>
                <h3 className="font-semibold text-slate-900 mb-1.5 text-lg">Check Balance</h3>
                <p className="text-sm text-slate-500 group-hover:text-slate-600 transition-colors">View your account balance</p>
              </div>
            </Link>

            {/* QR Payment */}
            <Link href="/qr-payment">
              <div className="group relative p-7 bg-white rounded-2xl border border-slate-200/80 hover:border-violet-400/60 hover:shadow-lg hover:shadow-violet-100/50 transition-all duration-300 cursor-pointer transform hover:-translate-y-0.5 sm:col-span-2 lg:col-span-1">
                <div className="w-14 h-14 bg-gradient-to-br from-violet-50 to-violet-100 rounded-xl flex items-center justify-center mb-5 group-hover:scale-110 transition-transform duration-300">
                  <svg className="w-7 h-7 text-violet-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v1m6 11h2m-6 0h-2v4m0-11v3m0 0h.01M12 12h4.01M16 20h4M4 12h4m12 0h.01M5 8h2a1 1 0 001-1V5a1 1 0 00-1-1H5a1 1 0 00-1 1v2a1 1 0 001 1zm12 0h2a1 1 0 001-1V5a1 1 0 00-1-1h-2a1 1 0 00-1 1v2a1 1 0 001 1zM5 20h2a1 1 0 001-1v-2a1 1 0 00-1-1H5a1 1 0 00-1 1v2a1 1 0 001 1z" />
                  </svg>
                </div>
                <h3 className="font-semibold text-slate-900 mb-1.5 text-lg">QR Payment</h3>
                <p className="text-sm text-slate-500 group-hover:text-slate-600 transition-colors">Scan to pay instantly</p>
              </div>
            </Link>
          </div>

          {/* Stats Section */}
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-12">
            <div className="p-5 bg-white rounded-xl border border-slate-200/80 hover:border-slate-300 transition-colors">
              <p className="text-xs font-medium text-slate-500 mb-2 uppercase tracking-wide">Status</p>
              <p className="font-semibold text-slate-900 text-lg">Active</p>
            </div>
            <div className="p-5 bg-white rounded-xl border border-slate-200/80 hover:border-slate-300 transition-colors">
              <p className="text-xs font-medium text-slate-500 mb-2 uppercase tracking-wide">Email</p>
              <p className="font-semibold text-slate-900 text-lg truncate">{user.email || 'N/A'}</p>
            </div>
            <div className="p-5 bg-white rounded-xl border border-slate-200/80 hover:border-slate-300 transition-colors">
              <p className="text-xs font-medium text-slate-500 mb-2 uppercase tracking-wide">Account</p>
              <p className="font-semibold text-slate-900 text-lg font-mono truncate">{user.account_number || 'N/A'}</p>
            </div>
            <div className="p-5 bg-white rounded-xl border border-slate-200/80 hover:border-slate-300 transition-colors">
              <p className="text-xs font-medium text-slate-500 mb-2 uppercase tracking-wide">Member</p>
              <p className="font-semibold text-slate-900 text-lg">2025</p>
            </div>
          </div>

          {/* Logout Button */}
          <div className="flex justify-center">
            <button
              onClick={handleLogout}
              className="px-8 py-3 text-sm font-medium text-slate-600 hover:text-slate-900 border border-slate-300 hover:border-slate-400 rounded-xl transition-all duration-200 hover:bg-slate-50"
            >
              Sign Out
            </button>
          </div>
        </div>
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-50 via-white to-slate-50 flex flex-col items-center justify-center px-4 py-12">
      {/* Hero Section */}
      <div className="max-w-3xl mx-auto text-center mb-16">
        <div className="inline-flex items-center justify-center w-16 h-16 bg-gradient-to-br from-blue-50 to-blue-100 rounded-2xl mb-8 shadow-sm">
          <svg className="w-9 h-9 text-blue-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 10V3L4 14h7v7l9-11h-7z" />
          </svg>
        </div>
        <h1 className="text-5xl sm:text-6xl font-light text-slate-900 mb-5 tracking-tight">
          DeltaUp
        </h1>
        <p className="text-xl text-slate-600 mb-2 font-light">Modern financial management</p>
        <p className="text-base text-slate-500">Built for speed and simplicity</p>
      </div>

      {/* Features Preview */}
      <div className="max-w-4xl mx-auto grid grid-cols-1 md:grid-cols-3 gap-6 mb-16 w-full">
        <div className="text-center p-6 bg-white rounded-xl border border-slate-200/80 hover:border-slate-300 transition-all">
          <div className="text-4xl mb-4">⚡</div>
          <h3 className="font-semibold text-slate-900 mb-2 text-lg">Instant Transfers</h3>
          <p className="text-sm text-slate-500">Send money in seconds</p>
        </div>
        <div className="text-center p-6 bg-white rounded-xl border border-slate-200/80 hover:border-slate-300 transition-all">
          <div className="text-4xl mb-4">🔒</div>
          <h3 className="font-semibold text-slate-900 mb-2 text-lg">Secure & Safe</h3>
          <p className="text-sm text-slate-500">Bank-grade security</p>
        </div>
        <div className="text-center p-6 bg-white rounded-xl border border-slate-200/80 hover:border-slate-300 transition-all">
          <div className="text-4xl mb-4">📱</div>
          <h3 className="font-semibold text-slate-900 mb-2 text-lg">QR Payments</h3>
          <p className="text-sm text-slate-500">Modern payment methods</p>
        </div>
      </div>

      {/* Login Button */}
      <button
        onClick={handleOAuthLogin}
        className="px-10 py-4 bg-gradient-to-r from-blue-600 to-blue-700 hover:from-blue-700 hover:to-blue-800 text-white font-medium rounded-xl transition-all duration-200 shadow-md hover:shadow-lg transform hover:-translate-y-0.5 text-base"
      >
        Sign In with OAuth
      </button>

      {/* Footer */}
      <div className="mt-20 text-center text-sm text-slate-500">
        <p>A modern fintech platform for financial management</p>
      </div>
    </div>
  )
}
