import React from 'react';
import { Search, Bell, Shield, Globe, ExternalLink, HelpCircle } from 'lucide-react';
import { useAuth } from '../../context/AuthContext';

interface AdminTopNavProps {
  onNavigatePublicMarketplace: () => void;
}

export const AdminTopNav: React.FC<AdminTopNavProps> = ({ onNavigatePublicMarketplace }) => {
  const { currentUser } = useAuth();

  if (!currentUser) return null;

  return (
    <header className="bg-white border-b border-[#eae7e1] px-4 py-3 sm:px-6 flex items-center justify-between gap-4 sticky top-0 z-20">
      {/* Left: Organization & Role Breadcrumb */}
      <div className="flex items-center gap-3 min-w-0">
        <div className="min-w-0">
          <div className="flex items-center gap-2">
            <span className="font-extrabold text-sm text-[#140338] truncate">
              {currentUser.organization}
            </span>
            <span className="hidden sm:inline-flex items-center px-2 py-0.5 rounded-full text-[10px] font-extrabold bg-[#140338] text-white">
              {currentUser.role}
            </span>
          </div>
          <p className="text-[11px] text-zinc-500 truncate hidden sm:block">
            Signed in as <strong>{currentUser.name}</strong> • {currentUser.title}
          </p>
        </div>
      </div>

      {/* Center/Right controls */}
      <div className="flex items-center gap-3">
        {/* Security & System Status Pill */}
        <div className="hidden lg:flex items-center gap-2 px-3 py-1.5 rounded-xl bg-emerald-50 border border-emerald-200 text-xs font-bold text-emerald-800">
          <Shield className="w-3.5 h-3.5 text-emerald-600" />
          <span>ISO 20560 Encrypted Relays</span>
        </div>

        {/* Public Marketplace Button */}
        <button
          onClick={onNavigatePublicMarketplace}
          className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-[#faf9f6] border border-[#eae7e1] text-xs font-bold text-[#140338] hover:bg-white hover:border-[#140338] transition-all shadow-2xs"
          title="Browse live inventory as a public customer"
        >
          <Globe className="w-3.5 h-3.5 text-emerald-600" />
          <span className="hidden sm:inline">Public Marketplace</span>
          <ExternalLink className="w-3 h-3 text-zinc-400" />
        </button>

        {/* Notifications */}
        <button
          onClick={() => alert('All regional corridor telemetry and audit notifications are normal.')}
          className="w-8 h-8 rounded-xl bg-[#faf9f6] hover:bg-zinc-100 flex items-center justify-center text-[#140338] relative border border-[#eae7e1] transition-colors"
          title="Telemetry alerts"
        >
          <Bell className="w-4 h-4" />
          <span className="absolute top-1 right-1 w-2 h-2 rounded-full bg-white ring-1 ring-white" />
        </button>
      </div>
    </header>
  );
};
