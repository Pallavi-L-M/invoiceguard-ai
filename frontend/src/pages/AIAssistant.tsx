import { useState, useRef, useEffect } from 'react';
import { Send, Bot, Brain, Sparkles, Loader2, RefreshCw } from 'lucide-react';
import ChatMessage from '../components/ChatMessage';
import { chatWithAssistant } from '../api/client';
import type { ChatMessage as ChatMessageType } from '../types';

const INITIAL_SUGGESTIONS = [
  'Have we received a similar invoice before?',
  "What happened in the previous duplicate invoice case with ABC Technologies?",
  'How did we resolve a similar tax mismatch for Global Supplies?',
  'What should we check before approving invoice INV-1003 from Bright Solutions?',
  "Have we encountered unusual amount spikes from any vendor recently?",
];

export default function AIAssistant() {
  const [messages, setMessages] = useState<ChatMessageType[]>([
    {
      id: 'welcome',
      role: 'assistant',
      content:
        'Hello! I am your InvoiceGuard AI Financial Assistant, integrated with Vectorize Hindsight persistent memory. I can retrieve previous invoice errors, investigation outcomes, and auditor resolutions to advise you on payment integrity.\n\nAsk me anything about past invoice issues or compliance rules.',
      timestamp: new Date().toISOString(),
    },
  ]);
  const [input, setInput] = useState('');
  const [loading, setLoading] = useState(false);
  const messagesEndRef = useRef<HTMLDivElement>(null);

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  };

  useEffect(() => {
    scrollToBottom();
  }, [messages, loading]);

  const handleSend = async (messageToSend?: string) => {
    const text = (messageToSend || input).trim();
    if (!text || loading) return;

    const userMessage: ChatMessageType = {
      id: `user-${Date.now()}`,
      role: 'user',
      content: text,
      timestamp: new Date().toISOString(),
    };

    setMessages((prev) => [...prev, userMessage]);
    setInput('');
    setLoading(true);

    try {
      const response = await chatWithAssistant(text);
      const assistantMessage: ChatMessageType = {
        id: `assistant-${Date.now()}`,
        role: 'assistant',
        content: response.message,
        timestamp: new Date().toISOString(),
        hindsightContext: response.hindsightMemories,
      };

      setMessages((prev) => [...prev, assistantMessage]);
    } catch (err: any) {
      const errorMessage: ChatMessageType = {
        id: `err-${Date.now()}`,
        role: 'assistant',
        content: `I encountered an issue querying the system: ${err.message}. If Hindsight is running on http://localhost:8888, please check that the container is healthy.`,
        timestamp: new Date().toISOString(),
      };
      setMessages((prev) => [...prev, errorMessage]);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="flex flex-col h-[calc(100vh-140px)] max-w-5xl mx-auto space-y-4">
      {/* Top Banner */}
      <div className="flex items-center justify-between bg-white rounded-xl border border-slate-200 p-4 shadow-sm">
        <div className="flex items-center gap-3">
          <div className="p-2.5 rounded-xl bg-purple-50 text-purple-600">
            <Brain className="h-5 w-5" />
          </div>
          <div>
            <h1 className="text-sm font-bold text-slate-800">AI Accounts Payable Advisor</h1>
            <p className="text-xs text-slate-500">Connected to Vectorize Hindsight long-term memory bank</p>
          </div>
        </div>

        <button
          onClick={() =>
            setMessages([
              {
                id: 'welcome-reset',
                role: 'assistant',
                content: 'Chat context cleared. How can I assist you with invoice verification today?',
                timestamp: new Date().toISOString(),
              },
            ])
          }
          className="text-xs text-slate-400 hover:text-slate-600 font-medium px-3 py-1.5 rounded-lg border border-slate-200 cursor-pointer"
        >
          Clear Chat
        </button>
      </div>

      {/* Suggested Questions */}
      <div className="flex items-center gap-2 overflow-x-auto pb-1 scrollbar-none">
        <span className="text-[11px] font-semibold text-slate-400 whitespace-nowrap flex items-center gap-1">
          <Sparkles className="h-3 w-3 text-indigo-500" />
          Suggested:
        </span>
        {INITIAL_SUGGESTIONS.map((suggestion, idx) => (
          <button
            key={idx}
            onClick={() => handleSend(suggestion)}
            className="text-[11px] font-medium text-slate-700 bg-white hover:bg-indigo-50 hover:text-indigo-600 px-3 py-1.5 rounded-full border border-slate-200 hover:border-indigo-300 whitespace-nowrap transition-colors cursor-pointer shadow-2xs"
          >
            {suggestion}
          </button>
        ))}
      </div>

      {/* Chat Messages Log */}
      <div className="flex-1 bg-slate-50/50 rounded-2xl border border-slate-200 p-4 overflow-y-auto space-y-4">
        {messages.map((msg) => (
          <ChatMessage key={msg.id} message={msg} />
        ))}

        {loading && (
          <div className="flex gap-3 items-center text-slate-400 text-xs pl-2">
            <Loader2 className="h-4 w-4 animate-spin text-indigo-600" />
            <span>Consulting Hindsight memory bank and analyzing context...</span>
          </div>
        )}

        <div ref={messagesEndRef} />
      </div>

      {/* Input Form */}
      <form
        onSubmit={(e) => {
          e.preventDefault();
          handleSend();
        }}
        className="bg-white rounded-xl border border-slate-200 p-2 shadow-sm flex items-center gap-2"
      >
        <input
          type="text"
          value={input}
          onChange={(e) => setInput(e.target.value)}
          placeholder="Ask about past invoice anomalies, vendor history, or verification guidelines..."
          className="flex-1 px-3 py-2 text-xs focus:outline-none text-slate-800 placeholder-slate-400"
        />
        <button
          type="submit"
          disabled={!input.trim() || loading}
          className="p-2.5 rounded-lg bg-indigo-600 hover:bg-indigo-700 text-white transition-colors disabled:opacity-40 cursor-pointer shadow-sm"
        >
          <Send className="h-4 w-4" />
        </button>
      </form>
    </div>
  );
}
