import React, { useState, useEffect, useRef } from 'react'
import { v4 as uuidv4 } from 'uuid'
import { sendMessage, fetchHealth, fetchStats, clearSession } from './hooks/useApi'
import { Message, SuggestedQuestions, TypingIndicator } from './components/Message.jsx'
import { StatsSidebar } from './components/StatsSidebar.jsx'

const SESSION_KEY = 'tp_session_id'

function getOrCreateSession() {
  let id = sessionStorage.getItem(SESSION_KEY)
  if (!id) { id = uuidv4(); sessionStorage.setItem(SESSION_KEY, id) }
  return id
}

const WELCOME = {
  role: 'assistant',
  content: "Hi! I'm TP Support AI, your intelligent customer support assistant powered by Retrieval-Augmented Generation. I can help you with billing, account issues, technical support, orders, and more. How can I assist you today?",
  id: 'welcome',
}

export default function App() {
  const [messages, setMessages] = useState([WELCOME])
  const [input, setInput] = useState('')
  const [loading, setLoading] = useState(false)
  const [health, setHealth] = useState(null)
  const [stats, setStats] = useState(null)
  const [sessionId] = useState(getOrCreateSession)
  const [showSuggested, setShowSuggested] = useState(true)
  const bottomRef = useRef(null)
  const inputRef = useRef(null)

  // Fetch health on mount
  useEffect(() => {
    fetchHealth().then(setHealth).catch(() => setHealth(null))
    fetchStats().then(setStats).catch(() => {})
  }, [])

  // Auto-scroll on new messages
  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: 'smooth' })
  }, [messages, loading])

  const handleSend = async (text) => {
    const msg = (text || input).trim()
    if (!msg || loading) return
    setInput('')
    setShowSuggested(false)

    const userMsg = { role: 'user', content: msg, id: uuidv4() }
    setMessages(prev => [...prev, userMsg])
    setLoading(true)

    try {
      const data = await sendMessage(msg, sessionId)
      setMessages(prev => [...prev, {
        role: 'assistant',
        content: data.answer,
        id: uuidv4(),
        meta: {
          sources: data.sources,
          confidence: data.confidence,
          response_time_ms: data.response_time_ms,
        },
      }])
      // Refresh stats
      fetchStats().then(setStats).catch(() => {})
    } catch (err) {
      setMessages(prev => [...prev, {
        role: 'assistant',
        content: '⚠️ Sorry, I couldn\'t reach the server. Please ensure the backend is running on port 8000.',
        id: uuidv4(),
      }])
    } finally {
      setLoading(false)
      setTimeout(() => inputRef.current?.focus(), 100)
    }
  }

  const handleClearSession = async () => {
    await clearSession(sessionId).catch(() => {})
    setMessages([WELCOME])
    setShowSuggested(true)
  }

  const messageCount = messages.filter(m => m.role === 'user').length

  return (
    <div style={{ height: '100vh', display: 'flex', flexDirection: 'column', overflow: 'hidden' }}>
      {/* Header */}
      <header style={{
        background: 'var(--bg2)', borderBottom: '1px solid var(--border)',
        padding: '0 24px', height: '60px', display: 'flex', alignItems: 'center',
        justifyContent: 'space-between', flexShrink: 0,
      }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
          <div style={{
            width: '32px', height: '32px', borderRadius: '8px',
            background: 'var(--accent)', display: 'flex', alignItems: 'center',
            justifyContent: 'center', fontSize: '14px', fontWeight: 700, color: '#fff',
          }}>TP</div>
          <div>
            <div style={{ fontSize: '15px', fontWeight: 600, color: 'var(--text)', lineHeight: 1 }}>
              TP Support AI
            </div>
            <div style={{ fontSize: '11px', color: 'var(--text3)', marginTop: '2px' }}>
              Powered by RAG + Groq LLaMA3
            </div>
          </div>
        </div>
        <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
          <span style={{ width: '7px', height: '7px', borderRadius: '50%', background: health ? 'var(--success)' : 'var(--text3)' }} />
          <span style={{ fontSize: '12px', color: 'var(--text2)' }}>
            {health ? 'Connected' : 'Disconnected'}
          </span>
        </div>
      </header>

      {/* Body */}
      <div style={{ flex: 1, display: 'flex', overflow: 'hidden' }}>
        {/* Chat area */}
        <main style={{ flex: 1, display: 'flex', flexDirection: 'column', overflow: 'hidden' }}>
          {/* Messages */}
          <div style={{ flex: 1, overflowY: 'auto', padding: '24px 28px' }}>
            {messages.map(msg => (
              <Message key={msg.id} msg={msg} />
            ))}
            {loading && <TypingIndicator />}
            {showSuggested && !loading && (
              <div style={{ paddingLeft: '48px' }}>
                <p style={{ fontSize: '12px', color: 'var(--text3)', marginBottom: '4px' }}>
                  Suggested questions
                </p>
                <SuggestedQuestions onSelect={handleSend} />
              </div>
            )}
            <div ref={bottomRef} />
          </div>

          {/* Input */}
          <div style={{
            borderTop: '1px solid var(--border)', padding: '16px 24px',
            background: 'var(--bg2)', flexShrink: 0,
          }}>
            <div style={{ display: 'flex', gap: '10px', alignItems: 'flex-end' }}>
              <textarea
                ref={inputRef}
                value={input}
                onChange={e => setInput(e.target.value)}
                onKeyDown={e => {
                  if (e.key === 'Enter' && !e.shiftKey) { e.preventDefault(); handleSend() }
                }}
                placeholder="Type your question… (Enter to send, Shift+Enter for newline)"
                rows={1}
                style={{
                  flex: 1, background: 'var(--bg3)', border: '1px solid var(--border2)',
                  borderRadius: 'var(--radius)', padding: '12px 16px',
                  color: 'var(--text)', fontFamily: 'var(--font)', fontSize: '14px',
                  resize: 'none', outline: 'none', lineHeight: 1.5,
                  transition: 'border-color 0.15s',
                  maxHeight: '120px',
                }}
                onFocus={e => e.target.style.borderColor = 'var(--accent)'}
                onBlur={e => e.target.style.borderColor = 'var(--border2)'}
              />
              <button
                onClick={() => handleSend()}
                disabled={loading || !input.trim()}
                style={{
                  background: input.trim() && !loading ? 'var(--accent)' : 'var(--bg3)',
                  border: '1px solid var(--border2)', borderRadius: 'var(--radius)',
                  padding: '12px 20px', color: input.trim() && !loading ? '#fff' : 'var(--text3)',
                  cursor: input.trim() && !loading ? 'pointer' : 'not-allowed',
                  fontFamily: 'var(--font)', fontSize: '14px', fontWeight: 500,
                  transition: 'all 0.15s', whiteSpace: 'nowrap',
                }}
              >
                {loading ? '…' : 'Send →'}
              </button>
            </div>
            <div style={{ fontSize: '11px', color: 'var(--text3)', marginTop: '8px', textAlign: 'center' }}>
              Responses generated from the Teleperformance knowledge base via semantic search · Not a real support service
            </div>
          </div>
        </main>

        {/* Sidebar */}
        <StatsSidebar
          health={health}
          stats={stats}
          sessionId={sessionId}
          onClearSession={handleClearSession}
          messageCount={messageCount}
        />
      </div>
    </div>
  )
}
