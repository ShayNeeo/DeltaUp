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

  const features = [
    {
      icon: '💸',
      title: 'Fast Transfers',
      description: 'Send money instantly to any account',
      href: '/transfer',
      color: 'from-blue-500 to-blue-600'
    },
    {
      icon: '💰',
      title: 'Balance Check',
      description: 'Real-time account balance tracking',
      href: '/balance',
      color: 'from-green-500 to-green-600'
    },
    {
      icon: '📱',
      title: 'QR Payments',
      description: 'Generate and scan QR codes for payments',
      href: '/qr-payment',
      color: 'from-purple-500 to-purple-600'
    }
  ]

  if (!isAuthenticated) {
    return (
      <div className="space-y-12">
        {/* Hero Section */}
        <div className="bg-gradient-to-r from-blue-600 via-blue-500 to-cyan-500 rounded-2xl p-12 md:p-16 text-white">
          <div className="max-w-2xl">
            <h2 className="text-4xl md:text-5xl font-bold mb-4">
              Welcome to DeltaUp
            </h2>
            <p className="text-xl text-blue-100 mb-8">
              Your personal fintech platform for secure data management and seamless transfers through our API sandbox.
            </p>
            <button
              onClick={handleOAuthLogin}
              className="bg-white text-blue-600 px-8 py-4 rounded-lg font-bold text-lg hover:bg-blue-50 transition-all shadow-lg hover:shadow-xl"
            >
              Sign In Now →
            </button>
          </div>
        </div>

        {/* Features Grid */}
        <div>
          <h3 className="text-3xl font-bold text-slate-800 mb-8">Key Features</h3>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            {features.map((feature) => (
              <div
                key={feature.title}
                className="bg-white rounded-xl shadow-md p-8 hover:shadow-lg transition-all border border-slate-200"
              >
                <div className={`text-4xl mb-4 bg-gradient-to-br ${feature.color} bg-clip-text text-transparent`}>
                  {feature.icon}
                </div>
                <h4 className="text-xl font-bold text-slate-800 mb-2">{feature.title}</h4>
                <p className="text-slate-600">{feature.description}</p>
              </div>
            ))}
          </div>
        </div>

        {/* Info Section */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
          <div className="bg-blue-50 border border-blue-200 rounded-xl p-8">
            <h3 className="text-2xl font-bold text-blue-900 mb-4">🔒 Your Data, Your Control</h3>
            <p className="text-blue-800 leading-relaxed">
              DeltaUp is designed around user privacy and data ownership. We don't store personal information beyond what's necessary for transactions. Your data remains encrypted and under your complete control.
            </p>
          </div>
          <div className="bg-green-50 border border-green-200 rounded-xl p-8">
            <h3 className="text-2xl font-bold text-green-900 mb-4">🧪 Sandbox API</h3>
            <p className="text-green-800 leading-relaxed">
              All transfers are processed through a secure sandbox environment. Perfect for testing and demonstration. No real money involved—just pure financial workflow exploration.
            </p>
          </div>
        </div>
      </div>
    )
  }

  return (
    <div className="space-y-8">
      {/* Welcome Header */}
      <div className="bg-gradient-to-r from-blue-600 to-cyan-500 rounded-2xl p-8 text-white">
        <h2 className="text-3xl font-bold mb-2">Welcome back, {user?.name}! 👋</h2>
        <p className="text-blue-100">Your personal fintech dashboard</p>
      </div>

      {/* Quick Actions */}
      <div>
        <h3 className="text-2xl font-bold text-slate-800 mb-6">Quick Actions</h3>
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
          {features.map((feature) => (
            <Link key={feature.href} href={feature.href}>
              <div className="bg-gradient-to-br from-white to-slate-50 border border-slate-200 rounded-xl p-8 hover:border-blue-300 hover:shadow-lg transition-all cursor-pointer group">
                <div className="text-5xl mb-4 group-hover:scale-110 transition-transform">{feature.icon}</div>
                <h4 className="text-xl font-bold text-slate-800 mb-2">{feature.title}</h4>
                <p className="text-slate-600 mb-4">{feature.description}</p>
                <div className="text-blue-600 font-semibold group-hover:translate-x-2 transition-transform">
                  Go →
                </div>
              </div>
            </Link>
          ))}
        </div>
      </div>

      {/* Account Info */}
      <div className="bg-white border border-slate-200 rounded-xl p-8 shadow-sm">
        <h3 className="text-2xl font-bold text-slate-800 mb-6">Account Information</h3>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          <div className="flex items-center gap-4">
            <div className="w-12 h-12 bg-blue-100 rounded-lg flex items-center justify-center">
              <span className="text-2xl">👤</span>
            </div>
            <div>
              <p className="text-sm text-slate-600">Full Name</p>
              <p className="text-lg font-semibold text-slate-800">{user?.name}</p>
            </div>
          </div>
          <div className="flex items-center gap-4">
            <div className="w-12 h-12 bg-green-100 rounded-lg flex items-center justify-center">
              <span className="text-2xl">🏦</span>
            </div>
            <div>
              <p className="text-sm text-slate-600">Account Number</p>
              <p className="text-lg font-semibold text-slate-800">{user?.account_number || '****'}</p>
            </div>
          </div>
        </div>
      </div>

      {/* Logout Button */}
      <div className="flex justify-end">
        <button
          onClick={handleLogout}
          className="px-6 py-3 bg-red-100 text-red-600 rounded-lg font-semibold hover:bg-red-200 transition-colors"
        >
          Logout
        </button>
      </div>
    </div>
  )
}
