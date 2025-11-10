import React, { useState, useEffect } from 'react'
import { useRouter } from 'next/router'
import Preloader from './Preloader'

export default function PageTransition({ children }: { children: React.ReactNode }) {
  const router = useRouter()
  const [isLoading, setIsLoading] = useState(false)
  const [currentMessage, setCurrentMessage] = useState('Processing...')

  useEffect(() => {
    const messages = [
      'Processing...',
      'Loading your data...',
      'Preparing interface...',
      'Almost there...',
    ]

    const handleStart = () => {
      setIsLoading(true)
      setCurrentMessage(messages[Math.floor(Math.random() * messages.length)])
    }

    const handleStop = () => {
      // Keep showing for at least 1.2 seconds for smooth UX
      setTimeout(() => setIsLoading(false), 1200)
    }

    router.events.on('routeChangeStart', handleStart)
    router.events.on('routeChangeComplete', handleStop)
    router.events.on('routeChangeError', handleStop)

    return () => {
      router.events.off('routeChangeStart', handleStart)
      router.events.off('routeChangeComplete', handleStop)
      router.events.off('routeChangeError', handleStop)
    }
  }, [router.events])

  return (
    <>
      {isLoading && (
        <Preloader fullScreen message={currentMessage} minDuration={1200} />
      )}
      {children}
    </>
  )
}

