import React, { useState } from 'react'

const SUGGESTED = [
  "How do I reset my password?",
  "My payment failed, what should I do?",
  "I received a damaged item",
  "How do I cancel my subscription?",
  "What plans are available?",
  "How do I track my order?",
]

export function SuggestedQuestions({ onSelect }) {
  return (
    <div style={{ display: 'flex', flexWrap: 'wrap', gap: '8px', marginTop: '12px' }}>
      {SUGGESTED.map((q) => (
        <button
          key={q}
          onClick={() => onSelect(q)}
          style={{
            background: 'var(--accent-dim)',
            border: '1px solid var(--border2)',
            borderRadius: '20px',
            color: 'var(--accent2)',
            padding: '6px 14px',
            fontSize: '13px',
            cursor: 'pointer',
            fontFamily: 'var(--font)',
            transition: 'all 0.15s',
          }}
          onMouseEnter={e => {
            e.target.style.background = 'var(--accent-glow)'
            e.target.style.borderColor = 'var(--accent)'
          }}
          onMouseLeave={e => {
            e.target.style.background = 'var(--accent-dim)'
            e.target.style.borderColor = 'var(--border2)'
          }}
        >
          {q}
        </button>
      ))}
    </div>
  )
}

export function Message({ msg }) {
  const isUser = msg.role === 'user'
  const [showSources, setShowSources] = useState(false)

  return (
    <div
      style={{
        display: 'flex',
        flexDirection: isUser ? 'row-reverse' : 'row',
        gap: '12px',
        alignItems: 'flex-start',
        animation: 'fadeUp 0.3s ease',
        marginBottom: '20px',
      }}
    >
      {/* Avatar */}
      <div style={{
        width: '36px', height: '36px', borderRadius: '50%', flexShrink: 0,
        background: isUser ? 'var(--accent)' : 'var(--bg3)',
        border: isUser ? 'none' : '1px solid var(--border2)',
        display: 'flex', alignItems: 'center', justifyContent: 'center',
        fontSize: '14px', fontWeight: 600, color: isUser ? '#fff' : 'var(--accent2)',
      }}>
        {isUser ? 'U' : 'AI'}
      </div>

      {/* Bubble */}
      <div style={{ maxWidth: '72%', display: 'flex', flexDirection: 'column', gap: '6px' }}>
        <div style={{
          background: isUser ? 'var(--accent)' : 'var(--bg3)',
          border: isUser ? 'none' : '1px solid var(--border)',
          borderRadius: isUser ? '18px 4px 18px 18px' : '4px 18px 18px 18px',
          padding: '12px 16px',
          color: isUser ? '#fff' : 'var(--text)',
          fontSize: '14.5px',
          lineHeight: 1.65,
        }}>
          {msg.content}
        </div>

        {/* Metadata row */}
        {!isUser && msg.meta && (
          <div style={{ display: 'flex', alignItems: 'center', gap: '10px', paddingLeft: '4px' }}>
            <ConfidenceBadge level={msg.meta.confidence} />
            <span style={{ color: 'var(--text3)', fontSize: '11px', fontFamily: 'var(--mono)' }}>
              {msg.meta.response_time_ms}ms
            </span>
            {msg.meta.sources?.length > 0 && (
              <button
                onClick={() => setShowSources(s => !s)}
                style={{
                  background: 'none', border: 'none', color: 'var(--accent2)',
                  fontSize: '11px', cursor: 'pointer', fontFamily: 'var(--font)',
                  padding: 0,
                }}
              >
                {showSources ? '▲ Hide sources' : `▼ ${msg.meta.sources.length} source(s)`}
              </button>
            )}
          </div>
        )}

        {/* Sources drawer */}
        {showSources && msg.meta?.sources && (
          <div style={{
            background: 'var(--bg2)', border: '1px solid var(--border)',
            borderRadius: 'var(--radius-sm)', padding: '10px 14px',
            display: 'flex', flexDirection: 'column', gap: '8px',
          }}>
            <span style={{ fontSize: '11px', color: 'var(--text3)', fontWeight: 500, letterSpacing: '0.05em', textTransform: 'uppercase' }}>
              Retrieved context
            </span>
            {msg.meta.sources.map((s, i) => (
              <p key={i} style={{ fontSize: '12px', color: 'var(--text2)', fontFamily: 'var(--mono)', lineHeight: 1.5, borderLeft: '2px solid var(--accent-dim)', paddingLeft: '10px' }}>
                {s}
              </p>
            ))}
          </div>
        )}
      </div>
    </div>
  )
}

function ConfidenceBadge({ level }) {
  const map = {
    high:   { color: 'var(--success)', label: 'High confidence' },
    medium: { color: 'var(--warning)', label: 'Medium confidence' },
    low:    { color: 'var(--danger)',  label: 'Low confidence' },
  }
  const { color, label } = map[level] || map.low
  return (
    <span style={{
      display: 'inline-flex', alignItems: 'center', gap: '4px',
      fontSize: '11px', color,
    }}>
      <span style={{ width: '6px', height: '6px', borderRadius: '50%', background: color }} />
      {label}
    </span>
  )
}

export function TypingIndicator() {
  return (
    <div style={{ display: 'flex', gap: '12px', alignItems: 'flex-start', marginBottom: '20px' }}>
      <div style={{
        width: '36px', height: '36px', borderRadius: '50%',
        background: 'var(--bg3)', border: '1px solid var(--border2)',
        display: 'flex', alignItems: 'center', justifyContent: 'center',
        fontSize: '14px', color: 'var(--accent2)', flexShrink: 0,
      }}>AI</div>
      <div style={{
        background: 'var(--bg3)', border: '1px solid var(--border)',
        borderRadius: '4px 18px 18px 18px', padding: '14px 18px',
        display: 'flex', gap: '6px', alignItems: 'center',
      }}>
        {[0, 0.2, 0.4].map((delay, i) => (
          <span key={i} style={{
            width: '7px', height: '7px', borderRadius: '50%',
            background: 'var(--accent2)', display: 'block',
            animation: `pulse 1.2s ease-in-out ${delay}s infinite`,
          }} />
        ))}
      </div>
    </div>
  )
}
