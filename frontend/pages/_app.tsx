import '@/styles/globals.css'
import type { AppProps } from 'next/app'
import { Plus_Jakarta_Sans, JetBrains_Mono } from 'next/font/google'
import Layout from '@/components/Layout'
import PageTransition from '@/components/PageTransition'
import ChatbotBubble from '@/components/ChatbotBubble'
import { ThemeProvider } from '@/components/ThemeProvider'

const plusJakarta = Plus_Jakarta_Sans({
  subsets: ['latin'],
  variable: '--font-sans',
  display: 'swap',
})

const jetbrainsMono = JetBrains_Mono({
  subsets: ['latin'],
  variable: '--font-mono',
  display: 'swap',
})

export default function App({ Component, pageProps }: AppProps) {
  return (
    <ThemeProvider>
      <main className={`${plusJakarta.variable} ${jetbrainsMono.variable} font-sans antialiased`}>
        <PageTransition>
          <Layout>
            <Component {...pageProps} />
            <ChatbotBubble />
          </Layout>
        </PageTransition>
      </main>
    </ThemeProvider>
  )
}
