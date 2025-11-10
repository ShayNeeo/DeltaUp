import React, { useState, useEffect } from 'react'

interface PreloaderProps {
  message?: string
  fullScreen?: boolean
  minDuration?: number
}

export default function Preloader({ 
  message = 'Processing...', 
  fullScreen = false,
  minDuration = 1200
}: PreloaderProps) {
  const [visible, setVisible] = useState(false)
  const [progress, setProgress] = useState(0)

  useEffect(() => {
    // Ensure visibility
    const showTimer = setTimeout(() => setVisible(true), 50)
    
    // Simulate progress with easing
    let current = 0
    const startTime = Date.now()
    const progressInterval = setInterval(() => {
      const elapsed = Date.now() - startTime
      const ratio = Math.min(elapsed / minDuration, 1)
      
      // Ease-out cubic curve for more natural progress
      current = 100 * (1 - Math.pow(1 - ratio, 3))
      setProgress(Math.floor(current))
      
      if (ratio >= 1) {
        clearInterval(progressInterval)
        setProgress(100)
      }
    }, 30)

    return () => {
      clearTimeout(showTimer)
      clearInterval(progressInterval)
    }
  }, [minDuration])

  const content = (
    <div className={`flex flex-col items-center justify-center gap-8 transition-all duration-500 ${visible ? 'opacity-100 scale-100' : 'opacity-0 scale-95'}`}>
      
      {/* Minimalist Animated Logo */}
      <div className="flex flex-col items-center gap-4">
        <div className="relative w-16 h-16">
          {/* Outer rotating ring */}
          <div className="absolute inset-0 rounded-full border-2 border-slate-200 animate-spin" style={{ animationDuration: '3s' }}></div>
          
          {/* Inner pulsing core */}
          <div className="absolute inset-3 rounded-full bg-gradient-to-br from-blue-500 to-cyan-500 animate-pulse"></div>
          
          {/* Center dot */}
          <div className="absolute inset-0 flex items-center justify-center">
            <div className="w-2 h-2 bg-white rounded-full"></div>
          </div>
        </div>

        {/* Branding */}
        <div className="text-center">
          <h3 className="text-sm font-medium text-slate-700 tracking-widest uppercase">DeltaUp</h3>
        </div>
      </div>

      {/* Message */}
      <div className="text-center max-w-xs">
        <p className="text-sm text-slate-600 font-medium">{message}</p>
        <p className="text-xs text-slate-400 mt-1">Setting everything up for you</p>
      </div>

      {/* Minimalist Progress Bar */}
      <div className="w-48 h-0.5 bg-slate-100 rounded-full overflow-hidden">
        <div 
          className="h-full bg-gradient-to-r from-blue-500 via-cyan-500 to-blue-500 rounded-full transition-all duration-300 ease-out"
          style={{ width: `${progress}%` }}
        ></div>
      </div>

      {/* Progress percentage (optional) */}
      <p className="text-xs text-slate-400">{progress}%</p>
    </div>
  )

  if (fullScreen) {
    return (
      <div className="fixed inset-0 bg-gradient-to-br from-white via-slate-50 to-white z-50 flex items-center justify-center transition-opacity duration-300">
        {content}
      </div>
    )
  }

  return (
    <div className="flex items-center justify-center min-h-[60vh] bg-gradient-to-br from-slate-50 via-white to-slate-50">
      {content}
    </div>
  )
}

