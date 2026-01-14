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
      
      {/* Logo */}
      <div className="flex flex-col items-center gap-4">
        <div className="relative w-20 h-20 bg-surface rounded-2xl flex items-center justify-center shadow-lg shadow-primary/20 overflow-hidden">
          <img src="/apple-touch-icon.png" alt="DeltaUp Logo" className="w-full h-full object-cover" />
        </div>

        {/* Branding */}
        <div className="text-center">
          <h3 className="text-sm font-medium text-foreground tracking-widest uppercase">DeltaUp</h3>
        </div>
      </div>

      {/* Message */}
      <div className="text-center max-w-xs">
        <p className="text-sm text-muted font-medium">{message}</p>
        <p className="text-xs text-muted/70 mt-1">Setting everything up for you</p>
      </div>

      {/* Minimalist Progress Bar */}
      <div className="w-48 h-0.5 bg-surface-highlight rounded-full overflow-hidden">
        <div 
          className="h-full bg-primary rounded-full transition-all duration-300 ease-out"
          style={{ width: `${progress}%` }}
        ></div>
      </div>

      {/* Progress percentage (optional) */}
      <p className="text-xs text-muted">{progress}%</p>
    </div>
  )

  if (fullScreen) {
    return (
      <div className="fixed inset-0 bg-background z-50 flex items-center justify-center transition-opacity duration-300">
        {content}
      </div>
    )
  }

  return (
    <div className="flex items-center justify-center min-h-[60vh] bg-background">
      {content}
    </div>
  )
}

