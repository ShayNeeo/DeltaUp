import React from 'react'

interface PreloaderProps {
  message?: string
  fullScreen?: boolean
}

export default function Preloader({ message = 'Loading...', fullScreen = false }: PreloaderProps) {
  const content = (
    <div className="flex flex-col items-center justify-center gap-6">
      {/* Logo Animation */}
      <div className="relative w-20 h-20">
        <div className="absolute inset-0 bg-gradient-to-r from-blue-600 to-cyan-600 rounded-full animate-pulse"></div>
        <div className="absolute inset-2 bg-white rounded-full flex items-center justify-center">
          <span className="text-3xl font-bold bg-gradient-to-r from-blue-600 to-cyan-600 bg-clip-text text-transparent">
            Δ
          </span>
        </div>
      </div>

      {/* Loading Text */}
      <div className="text-center">
        <h2 className="text-xl font-bold text-slate-800 mb-2">{message}</h2>
        <p className="text-sm text-slate-500">DeltaUp is preparing your experience...</p>
      </div>

      {/* Animated Dots */}
      <div className="flex gap-2">
        <div className="w-2 h-2 bg-blue-600 rounded-full animate-bounce" style={{ animationDelay: '0s' }}></div>
        <div className="w-2 h-2 bg-cyan-600 rounded-full animate-bounce" style={{ animationDelay: '0.1s' }}></div>
        <div className="w-2 h-2 bg-blue-500 rounded-full animate-bounce" style={{ animationDelay: '0.2s' }}></div>
      </div>

      {/* Progress Bar */}
      <div className="w-32 h-1 bg-slate-200 rounded-full overflow-hidden">
        <div className="h-full bg-gradient-to-r from-blue-600 to-cyan-600 rounded-full animate-pulse"></div>
      </div>
    </div>
  )

  if (fullScreen) {
    return (
      <div className="fixed inset-0 bg-white z-50 flex items-center justify-center">
        {content}
      </div>
    )
  }

  return (
    <div className="flex items-center justify-center min-h-screen bg-gradient-to-br from-slate-50 to-slate-100">
      {content}
    </div>
  )
}

