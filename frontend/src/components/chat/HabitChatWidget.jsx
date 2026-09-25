/**
 * HabitChatWidget — Floating AI Habit-Data Assistant on the Statistics page.
 *
 * Requirements:
 * - Floating "Ask AI" trigger button at bottom-right of Statistics page.
 * - Opens a slide-up floating chat panel.
 * - Header: "Ask about your habits" / "Ask me anything about your tracked progress."
 * - Suggested question chips ("What is my strongest habit?", "What should I focus on?", "How consistent was I this month?", "What is my longest streak?").
 * - In-memory conversation history (React state only, never persisted to DB).
 * - Messages display user bubbles and AI bubbles with structured supporting dataPoints.
 * - Handles loading, empty state, error, and 503 AI_NOT_CONFIGURED states.
 * - Includes Dev Preview (Mock AI) toggle for zero-key test environments.
 */

import {
  AlertCircle,
  Bot,
  ChevronDown,
  CornerDownLeft,
  Loader2,
  MessageSquare,
  Sparkles,
  User,
  X,
} from 'lucide-react';
import { useEffect, useRef, useState } from 'react';
import { aiApi } from '../../api/ai.js';
import { Button } from '../ui/Button.jsx';

const SUGGESTED_QUESTIONS = [
  'What is my strongest habit?',
  'What should I focus on?',
  'How consistent was I this month?',
  'What is my longest streak?',
];

export function HabitChatWidget({ hasHabits = true }) {
  const [isOpen, setIsOpen] = useState(false);
  const [messages, setMessages] = useState([]);
  const [input, setInput] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);
  const [isAiUnconfigured, setIsAiUnconfigured] = useState(false);
  const [useMock, setUseMock] = useState(false);

  const messagesEndRef = useRef(null);
  const inputRef = useRef(null);

  // Auto-scroll to bottom of messages container
  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  };

  useEffect(() => {
    if (isOpen) {
      scrollToBottom();
      // Focus input when opened
      setTimeout(() => inputRef.current?.focus(), 150);
    }
  }, [isOpen, messages, loading]);

  const handleSend = async (textToSend) => {
    const message = (textToSend || input).trim();
    if (!message || loading) return;

    // Reset input and clear previous non-fatal errors
    setInput('');
    setError(null);
    setIsAiUnconfigured(false);

    // Append user message to in-memory history
    const userMsg = {
      id: `usr-${Date.now()}`,
      sender: 'user',
      text: message,
      timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
    };

    setMessages((prev) => [...prev, userMsg]);
    setLoading(true);

    try {
      const res = await aiApi.sendChatMessage(message, useMock);
      const data = res.data?.data || res.data;

      const aiMsg = {
        id: `ai-${Date.now()}`,
        sender: 'ai',
        text: data.answer || 'I could not generate an answer at this time.',
        dataPoints: Array.isArray(data.dataPoints) ? data.dataPoints : [],
        timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
      };

      setMessages((prev) => [...prev, aiMsg]);
    } catch (err) {
      console.error('AI chat error:', err);
      if (err.response?.status === 503 || err.response?.data?.code === 'AI_NOT_CONFIGURED') {
        setIsAiUnconfigured(true);
      } else if (err.response?.status === 429) {
        setError('Rate limit exceeded. Please wait a moment before asking again.');
      } else {
        const backendMsg = err.response?.data?.error || err.response?.data?.message;
        setError(backendMsg || 'Failed to get an answer. Please try again.');
      }
    } finally {
      setLoading(false);
    }
  };

  const handleKeyDown = (e) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      handleSend();
    }
  };

  return (
    <aside className="chat-widget-root" aria-label="AI Habit Assistant">
      {/*  */}
      {!isOpen && (
        <button
          type="button"
          className="chat-fab-button"
          onClick={() => setIsOpen(true)}
          aria-expanded={isOpen}
          aria-controls="habit-chat-panel"
        >
          <Sparkles size={18} className="chat-fab-sparkle" aria-hidden="true" />
          <span className="chat-fab-label">Ask AI</span>
        </button>
      )}

      {/*  */}
      {isOpen && (
        <section
          id="habit-chat-panel"
          className="chat-panel"
          aria-label="Habit Chat Assistant"
          role="dialog"
          aria-modal="false"
        >
          {/* Header */}
          <header className="chat-panel-header">
            <div className="chat-header-info">
              <div className="chat-header-avatar">
                <Bot size={18} aria-hidden="true" />
              </div>
              <div>
                <h3 className="chat-panel-title">Ask about your habits</h3>
                <p className="chat-panel-subtitle">Ask me anything about your tracked progress.</p>
              </div>
            </div>
            <div className="chat-header-actions">
              <button
                type="button"
                className="chat-close-btn"
                onClick={() => setIsOpen(false)}
                aria-label="Close chat"
              >
                <X size={18} />
              </button>
            </div>
          </header>

          {/* Dev Preview / Mock AI Banner if unconfigured or toggled */}
          {isAiUnconfigured && (
            <div className="chat-unconfigured-banner" role="alert">
              <div className="chat-banner-content">
                <AlertCircle size={16} className="text-warning flex-shrink-0" />
                <p>AI chat is unavailable because AI has not been configured.</p>
              </div>
              <Button
                variant="outline"
                size="sm"
                onClick={() => {
                  setUseMock(true);
                  setIsAiUnconfigured(false);
                  setError(null);
                }}
              >
                Enable Dev Preview (Mock AI)
              </Button>
            </div>
          )}

          {/* Message Area */}
          <div className="chat-messages-container" role="log" aria-live="polite">
            {/* Empty State / Welcome Screen */}
            {messages.length === 0 && (
              <div className="chat-empty-intro">
                <div className="chat-intro-badge">
                  <Sparkles size={14} aria-hidden="true" />
                  <span>Habit Analytics Intelligence</span>
                </div>
                <h4 className="chat-intro-heading">Instant answers from your habit data</h4>
                <p className="chat-intro-copy">
                  {hasHabits
                    ? 'Ask questions about your best days, longest streaks, consistency, or struggling routines.'
                    : 'You do not have any active habits yet, but you can still ask questions about getting started.'}
                </p>

                {/* Suggested Question Chips */}
                <div className="chat-suggestions-box">
                  <div className="chat-suggestions-label">Try asking:</div>
                  <div className="chat-suggestions-grid">
                    {SUGGESTED_QUESTIONS.map((q) => (
                      <button
                        key={q}
                        type="button"
                        className="chat-suggestion-chip"
                        onClick={() => handleSend(q)}
                        disabled={loading}
                      >
                        <MessageSquare size={13} aria-hidden="true" />
                        <span>{q}</span>
                      </button>
                    ))}
                  </div>
                </div>
              </div>
            )}

            {/* Conversation Flow */}
            {messages.map((msg) => (
              <div
                key={msg.id}
                className={`chat-bubble-row ${msg.sender === 'user' ? 'row-user' : 'row-ai'}`}
              >
                {msg.sender === 'ai' && (
                  <div className="chat-msg-avatar ai-avatar">
                    <Bot size={14} aria-hidden="true" />
                  </div>
                )}

                <div className={`chat-bubble ${msg.sender === 'user' ? 'bubble-user' : 'bubble-ai'}`}>
                  <p className="chat-bubble-text">{msg.text}</p>

                  {/* Supporting Data Points Pill List */}
                  {msg.dataPoints && msg.dataPoints.length > 0 && (
                    <div className="chat-datapoints-list" aria-label="Supporting facts">
                      <div className="chat-datapoints-label">Supporting facts:</div>
                      {msg.dataPoints.map((dp, i) => (
                        <div key={i} className="chat-datapoint-item">
                          <span className="chat-datapoint-bullet">•</span>
                          <span>{dp}</span>
                        </div>
                      ))}
                    </div>
                  )}

                  <span className="chat-bubble-time">{msg.timestamp}</span>
                </div>

                {msg.sender === 'user' && (
                  <div className="chat-msg-avatar user-avatar">
                    <User size={14} aria-hidden="true" />
                  </div>
                )}
              </div>
            ))}

            {/* Loading Indicator */}
            {loading && (
              <div className="chat-bubble-row row-ai">
                <div className="chat-msg-avatar ai-avatar">
                  <Bot size={14} aria-hidden="true" />
                </div>
                <div className="chat-bubble bubble-ai bubble-loading">
                  <Loader2 size={16} className="animate-spin text-primary" />
                  <span>Analyzing your habit metrics...</span>
                </div>
              </div>
            )}

            {/* General Error Banner */}
            {error && (
              <div className="chat-error-inline" role="alert">
                <AlertCircle size={15} className="text-danger flex-shrink-0" />
                <span>{error}</span>
              </div>
            )}

            <div ref={messagesEndRef} />
          </div>

          {/* Quick Suggestions Strip if messages exist */}
          {messages.length > 0 && !loading && (
            <div className="chat-quick-chips">
              {SUGGESTED_QUESTIONS.slice(0, 2).map((q) => (
                <button
                  key={q}
                  type="button"
                  className="chat-quick-chip"
                  onClick={() => handleSend(q)}
                >
                  {q}
                </button>
              ))}
            </div>
          )}

          {/* Input Footer */}
          <footer className="chat-panel-footer">
            <div className="chat-input-wrapper">
              <input
                ref={inputRef}
                type="text"
                className="chat-input-field"
                placeholder="Ask about streaks, completion rates, best days..."
                value={input}
                onChange={(e) => setInput(e.target.value)}
                onKeyDown={handleKeyDown}
                maxLength={500}
                disabled={loading}
                aria-label="Ask about your habits"
              />
              <button
                type="button"
                className="chat-send-btn"
                onClick={() => handleSend()}
                disabled={!input.trim() || loading}
                aria-label="Send message"
              >
                <CornerDownLeft size={16} />
              </button>
            </div>
            <div className="chat-footer-note">
              <span>Uses deterministic snapshot metrics • In-memory conversation</span>
              {useMock && <span className="chat-mock-badge">Dev Preview Active</span>}
            </div>
          </footer>
        </section>
      )}
    </aside>
  );
}

export default HabitChatWidget;
