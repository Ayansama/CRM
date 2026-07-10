'use client';

import React, { useState, useEffect } from 'react';
import { RefreshCw } from 'lucide-react';
import StatsCards from '../../components/dashboard/StatsCards';
import StatusPieChart from '../../components/dashboard/StatusPieChart';
import DayLevelGrid from '../../components/dashboard/DayLevelGrid';
import ActivityTrendChart from '../../components/dashboard/ActivityTrendChart';

interface AnalyticsData {
  totals: {
    leads: number;
    salesDone: number;
    conversionRate: number;
  };
  byStatus: {
    GOOD_LEAD_FOLLOW_UP: number;
    DID_NOT_CONNECT: number;
    BAD_LEAD: number;
    SALE_DONE: number;
    uncontacted: number;
  };
  today: {
    total: number;
    contacted: number;
    goodLeads: number;
    badLeads: number;
    didntConnect: number;
    saleDone: number;
  };
  activityTrend: {
    hour: number;
    totalLeads: number;
    contacted: number;
    goodLead: number;
    badLead: number;
    didntConnect: number;
    saleDone: number;
  }[];
  delta: {
    leadsVsLastMonth: number | null;
    salesVsLastWeek: number | null;
    conversionDelta: number | null;
  };
}

export default function DashboardPage() {
  const [data, setData] = useState<AnalyticsData | null>(null);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);

  const apiUrl = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:4000';

  const fetchAnalytics = async (isRefresh = false) => {
    try {
      if (!isRefresh) setLoading(true);
      const response = await fetch(`${apiUrl}/api/analytics`);
      if (!response.ok) throw new Error('Failed to fetch analytics');
      const payload = await response.json();
      setData(payload);
    } catch (error) {
      console.error('Error fetching dashboard analytics:', error);
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  };

  useEffect(() => {
    fetchAnalytics();
  }, []);

  const handleRefresh = async () => {
    setRefreshing(true);
    await fetchAnalytics(true);
  };

  if (loading && !data) {
    return (
      <div className="max-w-6xl w-full mx-auto p-6 space-y-6 animate-pulse">
        {/* Header Skeleton */}
        <div className="space-y-2">
          <div className="h-8 bg-secondary rounded-lg w-1/4" />
          <div className="h-4 bg-secondary rounded-lg w-1/3" />
        </div>
        {/* Stats Cards Skeleton */}
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-5">
          {Array.from({ length: 4 }).map((_, i) => (
            <div key={i} className="bg-card border border-border h-24 rounded-xl" />
          ))}
        </div>
        {/* Main Grid Skeleton */}
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          <div className="bg-card border border-border h-[380px] rounded-2xl lg:col-span-1" />
          <div className="bg-card border border-border h-[380px] rounded-2xl lg:col-span-2" />
        </div>
      </div>
    );
  }

  const analytics = data!;

  return (
    <div className="max-w-6xl w-full mx-auto p-6 space-y-6">
      {/* Page Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold tracking-tight text-foreground">Dashboard Overview</h1>
          <p className="text-sm text-muted-foreground mt-1">
            Track your leads and sales performance.
          </p>
        </div>

        <button
          onClick={handleRefresh}
          disabled={refreshing}
          className="p-2 border border-border hover:bg-secondary/40 text-muted-foreground hover:text-foreground rounded-xl transition-colors disabled:opacity-50"
          title="Refresh metrics"
        >
          <RefreshCw className={`w-4 h-4 ${refreshing ? 'animate-spin' : ''}`} />
        </button>
      </div>

      {/* Primary Metrics Section */}
      <StatsCards totals={analytics.totals} delta={analytics.delta} />

      {/* Charts & Day-Level Grid Layout */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Left Side: Donut breakdown */}
        <div className="lg:col-span-1">
          <StatusPieChart byStatus={analytics.byStatus} />
        </div>

        {/* Right Side: Day Level Analytics */}
        <div className="bg-card border border-border rounded-2xl p-5 shadow-sm lg:col-span-2 flex flex-col justify-between space-y-6">
          <div>
            <div className="flex items-center justify-between border-b border-border/60 pb-3">
              <div>
                <h3 className="font-bold text-sm text-foreground">Day Level Analytics</h3>
                <p className="text-xs text-muted-foreground mt-0.5">Real-time counts and trends for today</p>
              </div>
              <button
                onClick={handleRefresh}
                className="text-xs font-bold text-muted-foreground hover:text-primary transition-colors"
              >
                Refresh
              </button>
            </div>
            
            {/* Grid of mini status indicators */}
            <div className="mt-4">
              <DayLevelGrid today={analytics.today} />
            </div>
          </div>

          {/* Activity Trend Line Chart */}
          <div>
            <h4 className="text-xs uppercase font-bold text-muted-foreground/80 tracking-wider mb-3">
              Activity Trend
            </h4>
            <ActivityTrendChart data={analytics.activityTrend} />
          </div>
        </div>
      </div>
    </div>
  );
}
