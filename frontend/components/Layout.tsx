import React, { useState, useEffect } from 'react'
import Link from 'next/link'
import { useRouter } from 'next/router'
import { isAuthenticated, getUser, logout } from '@/lib/api'
import ThemeToggle from './ThemeToggle'

interface LayoutProps {
  children: React.ReactNode
}

export default function Layout({ children }: LayoutProps) {
  const router = useRouter()
  const [isMenuOpen, setIsMenuOpen] = useState(false)
  const [isAuth, setIsAuth] = useState(false)
  const [user, setUser] = useState<any>(null)

  useEffect(() => {
    setIsAuth(isAuthenticated())
    setUser(getUser())
  }, [router.pathname])

  // Routes that should not show navigation
  const noNavRoutes = ['/', '/login', '/register', '/logout', '/401', '/403', '/404', '/500']
  const shouldShowNav = !noNavRoutes.includes(router.pathname)

  const navItems = [
    { href: '/dashboard', label: 'Dashboard', icon: '📊' },
    { href: '/transfer', label: 'Transfer', icon: '💸' },
    { href: '/qr-payment', label: 'QR Pay', icon: '📱' },
    { href: '/balance', label: 'Balance', icon: '💰' },
  ]

  if (!shouldShowNav) {
    return <>{children}</>
  }

  return (
    <div className="flex flex-col min-h-screen bg-background text-foreground transition-colors duration-300 font-sans">
      {/* Header */}
      <header className="sticky top-0 z-50 border-b border-border bg-surface/80 backdrop-blur-md shadow-sm">
        <nav className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex justify-between items-center h-16">
            {/* Logo */}
            <Link href="/dashboard" className="flex items-center gap-2.5 group">
              <div className="w-9 h-9 bg-primary rounded-xl flex items-center justify-center shadow-lg shadow-primary/20 group-hover:scale-105 transition-transform overflow-hidden">
                <img src="/apple-touch-icon.png" alt="DeltaUp Logo" className="w-full h-full object-cover" />
              </div>
              <span className="font-bold text-xl tracking-tight">DeltaUp</span>
            </Link>

            {/* Desktop Navigation */}
            <div className="hidden md:flex items-center gap-2">
              {navItems.map((item) => (
                <Link
                  key={item.href}
                  href={item.href}
                  className={`px-4 py-2 rounded-xl text-sm font-medium transition-all duration-200 flex items-center gap-2 ${router.pathname === item.href
                      ? 'bg-primary text-primary-foreground shadow-md shadow-primary/20'
                      : 'text-muted hover:text-foreground hover:bg-surface-highlight'
                    }`}
                >
                  <span>{item.icon}</span>
                  {item.label}
                </Link>
              ))}
            </div>

            {/* Right Side Actions */}
            <div className="hidden md:flex items-center gap-3">
              <ThemeToggle />
              
              {isAuth && user && (
                <Link href="/profile" className="flex items-center gap-2 px-3 py-2 rounded-xl hover:bg-surface-highlight transition-colors border border-transparent hover:border-border">
                  <div className="w-8 h-8 rounded-full bg-surface-highlight flex items-center justify-center text-primary font-semibold text-sm border border-border">
                    {user.username?.charAt(0).toUpperCase() || 'U'}
                  </div>
                  <span className="text-sm font-medium">{user.username || 'User'}</span>
                </Link>
              )}
              <button
                onClick={logout}
                className="px-4 py-2 text-sm font-medium text-muted hover:text-danger border border-border hover:border-danger/30 rounded-xl transition-all hover:bg-danger/5"
              >
                Logout
              </button>
            </div>

            {/* Mobile Menu Button */}
            <div className="flex items-center gap-2 md:hidden">
              <ThemeToggle />
              <button
                onClick={() => setIsMenuOpen(!isMenuOpen)}
                className="p-2 rounded-xl hover:bg-surface-highlight text-muted hover:text-foreground transition-colors"
                aria-label="Toggle menu"
              >
                <svg className={`w-6 h-6 transition-transform ${isMenuOpen ? 'rotate-90' : ''}`} fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  {isMenuOpen ? (
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                  ) : (
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 6h16M4 12h16M4 18h16" />
                  )}
                </svg>
              </button>
            </div>
          </div>

          {/* Mobile Navigation */}
          {isMenuOpen && (
            <div className="md:hidden border-t border-border py-3 space-y-1 animate-slideUp bg-surface/95 backdrop-blur-xl absolute top-16 left-0 right-0 shadow-xl px-4 pb-4">
              {navItems.map((item) => (
                <Link
                  key={item.href}
                  href={item.href}
                  onClick={() => setIsMenuOpen(false)}
                  className={`block px-4 py-3 rounded-xl text-sm font-medium transition-all ${router.pathname === item.href
                      ? 'bg-primary text-primary-foreground shadow-md'
                      : 'text-muted hover:text-foreground hover:bg-surface-highlight'
                    }`}
                >
                  <span className="mr-3">{item.icon}</span>
                  {item.label}
                </Link>
              ))}
              <div className="h-px bg-border my-2"></div>
              <Link
                href="/profile"
                onClick={() => setIsMenuOpen(false)}
                className="block px-4 py-3 rounded-xl text-sm font-medium text-muted hover:text-foreground hover:bg-surface-highlight"
              >
                Profile
              </Link>
              <button
                onClick={() => {
                  setIsMenuOpen(false)
                  logout()
                }}
                className="w-full text-left px-4 py-3 rounded-xl text-sm font-medium text-danger hover:bg-danger/10"
              >
                Logout
              </button>
            </div>
          )}
        </nav>
      </header>

      {/* Main Content */}
      <main className="flex-grow">
        {children}
      </main>

      {/* Footer */}
      <footer className="border-t border-border bg-surface mt-auto">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
          <div className="flex flex-col md:flex-row justify-between items-center gap-4">
            <div className="flex items-center gap-2">
              <div className="w-6 h-6 bg-primary rounded-lg flex items-center justify-center overflow-hidden">
                <img src="/apple-touch-icon.png" alt="DeltaUp Logo" className="w-full h-full object-cover" />
              </div>
              <span className="font-semibold text-foreground">DeltaUp</span>
            </div>

            <div className="text-sm text-muted">
              © 2025 DeltaUp. Modern Fintech Platform.
            </div>

            <div className="flex gap-4 text-sm">
              <a href="#" className="text-muted hover:text-primary transition-colors">Privacy</a>
              <a href="#" className="text-muted hover:text-primary transition-colors">Terms</a>
              <a href="#" className="text-muted hover:text-primary transition-colors">Support</a>
            </div>
          </div>
        </div>
      </footer>
    </div>
  )
}