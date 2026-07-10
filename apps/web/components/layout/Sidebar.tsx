'use client';

import React from 'react';
import Link from 'next/link';
import { usePathname } from 'next/navigation';
import {
  LayoutDashboard,
  Zap,
  Users,
  MessageSquare,
  Radio,
  CreditCard,
  Phone,
  Settings,
  Code,
  Building2,
  ChevronRight,
} from 'lucide-react';

interface NavItem {
  label: string;
  icon: React.ComponentType<any>;
  href: string;
  enabled: boolean;
}

export default function Sidebar() {
  const pathname = usePathname();

  const mainItems: NavItem[] = [
    { label: 'Dashboard', icon: LayoutDashboard, href: '/dashboard', enabled: true },
    { label: 'Generate Leads', icon: Zap, href: '/generate', enabled: false },
    { label: 'Manage Leads', icon: Users, href: '/leads', enabled: true },
    { label: 'Engage Leads', icon: MessageSquare, href: '/engage', enabled: false },
  ];

  const controlCenterItems: NavItem[] = [
    { label: 'Team Members', icon: Users, href: '/teams', enabled: false },
    { label: 'Lead Sources', icon: Radio, href: '/sources', enabled: true },
    { label: 'Ad Accounts', icon: CreditCard, href: '/ad-accounts', enabled: false },
    { label: 'WhatsApp Account', icon: MessageSquare, href: '/whatsapp', enabled: false },
    { label: 'Tele Calling', icon: Phone, href: '/tele-calling', enabled: false },
    { label: 'CRM Fields', icon: Settings, href: '/crm-fields', enabled: false },
    { label: 'API Center', icon: Code, href: '/api-center', enabled: false },
  ];

  const renderItem = (item: NavItem) => {
    const Icon = item.icon;
    const isActive = pathname === item.href;

    if (!item.enabled) {
      return (
        <div
          key={item.label}
          title="Coming soon"
          className="flex items-center space-x-3 px-4 py-2.5 rounded-lg text-white/40 cursor-not-allowed transition-colors select-none"
        >
          <Icon className="w-4 h-4 flex-shrink-0" />
          <span className="text-sm font-medium">{item.label}</span>
        </div>
      );
    }

    return (
      <Link
        key={item.label}
        href={item.href}
        className={`flex items-center space-x-3 px-4 py-2.5 border-l-2 transition-all ${
          isActive
            ? 'bg-white/10 text-white border-l-[#fb923c] font-semibold'
            : 'border-l-transparent text-white/70 hover:text-white hover:bg-white/5'
        }`}
      >
        <Icon className="w-4 h-4 flex-shrink-0" />
        <span className="text-sm font-medium">{item.label}</span>
      </Link>
    );
  };

  return (
    <aside className="w-[220px] bg-[#1a1a2e] text-white flex flex-col h-screen flex-shrink-0 border-r border-white/10 select-none">
      {/* Brand Logo */}
      <div className="px-6 py-5 flex items-center space-x-2.5 border-b border-white/5">
        <div className="w-8 h-8 rounded-lg bg-[#fb923c] flex items-center justify-center font-bold text-white text-base shadow-sm">
          G
        </div>
        <div>
          <h1 className="font-bold text-sm tracking-wide leading-none">GrowEasy</h1>
          <span className="text-[10px] text-white/50 leading-none">CRM Client</span>
        </div>
      </div>

      {/* User Info Card */}
      <div className="px-4 py-4 flex items-center justify-between hover:bg-white/5 cursor-pointer border-b border-white/5">
        <div className="flex items-center space-x-3">
          <div className="w-9 h-9 rounded-full bg-blue-600 text-white flex items-center justify-center font-semibold text-sm">
            VT
          </div>
          <div>
            <p className="text-xs font-semibold leading-tight">VK Test</p>
            <p className="text-[10px] text-white/50 tracking-wider uppercase font-semibold mt-0.5">Owner</p>
          </div>
        </div>
        <ChevronRight className="w-4 h-4 text-white/40" />
      </div>

      {/* Nav List */}
      <div className="flex-1 overflow-y-auto py-4 px-2 space-y-6">
        {/* Main Section */}
        <div className="space-y-1">
          <p className="px-4 text-[10px] font-bold tracking-widest text-white/40 uppercase mb-2">Main</p>
          {mainItems.map(renderItem)}
        </div>

        {/* Control Center Section */}
        <div className="space-y-1">
          <p className="px-4 text-[10px] font-bold tracking-widest text-white/40 uppercase mb-2">Control Center</p>
          {controlCenterItems.map(renderItem)}
        </div>
      </div>

      {/* Footer Pinned Section */}
      <div className="p-2 border-t border-white/5 mt-auto">
        <div
          title="Coming soon"
          className="flex items-center space-x-3 px-4 py-3 rounded-lg text-white/40 cursor-not-allowed select-none"
        >
          <Building2 className="w-4 h-4 flex-shrink-0" />
          <span className="text-sm font-medium">Business Center</span>
        </div>
      </div>
    </aside>
  );
}
