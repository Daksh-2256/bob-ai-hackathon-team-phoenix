import { NavLink } from 'react-router-dom';
import {
  LayoutDashboard,
  AlertTriangle,
  Package,
  Truck,
  Thermometer,
  Bot,
  ClipboardList,
  Theater,
  X,
} from 'lucide-react';

const navItems = [
  { to: '/dashboard',       label: 'Dashboard',        icon: LayoutDashboard },
  { to: '/disruptions',     label: 'Disruptions',      icon: AlertTriangle },
  { to: '/shipments',       label: 'Shipments',        icon: Package },
  { to: '/fleet',           label: 'Fleet Optimizer',  icon: Truck },
  { to: '/cold-chain',      label: 'Cold Chain',       icon: Thermometer },
  { to: '/copilot',         label: 'AI Copilot',       icon: Bot },
  { to: '/operations-brief',label: 'Ops Brief',        icon: ClipboardList },
  { to: '/scenarios',       label: 'Scenarios',        icon: Theater },
];

interface SidebarProps {
  onClose?: () => void;
}

export default function Sidebar({ onClose }: SidebarProps) {
  return (
    <nav className="flex flex-col h-full bg-gray-900 text-white w-56 flex-shrink-0">
      {/* Logo */}
      <div className="flex items-center justify-between px-4 py-4 border-b border-gray-700">
        <div>
          <p className="text-xs font-bold text-blue-400 tracking-widest uppercase">SupplyGuard</p>
          <p className="text-xs text-gray-400">AI Control Tower</p>
        </div>
        {onClose && (
          <button onClick={onClose} className="text-gray-400 hover:text-white lg:hidden">
            <X className="w-4 h-4" />
          </button>
        )}
      </div>

      {/* Nav items */}
      <div className="flex-1 overflow-y-auto py-3">
        {navItems.map(({ to, label, icon: Icon }) => (
          <NavLink
            key={to}
            to={to}
            className={({ isActive }) =>
              `flex items-center gap-3 px-4 py-2.5 text-sm transition-colors ${
                isActive
                  ? 'bg-blue-600 text-white font-medium'
                  : 'text-gray-300 hover:bg-gray-800 hover:text-white'
              }`
            }
          >
            <Icon className="w-4 h-4 flex-shrink-0" />
            <span>{label}</span>
          </NavLink>
        ))}
      </div>

      {/* Bottom badge */}
      <div className="px-4 py-3 border-t border-gray-700">
        <div className="flex items-center gap-2">
          <Bot className="w-4 h-4 text-blue-400" />
          <div>
            <p className="text-xs font-medium text-gray-200">IBM Bob MCP</p>
            <p className="text-xs text-gray-500">Powered by watsonx</p>
          </div>
        </div>
      </div>
    </nav>
  );
}
