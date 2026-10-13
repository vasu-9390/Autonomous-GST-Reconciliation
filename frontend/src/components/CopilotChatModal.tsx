import React, { useState } from 'react';
import { ApiService } from '../services/api';
import { Bot, Send, X, Loader2, Sparkles, BookOpen } from 'lucide-react';

interface CopilotChatModalProps {
  isOpen: boolean;
  onClose: () => void;
}

interface Message {
  sender: 'user' | 'assistant';
  text: string;
  references?: string[];
  timestamp: string;
}

export const CopilotChatModal: React.FC<CopilotChatModalProps> = ({ isOpen, onClose }) => {
  const [messages, setMessages] = useState<Message[]>([
    {
      sender: 'assistant',
      text: `Hello! I am your Autonomous GST Reconciliation & Mismatch Copilot. You can ask me questions about GST Input Tax Credit rules, Section 16(2)(aa), Rule 36(4), why purchase register values differ from GSTR-2B, or how to handle supplier mismatches. How can I assist you today?`,
      references: ['CGST Act 2017', 'GSTR-2B Advisory', 'CBIC Reconciliation Rules'],
      timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
    },
  ]);
  const [inputValue, setInputValue] = useState('');
  const [loading, setLoading] = useState(false);

  if (!isOpen) return null;

  const quickPrompts = [
    'Explain the difference between a purchase register and GSTR-2B',
    'Which discrepancies should my finance team review first?',
    'Why does the taxable value differ on an invoice?',
    'What should I verify before claiming ITC under Section 16?',
  ];

  const handleSend = async (questionText?: string) => {
    const textToSend = questionText || inputValue;
    if (!textToSend.trim() || loading) return;

    const userMsg: Message = {
      sender: 'user',
      text: textToSend,
      timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
    };

    setMessages((prev) => [...prev, userMsg]);
    if (!questionText) setInputValue('');
    setLoading(true);

    try {
      const res = await ApiService.copilot.ask(textToSend);
      const assistantMsg: Message = {
        sender: 'assistant',
        text: res.data.answer,
        references: res.data.references,
        timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
      };
      setMessages((prev) => [...prev, assistantMsg]);
    } catch (err: any) {
      setMessages((prev) => [
        ...prev,
        {
          sender: 'assistant',
          text: `Apologies, I encountered an error while consulting the GST engine: ${err.message}`,
          timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
        },
      ]);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-950/80 backdrop-blur-sm p-4">
      <div className="w-full max-w-2xl bg-slate-900 border border-slate-800 rounded-2xl shadow-2xl flex flex-col h-[650px] overflow-hidden animate-in fade-in zoom-in-95 duration-200">
        {/* Header */}
        <div className="p-4 border-b border-slate-800 bg-slate-950 flex items-center justify-between">
          <div className="flex items-center gap-2.5">
            <div className="p-2 rounded-lg bg-brand-500/10 border border-brand-500/20 text-brand-400">
              <Bot className="w-5 h-5" />
            </div>
            <div>
              <h3 className="text-sm font-bold text-white flex items-center gap-2">
                Ask GST Copilot
                <span className="text-[10px] px-1.5 py-0.5 rounded bg-brand-500/20 text-brand-300 font-mono">
                  Gemini
                </span>
              </h3>
              <p className="text-[11px] text-slate-400">Autonomous fintech compliance assistant</p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-1.5 rounded-lg text-slate-400 hover:text-white hover:bg-slate-800 transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Messages List */}
        <div className="flex-1 overflow-y-auto p-4 space-y-4 bg-slate-950/40">
          {messages.map((m, idx) => (
            <div
              key={idx}
              className={`flex flex-col ${m.sender === 'user' ? 'items-end' : 'items-start'}`}
            >
              <div
                className={`max-w-[85%] rounded-2xl p-4 text-xs leading-relaxed ${
                  m.sender === 'user'
                    ? 'bg-brand-600 text-white rounded-br-none shadow-md shadow-brand-950/40'
                    : 'bg-slate-800/80 text-slate-200 border border-slate-700/60 rounded-bl-none shadow-sm'
                }`}
              >
                <div className="whitespace-pre-wrap">{m.text}</div>

                {m.references && m.references.length > 0 && (
                  <div className="mt-3 pt-2.5 border-t border-slate-700/50 flex flex-wrap items-center gap-1.5">
                    <span className="text-[10px] text-slate-400 flex items-center gap-1 font-semibold">
                      <BookOpen className="w-3 h-3" /> References:
                    </span>
                    {m.references.map((r, rIdx) => (
                      <span
                        key={rIdx}
                        className="text-[10px] px-1.5 py-0.5 rounded bg-slate-900/60 text-brand-300 border border-slate-700/50"
                      >
                        {r}
                      </span>
                    ))}
                  </div>
                )}
              </div>
              <span className="text-[10px] text-slate-400 mt-1 px-1">{m.timestamp}</span>
            </div>
          ))}

          {loading && (
            <div className="flex items-center gap-2 p-3 rounded-xl bg-slate-800/40 border border-slate-800 w-fit text-xs text-slate-400 animate-pulse">
              <Loader2 className="w-4 h-4 animate-spin text-brand-400" />
              <span>GST Copilot is analyzing tax rules...</span>
            </div>
          )}
        </div>

        {/* Quick prompt chips */}
        <div className="px-4 py-2 border-t border-slate-800/60 bg-slate-950 flex items-center gap-2 overflow-x-auto">
          <span className="text-[10px] font-semibold text-slate-400 uppercase tracking-wider shrink-0">
            Suggested:
          </span>
          {quickPrompts.map((p, idx) => (
            <button
              key={idx}
              onClick={() => handleSend(p)}
              disabled={loading}
              className="text-[11px] whitespace-nowrap px-2.5 py-1 rounded-full bg-slate-900 border border-slate-800 text-slate-300 hover:text-white hover:border-brand-500/50 transition-colors shrink-0 disabled:opacity-50"
            >
              {p}
            </button>
          ))}
        </div>

        {/* Input Bar */}
        <div className="p-3 border-t border-slate-800 bg-slate-950 flex items-center gap-2">
          <input
            type="text"
            value={inputValue}
            onChange={(e) => setInputValue(e.target.value)}
            onKeyDown={(e) => e.key === 'Enter' && handleSend()}
            placeholder="Ask anything about GST reconciliation, mismatches, or rules..."
            disabled={loading}
            className="flex-1 bg-slate-900 border border-slate-800 rounded-xl px-4 py-2.5 text-xs text-white placeholder-slate-400 focus:outline-none focus:border-brand-500 transition-colors"
          />
          <button
            onClick={() => handleSend()}
            disabled={loading || !inputValue.trim()}
            className="p-2.5 rounded-xl bg-brand-600 hover:bg-brand-500 text-white disabled:opacity-40 transition-colors shadow-md"
          >
            <Send className="w-4 h-4" />
          </button>
        </div>
      </div>
    </div>
  );
};
