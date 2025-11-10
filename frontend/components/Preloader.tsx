import React, { useState, useEffect } from 'react'

interface PreloaderProps {
  message?: string
  fullScreen?: boolean
}

export default function Preloader({ 
  message = 'Loading...', 
  fullScreen = false
}: PreloaderProps) {
  const [visible, setVisible] = useState(false)

  useEffect(() => {
    // Small delay to ensure smooth fade-in
    const timer = setTimeout(() => setVisible(true), 50)
    return () => clearTimeout(timer)
  }, [])

  const content = (
    <div className={`flex flex-col items-center justify-center gap-6 transition-opacity duration-300 ${visible ? 'opacity-100' : 'opacity-0'}`}>
      {/* Logo Animation */}
      <div className="relative w-20 h-20">
        <div className="absolute inset-0 bg-gradient-to-r from-blue-600 to-cyan-600 rounded-full animate-pulse"></div>
        <div className="absolute inset-2 bg-white rounded-full flex items-center justify-center">
          <svg className="w-8 h-8 text-blue-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 10V3L4 14h7v7l9-11h-7z" />
          </svg>
        </div>
      </div>

      {/* Loading Text */}
      <div className="text-center">
        <h2 className="text-xl font-semibold text-slate-900 mb-2">{message}</h2>
        <p className="text-sm text-slate-500">Please wait...</p>
      </div>

      {/* Animated Dots */}
      <div className="flex gap-2">
        <div className="w-2 h-2 bg-blue-600 rounded-full animate-bounce" style={{ animationDelay: '0s' }}></div>
        <div className="w-2 h-2 bg-cyan-600 rounded-full animate-bounce" style={{ animationDelay: '0.15s' }}></div>
        <div className="w-2 h-2 bg-blue-500 rounded-full animate-bounce" style={{ animationDelay: '0.3s' }}></div>
      </div>

      {/* Progress Bar */}
      <div className="w-48 h-1 bg-slate-200 rounded-full overflow-hidden">
        <div className="h-full bg-gradient-to-r from-blue-600 to-cyan-600 rounded-full animate-pulse"></div>
      </div>
    </div>
  )

  if (fullScreen) {
    return (
      <div className="fixed inset-0 bg-white z-50 flex items-center justify-center transition-opacity duration-300">
        {content}
      </div>
    )
  }

  return (
    <div className="flex items-center justify-center min-h-[60vh] bg-gradient-to-br from-slate-50 via-white to-slate-50 transition-opacity duration-300">
      {content}
    </div>
  )
}

