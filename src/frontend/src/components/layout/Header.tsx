import { useState, useEffect } from 'react';
import { RefreshCw, Bot, Menu } from 'lucide-react';

interface HeaderProps {
  systemHealth: 'GREEN' | 'AMBER' | 'RED';
  onRefresh?: () => void;
  onMenuClick?: () => void;
}

const healthConfig: Record<string, { dot: string; label: string }> = {
  GREEN: { dot: 'bg-green-500', label: 'Operational' },
  AMBER: { dot: 'bg-yellow-400 animate-pulse', label: 'Degraded' },
  RED:   { dot: 'bg-red-500 animate-pulse',   label: 'Critical' },
};

export default function Header({ systemHealth, onRefresh, onMenuClick }: HeaderProps) {
  const [time, setTime] = useState(new Date());

  useEffect(() => {
    const t = setInterval(() => setTime(new Date()), 1000);
    return () => clearInterval(t);
  }, []);

  const health = healthConfig[systemHealth] ?? healthConfig.GREEN;

  return (
    <header className="bg-gray-900 border-b border-gray-700 px-4 py-2.5 flex items-center justify-between flex-shrink-0">
      {/* Left */}
      <div className="flex items-center gap-3">
        {onMenuClick && (
          <button onClick={onMenuClick} className="text-gray-400 hover:text-white lg:hidden">
            <Menu className="w-5 h-5" />
          </button>
        )}
        <div className="flex items-center gap-2">
          <div className="w-6 h-6 bg-blue-600 rounded flex items-center justify-center">
            <span className="text-white text-xs font-bold">SG</span>
          </div>
          <span className="text-white font-semibold text-sm hidden sm:block">SupplyGuard AI</span>
          <span className="text-gray-500 text-sm hidden sm:block">·</span>
          <span className="text-gray-400 text-xs hidden sm:block">IBM Innovation Hackathon 2026</span>
        </div>
      </div>

      {/* Right */}
      <div className="flex items-center gap-4">
        {/* IBM Bob badge */}
        <div className="hidden sm:flex items-center gap-1.5 bg-blue-600/20 border border-blue-500/30 rounded px-2 py-1">
          <Bot className="w-3 h-3 text-blue-400" />
          <span className="text-blue-300 text-xs font-medium">IBM Bob Copilot</span>
        </div>

        {/* System status */}
        <div className="flex items-center gap-1.5">
          <div className={`w-2 h-2 rounded-full ${health.dot}`} />
          <span className="text-xs text-gray-300 hidden sm:block">{health.label}</span>
        </div>

        {/* Time */}
        <span className="text-xs text-gray-400 tabular-nums hidden md:block">
          {time.toLocaleTimeString('en-US', { hour12: false })}
        </span>

        {/* Refresh */}
        {onRefresh && (
          <button
            onClick={onRefresh}
            className="text-gray-400 hover:text-white transition-colors"
            title="Refresh"
          >
            <RefreshCw className="w-4 h-4" />
          </button>
        )}
      </div>
    </header>
  );
}
