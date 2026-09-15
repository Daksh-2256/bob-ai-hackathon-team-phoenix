import { useState, useRef, useEffect } from 'react';
import { Send, Bot, User, Trash2, Package, Truck, Thermometer } from 'lucide-react';
import { sendCopilotQuery } from '../api/client';
import type { CopilotResponse } from '../../../shared/types';

interface Message {
  id: string;
  role: 'user' | 'assistant';
  text: string;
  data?: unknown;
  followUps?: string[];
  loading?: boolean;
  ts: Date;
}

const SUGGESTED = [
  'Give me the top 5 actions I should take right now',
  'Which shipments are most affected by active disruptions?',
  'Which shipment has the highest risk?',
  'Show me idle trucks that can be redeployed',
  'Which cold-chain shipments have temperature excursions?',
  'Summarize today\'s supply chain situation',
];

function DataBlock({ data }: { data: unknown }) {
  if (!data || typeof data !== 'object') return null;
  const arr = Array.isArray(data) ? data : [data];
  if (arr.length === 0) return null;

  return (
    <div className="mt-3 space-y-2">
      {arr.slice(0, 5).map((item: unknown, i: number) => {
        if (typeof item !== 'object' || item === null) return null;
        const obj = item as Record<string, unknown>;
        const id = (obj.shipmentId ?? obj.assetId ?? obj.id ?? obj.alertId) as string | undefined;
        const name = (obj.name ?? obj.cargoDescription ?? obj.message) as string | undefined;
        const status = obj.status as string | undefined;
        const riskLevel = (obj.riskLevel ?? (obj.riskScore as Record<string, unknown>)?.riskLevel) as string | undefined;
        const type = obj.type as string | undefined;

        if (!id && !name && !status && !riskLevel && !type) return null;

        const icon =
          obj.shipmentId ? <Package className="w-3.5 h-3.5 text-blue-500" /> :
          obj.assetId ? <Truck className="w-3.5 h-3.5 text-yellow-500" /> :
          obj.alertId ? <Thermometer className="w-3.5 h-3.5 text-red-500" /> :
          <Bot className="w-3.5 h-3.5 text-gray-400" />;

        return (
          <div key={i} className="flex items-start gap-2 bg-gray-800 rounded-lg p-2.5 text-xs">
            <div className="flex-shrink-0 mt-0.5">{icon}</div>
            <div className="flex-1 min-w-0">
              {id && <span className="font-mono font-semibold text-blue-300">{id}</span>}
              {name && <span className="text-gray-300 ml-1.5 truncate">{String(name)}</span>}
              {status && (
                <span className="ml-1.5 text-gray-500">{String(status).replace(/_/g, ' ')}</span>
              )}
              {riskLevel && (
                <span className={`ml-1.5 font-semibold ${
                  riskLevel === 'CRITICAL' ? 'text-red-400' :
                  riskLevel === 'HIGH' ? 'text-orange-400' :
                  riskLevel === 'MEDIUM' ? 'text-yellow-400' : 'text-green-400'
                }`}>
                  {String(riskLevel)}
                </span>
              )}
              {type && !id && (
                <span className="text-gray-400">{String(type).replace(/_/g, ' ')}</span>
              )}
            </div>
          </div>
        );
      })}
      {arr.length > 5 && (
        <p className="text-xs text-gray-500 italic">…and {arr.length - 5} more</p>
      )}
    </div>
  );
}

export default function Copilot() {
  const [messages, setMessages] = useState<Message[]>([
    {
      id: 'welcome',
      role: 'assistant',
      text: 'Hello! I\'m the IBM Bob AI Copilot for SupplyGuard. I have real-time visibility across your entire supply chain — disruptions, shipments, fleet, and cold chain. How can I help you today?',
      followUps: SUGGESTED.slice(0, 3),
      ts: new Date(),
    },
  ]);
  const [input, setInput] = useState('');
  const [sending, setSending] = useState(false);
  const bottomRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages]);

  const sendMessage = async (query: string) => {
    if (!query.trim() || sending) return;

    const userMsg: Message = {
      id: `u-${Date.now()}`,
      role: 'user',
      text: query,
      ts: new Date(),
    };
    const loadingMsg: Message = {
      id: `l-${Date.now()}`,
      role: 'assistant',
      text: '',
      loading: true,
      ts: new Date(),
    };

    setMessages(prev => [...prev, userMsg, loadingMsg]);
    setInput('');
    setSending(true);

    try {
      const res: CopilotResponse = await sendCopilotQuery(query);
      setMessages(prev =>
        prev.map(m =>
          m.id === loadingMsg.id
            ? {
                ...m,
                loading: false,
                text: res.naturalLanguageAnswer,
                data: res.data,
                followUps: res.suggestedFollowUps,
              }
            : m
        )
      );
    } catch {
      setMessages(prev =>
        prev.map(m =>
          m.id === loadingMsg.id
            ? { ...m, loading: false, text: 'Sorry, I encountered an error. Please try again.' }
            : m
        )
      );
    } finally {
      setSending(false);
      inputRef.current?.focus();
    }
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    sendMessage(input);
  };

  return (
    <div className="flex flex-col h-[calc(100vh-8rem)] max-w-3xl mx-auto">
      {/* Header */}
      <div className="flex items-center justify-between mb-4 flex-shrink-0">
        <div>
          <div className="flex items-center gap-2">
            <div className="w-8 h-8 bg-blue-600 rounded-lg flex items-center justify-center">
              <Bot className="w-4 h-4 text-white" />
            </div>
            <div>
              <h1 className="text-base font-semibold text-gray-900">IBM Bob AI Copilot</h1>
              <p className="text-xs text-gray-500">Powered by IBM Bob MCP · watsonx</p>
            </div>
          </div>
        </div>
        <button
          onClick={() => setMessages([{
            id: 'welcome-reset',
            role: 'assistant',
            text: 'Conversation cleared. How can I help you?',
            ts: new Date(),
          }])}
          className="flex items-center gap-1.5 text-xs text-gray-500 hover:text-gray-700 border border-gray-300 rounded-lg px-2.5 py-1.5 hover:bg-gray-50 transition-colors"
        >
          <Trash2 className="w-3.5 h-3.5" />
          Clear
        </button>
      </div>

      {/* Suggested chips (only when no user messages) */}
      {messages.filter(m => m.role === 'user').length === 0 && (
        <div className="flex flex-wrap gap-2 mb-4 flex-shrink-0">
          {SUGGESTED.map(s => (
            <button
              key={s}
              onClick={() => sendMessage(s)}
              className="text-xs bg-white border border-gray-300 rounded-full px-3 py-1.5 text-gray-700 hover:bg-blue-50 hover:border-blue-300 hover:text-blue-700 transition-colors"
            >
              {s}
            </button>
          ))}
        </div>
      )}

      {/* Messages area */}
      <div className="flex-1 overflow-y-auto space-y-4 pr-1 pb-4">
        {messages.map(msg => (
          <div
            key={msg.id}
            className={`flex items-start gap-3 ${msg.role === 'user' ? 'flex-row-reverse' : ''}`}
          >
            {/* Avatar */}
            <div className={`flex-shrink-0 w-7 h-7 rounded-full flex items-center justify-center ${
              msg.role === 'user' ? 'bg-blue-600' : 'bg-gray-800'
            }`}>
              {msg.role === 'user'
                ? <User className="w-3.5 h-3.5 text-white" />
                : <Bot className="w-3.5 h-3.5 text-white" />}
            </div>

            {/* Bubble */}
            <div className={`max-w-[80%] ${msg.role === 'user' ? 'items-end' : 'items-start'} flex flex-col gap-1`}>
              <div className={`rounded-2xl px-4 py-2.5 text-sm leading-relaxed ${
                msg.role === 'user'
                  ? 'bg-blue-600 text-white rounded-tr-sm'
                  : 'bg-gray-900 text-gray-100 rounded-tl-sm'
              }`}>
                {msg.loading ? (
                  <div className="flex items-center gap-1.5 py-0.5">
                    <div className="w-2 h-2 bg-gray-500 rounded-full animate-bounce" style={{ animationDelay: '0ms' }} />
                    <div className="w-2 h-2 bg-gray-500 rounded-full animate-bounce" style={{ animationDelay: '150ms' }} />
                    <div className="w-2 h-2 bg-gray-500 rounded-full animate-bounce" style={{ animationDelay: '300ms' }} />
                  </div>
                ) : (
                  <>
                    <p className="whitespace-pre-wrap">{msg.text}</p>
                    {msg.data && <DataBlock data={msg.data} />}
                  </>
                )}
              </div>

              <p className="text-xs text-gray-400 px-1">
                {msg.ts.toLocaleTimeString('en-US', { hour: '2-digit', minute: '2-digit' })}
              </p>

              {/* Follow-up chips */}
              {msg.followUps && msg.followUps.length > 0 && (
                <div className="flex flex-wrap gap-1.5 mt-1">
                  {msg.followUps.map(fu => (
                    <button
                      key={fu}
                      onClick={() => sendMessage(fu)}
                      className="text-xs bg-gray-100 border border-gray-300 rounded-full px-2.5 py-1 text-gray-700 hover:bg-blue-50 hover:border-blue-300 hover:text-blue-700 transition-colors"
                    >
                      {fu}
                    </button>
                  ))}
                </div>
              )}
            </div>
          </div>
        ))}
        <div ref={bottomRef} />
      </div>

      {/* Input area */}
      <form
        onSubmit={handleSubmit}
        className="flex-shrink-0 mt-2 flex items-center gap-2 bg-white border border-gray-300 rounded-xl px-3 py-2 shadow-sm focus-within:ring-2 focus-within:ring-blue-500 focus-within:border-blue-500"
      >
        <input
          ref={inputRef}
          type="text"
          value={input}
          onChange={e => setInput(e.target.value)}
          placeholder="Ask anything about your supply chain..."
          className="flex-1 text-sm text-gray-900 placeholder-gray-400 bg-transparent outline-none"
          disabled={sending}
        />
        <button
          type="submit"
          disabled={!input.trim() || sending}
          className="flex-shrink-0 w-8 h-8 bg-blue-600 rounded-lg flex items-center justify-center text-white disabled:opacity-40 hover:bg-blue-700 transition-colors"
        >
          <Send className="w-3.5 h-3.5" />
        </button>
      </form>
    </div>
  );
}
