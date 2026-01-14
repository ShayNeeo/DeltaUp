import { useState, useRef, useEffect } from 'react'
import { OpenRouter } from '@openrouter/sdk'
import { getUser, transactionAPI } from '@/lib/api'
import { externalAPI } from '@/lib/external'

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
- Market Watch: Real-time crypto prices (powered by CoinGecko API)

API:
- Internal: /auth/register, /auth/login, /transfer, /qr-payment, /balance, /transactions
- External: CoinGecko API for market data

Env: NEXT_PUBLIC_API_URL, DATABASE_URL, JWT_SECRET, OPENROUTER_API_KEY

How-To:
- Transfer: Go to "Transfer" page, enter recipient account # & amount.
- Find Account #: Visible on Dashboard and Profile pages.
- Register: Use "Register" link on the login page.
- QR Pay: "QR Payment" -> "Scan" to pay or "Generate" to receive.
- Market Prices: View live crypto rates in the "Market Watch" section on the Dashboard.
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

    // --- TOOL EXECUTION LOGIC ---
    const executeTool = async (toolName: string, args: string): Promise<string> => {
        console.log(`Executing tool: ${toolName} with args: ${args}`)
        try {
            switch (toolName) {
                case 'get_balance':
                    const balance = await transactionAPI.getBalance()
                    return JSON.stringify(balance)
                case 'get_transactions':
                    const transactions = await transactionAPI.getTransactions()
                    // Limit to last 5 to save tokens
                    const recent = Array.isArray(transactions) ? transactions.slice(0, 5) : []
                    return JSON.stringify(recent)
                case 'get_market_prices':
                    const prices = await externalAPI.getMarketData()
                    return JSON.stringify(prices)
                default:
                    return `Error: Tool ${toolName} not found.`
            }
        } catch (error: any) {
            return `Error executing ${toolName}: ${error.message}`
        }
    }

    const sendMessage = async () => {
        if (!input.trim() || loading) return

        const userMessage: Message = { role: 'user', content: input }
        
        // We add the user message to the UI state immediately
        const newMessages = [...messages, userMessage]
        setMessages(newMessages)
        setInput('')
        setLoading(true)

        try {
            const apiKey = process.env.NEXT_PUBLIC_OPENROUTER_API_KEY || ''
            if (!apiKey) throw new Error('API Key missing')

            const openrouter = new OpenRouter({ apiKey })

            // Context: Last 20 messages to keep context window manageable
            const history = newMessages.length > 20 ? newMessages.slice(newMessages.length - 20) : newMessages

            const systemContent = `

You are a helpful assistant for DeltaUp.
Current User: ${currentUser?.username || 'Guest'}
Account Number: ${currentUser?.account_number || 'N/A'}

Knowledge Base:
${KNOWLEDGE_BASE}

--- TOOL USE INSTRUCTIONS ---
You have access to the following tools to fetch real-time data. 
Use them when the user asks for current balance, recent transactions, or crypto prices.

Tools:
- get_balance: Returns the user's current account balance.
- get_transactions: Returns the user's recent transaction history.
- get_market_prices: Returns current cryptocurrency prices (Bitcoin, Ethereum, etc.) from CoinGecko.

To use a tool, your response must be ONLY the following format:
TOOL_CALL: <tool_name>

Example:
User: "What is my balance?"
Assistant: TOOL_CALL: get_balance

User: "Show my last transactions"
Assistant: TOOL_CALL: get_transactions

User: "What is the price of Bitcoin?"
Assistant: TOOL_CALL: get_market_prices

After the tool result is provided by the system, you will answer the user's question naturally.
`
            const contextMessage: Message = { role: 'system', content: systemContent }

            // --- FIRST LLM CALL ---
            const completion = await openrouter.chat.send({
                model: 'xiaomi/mimo-v2-flash:free',
                messages: [
                    contextMessage,
                    ...history.map(m => ({ role: m.role as 'user' | 'assistant' | 'system', content: m.content }))
                ]
            })

            let responseContent = completion.choices[0]?.message?.content || ''
            
            // Check for Tool Call
            if (responseContent.includes('TOOL_CALL:')) {
                const toolName = responseContent.split('TOOL_CALL:')[1].trim()
                
                // Show a "Thinking..." state or "Fetching data..." in the UI if desired
                // For now, we'll just execute silently and then reply
                
                const toolResult = await executeTool(toolName, '')
                
                // Add the tool execution and result to history (invisible to user in this simple UI, but visible to LLM)
                // Actually, let's append it as a System message for the NEXT call
                const updatedHistory = [
                    ...history,
                    { role: 'assistant', content: `TOOL_CALL: ${toolName}` } as Message,
                    { role: 'system', content: `Tool '${toolName}' Result: ${toolResult}` } as Message
                ]

                // --- SECOND LLM CALL (With Data) ---
                const finalCompletion = await openrouter.chat.send({
                    model: 'xiaomi/mimo-v2-flash:free',
                    messages: [
                        contextMessage,
                        ...updatedHistory.map(m => ({ role: m.role as 'user' | 'assistant' | 'system', content: m.content }))
                    ]
                })

                responseContent = finalCompletion.choices[0]?.message?.content || "I couldn't process the tool result."
            }

            // Update UI with final response
            setMessages(prev => [...prev, { role: 'assistant', content: responseContent }])

        } catch (error: any) {
            console.error('Chatbot error:', error)
            setMessages(prev => [...prev, {
                role: 'assistant',
                content: 'Sorry, I encountered an error connecting to the AI service.'
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
        <div className="fixed bottom-24 right-6 w-96 h-[600px] bg-surface rounded-2xl shadow-2xl border border-border flex flex-col z-50 animate-slideUp">
            {/* Header */}
            <div className="bg-primary text-primary-foreground p-4 rounded-t-2xl flex items-center justify-between">
                <div className="flex items-center gap-3">
                    <div className="w-10 h-10 bg-primary-foreground/20 rounded-full flex items-center justify-center">
                        <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 10h.01M12 10h.01M16 10h.01M9 16H5a2 2 0 01-2-2V6a2 2 0 012-2h14a2 2 0 012 2v8a2 2 0 01-2 2h-5l-5 5v-5z" />
                        </svg>
                    </div>
                    <div>
                        <h3 className="font-semibold">DeltaUp Assistant</h3>
                        <div className="flex items-center gap-1">
                            <div className="w-2 h-2 bg-emerald-400 rounded-full animate-pulse"></div>
                            <p className="text-xs text-primary-foreground/90">Online</p>
                        </div>
                    </div>
                </div>
                <div className="flex items-center gap-2">
                    <button
                        onClick={handleEndChat}
                        className="px-3 py-1 bg-primary-foreground/20 hover:bg-primary-foreground/30 rounded-lg text-xs font-medium transition-colors border border-primary-foreground/10"
                        title="End Chat and Clear History"
                    >
                        End Chat
                    </button>
                    <button
                        onClick={onClose}
                        className="p-1 hover:bg-primary-foreground/20 rounded-full transition-colors"
                    >
                        <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                        </svg>
                    </button>
                </div>
            </div>

            {/* Messages */}
            <div className="flex-1 overflow-y-auto p-4 space-y-4 bg-background">
                {messages.map((msg, idx) => (
                    <div key={idx} className={`flex ${msg.role === 'user' ? 'justify-end' : 'justify-start'}`}>
                        <div
                            className={`max-w-[85%] p-3.5 rounded-2xl shadow-sm ${msg.role === 'user'
                                ? 'bg-primary text-primary-foreground rounded-br-none'
                                : 'bg-surface-highlight text-foreground border border-border rounded-bl-none'
                                }`}
                        >
                            <p className="text-sm whitespace-pre-wrap leading-relaxed font-sans">{msg.content}</p>
                        </div>
                    </div>
                ))}
                {loading && (
                    <div className="flex justify-start">
                        <div className="bg-surface-highlight p-3 rounded-2xl rounded-bl-none border border-border">
                            <div className="flex gap-1.5">
                                <div className="w-2 h-2 bg-muted rounded-full animate-bounce" style={{ animationDelay: '0ms' }}></div>
                                <div className="w-2 h-2 bg-muted rounded-full animate-bounce" style={{ animationDelay: '150ms' }}></div>
                                <div className="w-2 h-2 bg-muted rounded-full animate-bounce" style={{ animationDelay: '300ms' }}></div>
                            </div>
                        </div>
                    </div>
                )}
                <div ref={messagesEndRef} />
            </div>

            {/* Input */}
            <div className="p-4 border-t border-border bg-surface rounded-b-2xl">
                <div className="flex gap-2">
                    <input
                        type="text"
                        value={input}
                        onChange={(e) => setInput(e.target.value)}
                        onKeyPress={handleKeyPress}
                        placeholder={`Ask as ${currentUser?.username || 'Guest'}...`}
                        className="flex-1 px-4 py-2.5 border border-border rounded-xl focus:outline-none focus:ring-2 focus:ring-primary/50 focus:border-primary bg-background text-foreground shadow-sm transition-all"
                        disabled={loading}
                    />
                    <button
                        onClick={sendMessage}
                        disabled={loading || !input.trim()}
                        className="p-2.5 bg-primary text-primary-foreground rounded-xl hover:bg-primary/90 transition-all disabled:opacity-50 disabled:cursor-not-allowed shadow-md hover:shadow-lg active:scale-95 transform"
                    >
                        <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 19l9 2-9-18-9 18 9-2zm0 0v-8" />
                        </svg>
                    </button>
                </div>
                <div className="mt-2 text-center">
                    <span className="text-[10px] text-muted">Context optimized • Powered by OpenRouter</span>
                </div>
            </div>
        </div>
    )
}
