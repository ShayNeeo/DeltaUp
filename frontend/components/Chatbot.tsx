import { useState, useRef, useEffect } from 'react'
import { OpenRouter } from '@openrouter/sdk'
import { getUser } from '@/lib/api'

interface Message {
    role: 'user' | 'assistant' | 'system'
    content: string
}

interface ChatbotProps {
    isOpen: boolean
    onClose: () => void
}

// Knowledge base from project documentation
const KNOWLEDGE_BASE = `
Project: DeltaUp (Fintech App)
Created by: Kim UnBok, Pham Quoc Thanh, Pham Hoang Minh
Course: Fintech (Dr. Ho Diep)
School: International University - VNU-HCM

Stack: Next.js 15, Rust/Actix, Postgres, Docker
Auth: JWT (7d expiry)
Features:
- Register/Login: Hash pwd, 12-digit acc #
- Balance: New users get $1000
- Transfers: Instant, ACID compliant
- QR: Generate/Scan (Front/Rear cam support)

API:
- POST /auth/register, /auth/login
- GET /user/profile
- POST /transfer, /qr-payment
- GET /balance, /transactions

Env: NEXT_PUBLIC_API_URL, DATABASE_URL, JWT_SECRET, OPENROUTER_API_KEY

How-To:
- Transfer: Go to "Transfer" page, enter recipient account # & amount.
- Find Account #: Visible on Dashboard and Profile pages.
- Register: Use "Register" link on the login page.
- QR Pay: "QR Payment" -> "Scan" to pay or "Generate" to receive.
- Transactions: History is at bottom of Dashboard.
`

export default function Chatbot({ isOpen, onClose }: ChatbotProps) {
    const [messages, setMessages] = useState<Message[]>([])
    const [input, setInput] = useState('')
    const [loading, setLoading] = useState(false)
    const messagesEndRef = useRef<HTMLDivElement>(null)
    const [currentUser, setCurrentUser] = useState<any>(null)

    const scrollToBottom = () => {
        messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' })
    }

    useEffect(() => {
        if (isOpen) {
            const user = getUser()
            setCurrentUser(user)
            setMessages([{
                role: 'assistant',
                content: user
                    ? `Hi ${user.username}! I'm your DeltaUp assistant. How can I help with account ${user.account_number}?`
                    : 'Hi! I\'m your DeltaUp assistant. Please log in for personalized help.'
            }])
        }
    }, [isOpen])

    useEffect(() => {
        scrollToBottom()
    }, [messages])

    const handleEndChat = () => {
        setMessages([])
        onClose()
    }

    const sendMessage = async () => {
        if (!input.trim() || loading) return

        const userMessage: Message = { role: 'user', content: input }

        // Context Optimization: Keep last 10 messages + system prompt
        // This simulates "auto summarize/load new context" by maintaining a sliding window
        const history = messages.length > 20 ? messages.slice(messages.length - 20) : messages;

        setMessages(prev => [...prev, userMessage])
        setInput('')
        setLoading(true)

        try {
            const apiKey = process.env.NEXT_PUBLIC_OPENROUTER_API_KEY || ''

            if (!apiKey) {
                setMessages(prev => [...prev, {
                    role: 'assistant',
                    content: 'Error: OpenRouter API key not configured.'
                }])
                setLoading(false)
                return
            }

            const openrouter = new OpenRouter({ apiKey })

            // Build personalized system context
            const systemContent = `
You are a helpful assistant for DeltaUp.
Current User: ${currentUser?.username || 'Guest'}
Account Number: ${currentUser?.account_number || 'N/A'}

Knowledge Base:
${KNOWLEDGE_BASE}

Instructions:
- Use the user's name and account number when relevant.
- Keep answers clear and concise (optimize tokens).
- If context is lost, politely ask for clarification.
`
            const contextMessage: Message = {
                role: 'system',
                content: systemContent
            }

            const stream = await openrouter.chat.send({
                model: 'xiaomi/mimo-v2-flash:free',
                messages: [
                    contextMessage,
                    ...history.map(m => ({ role: m.role as 'user' | 'assistant' | 'system', content: m.content })),
                    { role: 'user', content: input }
                ],
                stream: true,
                streamOptions: {
                    includeUsage: true
                }
            })

            // Initialize an empty assistant message to stream into
            setMessages(prev => [...prev, { role: 'assistant', content: '' }])

            let response = ''
            for await (const chunk of stream) {
                const content = chunk.choices[0]?.delta?.content
                if (content) {
                    response += content
                    setMessages(prev => {
                        const newMessages = [...prev]
                        const lastMsg = newMessages[newMessages.length - 1]
                        if (lastMsg && lastMsg.role === 'assistant') {
                            newMessages[newMessages.length - 1] = {
                                ...lastMsg,
                                content: response
                            }
                        }
                        return newMessages
                    })
                }
            }

            if (!response) {
                setMessages(prev => [...prev, {
                    role: 'assistant',
                    content: 'I apologize, but I didn\'t receive a response.'
                }])
            }

        } catch (error: any) {
            console.error('Chatbot error:', error)
            setMessages(prev => [...prev, {
                role: 'assistant',
                content: 'Sorry, I encountered an error.'
            }])
        } finally {
            setLoading(false)
        }
    }

    const handleKeyPress = (e: React.KeyboardEvent) => {
        if (e.key === 'Enter' && !e.shiftKey) {
            e.preventDefault()
            sendMessage()
        }
    }

    if (!isOpen) return null

    return (
        <div className="fixed bottom-24 right-6 w-96 h-[600px] bg-white rounded-2xl shadow-2xl border border-slate-200 flex flex-col z-50 animate-slideUp">
            {/* Header */}
            <div className="bg-gradient-to-r from-purple-600 to-pink-600 text-white p-4 rounded-t-2xl flex items-center justify-between">
                <div className="flex items-center gap-3">
                    <div className="w-10 h-10 bg-white/20 rounded-full flex items-center justify-center">
                        <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 10h.01M12 10h.01M16 10h.01M9 16H5a2 2 0 01-2-2V6a2 2 0 012-2h14a2 2 0 012 2v8a2 2 0 01-2 2h-5l-5 5v-5z" />
                        </svg>
                    </div>
                    <div>
                        <h3 className="font-semibold">DeltaUp Assistant</h3>
                        <div className="flex items-center gap-1">
                            <div className="w-2 h-2 bg-green-400 rounded-full animate-pulse"></div>
                            <p className="text-xs text-white/90">Online</p>
                        </div>
                    </div>
                </div>
                <div className="flex items-center gap-2">
                    <button
                        onClick={handleEndChat}
                        className="px-3 py-1 bg-white/20 hover:bg-white/30 rounded-lg text-xs font-medium transition-colors border border-white/10"
                        title="End Chat and Clear History"
                    >
                        End Chat
                    </button>
                    <button
                        onClick={onClose}
                        className="p-1 hover:bg-white/20 rounded-full transition-colors"
                    >
                        <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                        </svg>
                    </button>
                </div>
            </div>

            {/* Messages */}
            <div className="flex-1 overflow-y-auto p-4 space-y-4">
                {messages.map((msg, idx) => (
                    <div key={idx} className={`flex ${msg.role === 'user' ? 'justify-end' : 'justify-start'}`}>
                        <div
                            className={`max-w-[85%] p-3.5 rounded-2xl shadow-sm ${msg.role === 'user'
                                ? 'bg-gradient-to-r from-purple-600 to-pink-600 text-white rounded-br-none'
                                : 'bg-slate-100 text-slate-800 rounded-bl-none'
                                }`}
                        >
                            <p className="text-sm whitespace-pre-wrap leading-relaxed">{msg.content}</p>
                        </div>
                    </div>
                ))}
                {loading && (
                    <div className="flex justify-start">
                        <div className="bg-slate-100 p-3 rounded-2xl rounded-bl-none">
                            <div className="flex gap-1.5">
                                <div className="w-2 h-2 bg-slate-400 rounded-full animate-bounce" style={{ animationDelay: '0ms' }}></div>
                                <div className="w-2 h-2 bg-slate-400 rounded-full animate-bounce" style={{ animationDelay: '150ms' }}></div>
                                <div className="w-2 h-2 bg-slate-400 rounded-full animate-bounce" style={{ animationDelay: '300ms' }}></div>
                            </div>
                        </div>
                    </div>
                )}
                <div ref={messagesEndRef} />
            </div>

            {/* Input */}
            <div className="p-4 border-t border-slate-200 bg-slate-50/50 rounded-b-2xl">
                <div className="flex gap-2">
                    <input
                        type="text"
                        value={input}
                        onChange={(e) => setInput(e.target.value)}
                        onKeyPress={handleKeyPress}
                        placeholder={`Ask as ${currentUser?.username || 'Guest'}...`}
                        className="flex-1 px-4 py-2.5 border border-slate-300 rounded-xl focus:outline-none focus:ring-2 focus:ring-purple-500/50 focus:border-purple-500 bg-white shadow-sm transition-all"
                        disabled={loading}
                    />
                    <button
                        onClick={sendMessage}
                        disabled={loading || !input.trim()}
                        className="p-2.5 bg-gradient-to-r from-purple-600 to-pink-600 text-white rounded-xl hover:from-purple-700 hover:to-pink-700 transition-all disabled:opacity-50 disabled:cursor-not-allowed shadow-md hover:shadow-lg active:scale-95 transform"
                    >
                        <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 19l9 2-9-18-9 18 9-2zm0 0v-8" />
                        </svg>
                    </button>
                </div>
                <div className="mt-2 text-center">
                    <span className="text-[10px] text-slate-400">Context optimized • Powered by OpenRouter</span>
                </div>
            </div>

            <style jsx>{`
        @keyframes slideUp {
          from {
            opacity: 0;
            transform: translateY(20px) scale(0.95);
          }
          to {
            opacity: 1;
            transform: translateY(0) scale(1);
          }
        }
        .animate-slideUp {
          animation: slideUp 0.3s cubic-bezier(0.16, 1, 0.3, 1);
        }
      `}</style>
        </div>
    )
}
