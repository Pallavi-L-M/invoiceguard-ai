import { Shield, User, Brain } from 'lucide-react';
import type { ChatMessage as ChatMessageType } from '../types';

interface ChatMessageProps {
  message: ChatMessageType;
}

export default function ChatMessage({ message }: ChatMessageProps) {
  const isAssistant = message.role === 'assistant';

  return (
    <div className={`flex gap-3.5 ${isAssistant ? '' : 'flex-row-reverse'} animate-fade-in`}>
      <div
        className={`h-8 w-8 rounded-full flex items-center justify-center flex-shrink-0 ${
          isAssistant ? 'bg-indigo-600 text-white shadow-sm' : 'bg-slate-700 text-white'
        }`}
      >
        {isAssistant ? <Shield className="h-4 w-4" /> : <User className="h-4 w-4" />}
      </div>

      <div className={`max-w-[80%] ${isAssistant ? 'items-start' : 'items-end'}`}>
        <div className="flex items-center gap-2 mb-1 px-1">
          <span className="text-xs font-semibold text-slate-700">
            {isAssistant ? 'InvoiceGuard Assistant' : 'You'}
          </span>
          <span className="text-[10px] text-slate-400">
            {new Date(message.timestamp).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
          </span>
          {isAssistant && message.hindsightContext && message.hindsightContext.length > 0 && (
            <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-semibold bg-purple-50 text-purple-700 border border-purple-200">
              <Brain className="h-2.5 w-2.5" />
              Memory Informed
            </span>
          )}
        </div>

        <div
          className={`rounded-2xl px-4 py-3 text-sm leading-relaxed ${
            isAssistant
              ? 'bg-white border border-slate-200 text-slate-800 shadow-sm'
              : 'bg-indigo-600 text-white'
          }`}
        >
          <div className="whitespace-pre-wrap">{message.content}</div>

          {isAssistant && message.hindsightContext && message.hindsightContext.length > 0 && (
            <div className="mt-3 pt-2.5 border-t border-slate-100">
              <p className="text-[11px] font-semibold text-purple-800 flex items-center gap-1 mb-1.5">
                <Brain className="h-3 w-3" />
                Recalled Hindsight Memory:
              </p>
              <ul className="space-y-1">
                {message.hindsightContext.map((ctx: string, idx: number) => (
                  <li key={idx} className="text-xs text-slate-600 bg-purple-50/60 p-2 rounded-md border border-purple-100">
                    {ctx}
                  </li>
                ))}
              </ul>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
