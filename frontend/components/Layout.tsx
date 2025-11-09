import React, { useState } from 'react'
import Link from 'next/link'
import { useRouter } from 'next/router'

interface LayoutProps {
  children: React.ReactNode
}

export default function Layout({ children }: LayoutProps) {
  const router = useRouter()
  const [isMenuOpen, setIsMenuOpen] = useState(false)

  const navItems = [
    { href: '/', label: 'Dashboard', icon: '📊' },
    { href: '/balance', label: 'Balance', icon: '💰' },
    { href: '/transfer', label: 'Transfer', icon: '💸' },
    { href: '/qr-payment', label: 'QR Payment', icon: '📱' },
  ]

  return (
    <div className="flex flex-col min-h-screen bg-gradient-to-br from-slate-50 to-slate-100">
      {/* Header/Navbar */}
      <header className="sticky top-0 z-50 bg-white shadow-lg border-b border-slate-200">
        <nav className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-4">
          <div className="flex justify-between items-center">
            {/* Logo */}
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 bg-gradient-to-br from-blue-600 to-blue-700 rounded-lg flex items-center justify-center">
                <svg className="w-6 h-6 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 7h8m0 0v8m0-8l-8 8-4-4-6 6" />
                </svg>
              </div>
              <div>
                <h1 className="text-2xl font-bold text-slate-800">DeltaUp</h1>
                <p className="text-xs text-slate-500">User Data Management</p>
              </div>
            </div>

            {/* Desktop Navigation */}
            <div className="hidden md:flex items-center gap-6">
              {navItems.map((item) => (
                <Link
                  key={item.href}
                  href={item.href}
                  className={`flex items-center gap-2 px-3 py-2 rounded-lg transition-all font-medium text-sm ${
                    router.pathname === item.href
                      ? 'bg-blue-100 text-blue-600'
                      : 'text-slate-600 hover:bg-slate-100'
                  }`}
                >
                  <span>{item.icon}</span>
                  {item.label}
                </Link>
              ))}
            </div>

            {/* Mobile Menu Button */}
            <button
              onClick={() => setIsMenuOpen(!isMenuOpen)}
              className="md:hidden p-2 rounded-lg hover:bg-slate-100 transition-colors"
            >
              <svg
                className="w-6 h-6"
                fill="none"
                stroke="currentColor"
                viewBox="0 0 24 24"
              >
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth={2}
                  d="M4 6h16M4 12h16M4 18h16"
                />
              </svg>
            </button>
          </div>

          {/* Mobile Navigation */}
          {isMenuOpen && (
            <div className="md:hidden mt-4 space-y-2 pt-4 border-t border-slate-200">
              {navItems.map((item) => (
                <Link
                  key={item.href}
                  href={item.href}
                  onClick={() => setIsMenuOpen(false)}
                  className={`block px-4 py-3 rounded-lg transition-all font-medium ${
                    router.pathname === item.href
                      ? 'bg-blue-100 text-blue-600'
                      : 'text-slate-600 hover:bg-slate-100'
                  }`}
                >
                  <span className="mr-2">{item.icon}</span>
                  {item.label}
                </Link>
              ))}
            </div>
          )}
        </nav>
      </header>

      {/* Main Content */}
      <main className="flex-grow max-w-7xl w-full mx-auto px-4 sm:px-6 lg:px-8 py-8">
        {children}
      </main>

      {/* Footer */}
      <footer className="bg-white border-t border-slate-200 mt-12">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-12">
          <div className="grid grid-cols-1 md:grid-cols-3 gap-8 mb-8">
            {/* About */}
            <div>
              <h3 className="text-lg font-bold text-slate-800 mb-4">About DeltaUp</h3>
              <p className="text-sm text-slate-600 leading-relaxed">
                A modern fintech platform for user data management. Your data, your control. Transfers powered by secure API sandbox.
              </p>
            </div>

            {/* Features */}
            <div>
              <h3 className="text-lg font-bold text-slate-800 mb-4">Features</h3>
              <ul className="space-y-2 text-sm text-slate-600">
                <li>✓ Secure Data Management</li>
                <li>✓ Real-time Transfers (Sandbox)</li>
                <li>✓ QR Code Payments</li>
                <li>✓ Account Balance Tracking</li>
              </ul>
            </div>

            {/* Contact */}
            <div>
              <h3 className="text-lg font-bold text-slate-800 mb-4">Contact</h3>
              <ul className="space-y-2 text-sm text-slate-600">
                <li>📧 support@deltaup.io</li>
                <li>🌐 deltaup.io</li>
                <li>💬 Live Chat Support</li>
              </ul>
            </div>
          </div>

          <div className="border-t border-slate-200 pt-8">
            <div className="flex flex-col md:flex-row justify-between items-center text-sm text-slate-600">
              <p>&copy; 2025 DeltaUp. All rights reserved.</p>
              <div className="flex gap-6 mt-4 md:mt-0">
                <a href="#" className="hover:text-blue-600 transition-colors">
                  Privacy Policy
                </a>
                <a href="#" className="hover:text-blue-600 transition-colors">
                  Terms of Service
                </a>
                <a href="#" className="hover:text-blue-600 transition-colors">
                  Security
                </a>
              </div>
            </div>
          </div>

          {/* Beta Badge */}
          <div className="mt-6 text-center text-xs text-slate-500 bg-yellow-50 border border-yellow-200 rounded-lg py-2 px-4">
            🧪 This application uses API sandbox for demonstrations. Transfers are secure but for testing only.
          </div>
        </div>
      </footer>
    </div>
  )
}

