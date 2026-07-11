'use client';

import React, { useState, useEffect, useMemo } from 'react';
import { Search, RefreshCw, Loader2 } from 'lucide-react';
import QuickStats from '../../components/leads/QuickStats';
import LeadsTable from '../../components/leads/LeadsTable';
import { CrmRecord } from '@groweasy/shared-types';

export default function ManageLeadsPage() {
  const [leads, setLeads] = useState<CrmRecord[]>([]);
  const [page, setPage] = useState(1);
  const [total, setTotal] = useState(0);
  const [loading, setLoading] = useState(true);
  const [loadingMore, setLoadingMore] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  const [refreshing, setRefreshing] = useState(false);

  const apiUrl = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:4000';

  const fetchLeads = async (pageNumber: number, isRefresh = false) => {
    try {
      if (pageNumber === 1 && !isRefresh) {
        setLoading(true);
      }
      const response = await fetch(`${apiUrl}/api/leads?page=${pageNumber}&limit=50`);
      if (!response.ok) throw new Error('Failed to fetch leads');
      const data = await response.json();
      
      if (pageNumber === 1) {
        setLeads(data.leads || []);
      } else {
        setLeads((prev) => [...prev, ...(data.leads || [])]);
      }
      setTotal(data.total || 0);
    } catch (error) {
      console.error('Error fetching leads:', error);
    } finally {
      setLoading(false);
      setLoadingMore(false);
      setRefreshing(false);
    }
  };

  useEffect(() => {
    fetchLeads(1);
  }, []);

  const handleRefresh = async () => {
    setRefreshing(true);
    setPage(1);
    await fetchLeads(1, true);
  };

  const handleLoadMore = async () => {
    if (loadingMore) return;
    setLoadingMore(true);
    const nextPage = page + 1;
    setPage(nextPage);
    await fetchLeads(nextPage);
  };

  // Filter leads client-side
  const filteredLeads = useMemo(() => {
    if (!searchQuery) return leads;
    const lower = searchQuery.toLowerCase();
    return leads.filter((l) => {
      const emailMatch = l.email && l.email.toLowerCase().includes(lower);
      const phoneMatch = l.mobile_without_country_code && l.mobile_without_country_code.includes(searchQuery);
      return emailMatch || phoneMatch;
    });
  }, [leads, searchQuery]);

  // Compute Quick Stats from loaded leads
  const stats = useMemo(() => {
    const totalCount = leads.length;
    let goodCount = 0;
    let pendingCount = 0;
    let saleDoneCount = 0;

    leads.forEach((l) => {
      if (l.crm_status === 'GOOD_LEAD_FOLLOW_UP') {
        goodCount++;
      } else if (l.crm_status === '' || l.crm_status === 'DID_NOT_CONNECT') {
        pendingCount++;
      }
      if (l.crm_status === 'SALE_DONE') {
        saleDoneCount++;
      }
    });

    const conversionRate = totalCount > 0 ? ((saleDoneCount / totalCount) * 100).toFixed(1) : '0.0';

    return {
      total: totalCount,
      good: goodCount,
      pending: pendingCount,
      conversion: conversionRate,
    };
  }, [leads]);

  const hasMore = leads.length < total;

  return (
    <div className="max-w-6xl w-full mx-auto p-6 space-y-6">
      {/* Page Header */}
      <div>
        <h1 className="text-2xl font-bold tracking-tight text-foreground">Manage Your Leads</h1>
        <p className="text-sm text-muted-foreground mt-1">
          Monitor lead status, assign tasks, and close deals faster.
        </p>
      </div>

      {/* Quick Stats Grid */}
      {loading && leads.length === 0 ? (
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-5">
          {Array.from({ length: 4 }).map((_, i) => (
            <div key={i} className="bg-card border border-border rounded-xl p-5 h-20 animate-pulse" />
          ))}
        </div>
      ) : (
        <QuickStats
          total={stats.total}
          good={stats.good}
          pending={stats.pending}
          conversion={stats.conversion}
        />
      )}

      {/* Leads Table Container */}
      <div className="bg-card border border-border rounded-2xl p-5 shadow-sm space-y-4">
        {/* Table Actions Header */}
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
          <h2 className="font-bold text-sm text-foreground">Your Leads</h2>
          
          <div className="flex items-center space-x-3 w-full sm:w-auto">
            {/* Search Input */}
            <div className="relative flex-1 sm:flex-initial">
              <Search className="w-4 h-4 text-muted-foreground absolute left-3 top-1/2 -translate-y-1/2" />
              <input
                type="text"
                placeholder="Enter email or phone number..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="w-full sm:w-[260px] pl-9 pr-4 py-2 border border-border rounded-xl text-xs bg-secondary/10 hover:bg-secondary/20 focus:bg-card focus:outline-none focus:ring-1 focus:ring-primary/20 transition-all font-medium"
              />
            </div>

            {/* Refresh Button */}
            <button
              onClick={handleRefresh}
              disabled={refreshing || loading}
              className="p-2 border border-border hover:bg-secondary/40 text-muted-foreground hover:text-foreground rounded-xl transition-colors disabled:opacity-50"
              title="Refresh list"
            >
              <RefreshCw className={`w-4 h-4 ${refreshing ? 'animate-spin' : ''}`} />
            </button>
          </div>
        </div>

        {/* virtualized table */}
        {loading && leads.length === 0 ? (
          <div className="space-y-3 py-6">
            <div className="h-8 bg-secondary rounded-lg animate-pulse" />
            <div className="h-12 bg-card border border-border rounded-lg animate-pulse" />
            <div className="h-12 bg-card border border-border rounded-lg animate-pulse" />
            <div className="h-12 bg-card border border-border rounded-lg animate-pulse" />
          </div>
        ) : (
          <LeadsTable leads={filteredLeads} />
        )}

        {/* Load More Pagination */}
        {hasMore && !searchQuery && (
          <div className="flex justify-center pt-3 border-t border-border/60">
            <button
              onClick={handleLoadMore}
              disabled={loadingMore}
              className="px-5 py-2.5 bg-secondary hover:bg-secondary-hover text-secondary-foreground text-xs font-semibold rounded-xl border border-border hover:border-muted-foreground/20 shadow-sm transition-all flex items-center space-x-2 disabled:opacity-55"
            >
              {loadingMore ? (
                <>
                  <Loader2 className="w-3.5 h-3.5 animate-spin" />
                  <span>Loading leads...</span>
                </>
              ) : (
                <span>Load more</span>
              )}
            </button>
          </div>
        )}
      </div>
    </div>
  );
}
