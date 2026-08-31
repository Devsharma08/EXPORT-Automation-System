'use client';

import { useState, useMemo } from 'react';
import Link from 'next/link';
import type { ReportData, SentLogRecord } from '@/types';
import Pagination from '@/components/Pagination';

interface Props {
  report: ReportData;
  sentLog: SentLogRecord[];
}

function statusBadge(status: string) {
  if (status === 'sent') return <span className="badge badge-success">✓ Sent</span>;
  return <span className="badge badge-error">✗ Failed</span>;
}

export default function ReportClient({ report, sentLog }: Props) {
  const [search, setSearch] = useState('');
  const [statusFilter, setStatusFilter] = useState<'all' | 'sent' | 'failed'>('all');
  const [sortOrder, setSortOrder] = useState<'desc' | 'asc'>('desc');
  const [currentPage, setCurrentPage] = useState(1);
  const [pageSize, setPageSize] = useState(15);

  // Filter and sort the entire sent log
  const filteredLog = useMemo(() => {
    const q = search.toLowerCase().trim();
    let records = sentLog.filter((row) => {
      if (statusFilter !== 'all' && row.status !== statusFilter) return false;
      if (!q) return true;
      return (
        (row.email && row.email.toLowerCase().includes(q)) ||
        (row.subject && row.subject.toLowerCase().includes(q))
      );
    });

    // Sort by timestamp
    records = [...records].sort((a, b) => {
      const timeA = new Date(a.timestamp).getTime() || 0;
      const timeB = new Date(b.timestamp).getTime() || 0;
      return sortOrder === 'desc' ? timeB - timeA : timeA - timeB;
    });

    return records;
  }, [sentLog, search, statusFilter, sortOrder]);

  // Paginate
  const paginatedLog = useMemo(() => {
    const start = (currentPage - 1) * pageSize;
    return filteredLog.slice(start, start + pageSize);
  }, [filteredLog, currentPage, pageSize]);

  const handleSearchChange = (val: string) => {
    setSearch(val);
    setCurrentPage(1);
  };

  const handleStatusFilterChange = (val: 'all' | 'sent' | 'failed') => {
    setStatusFilter(val);
    setCurrentPage(1);
  };

  const handlePageSizeChange = (size: number) => {
    setPageSize(size);
    setCurrentPage(1);
  };

  const totalSuccess = sentLog.filter((s) => s.status === 'sent').length;
  const totalFailed = sentLog.filter((s) => s.status === 'failed').length;

  return (
    <>
      <div className="page-header">
        <div className="breadcrumb"><span>Reports</span> / View Report</div>
        <h2>Campaign Report & Sent History</h2>
        <p>Complete record of all email outreach activity and delivery performance</p>
      </div>

      {/* Summary Stats Grid */}
      <div className="stats-grid">
        <div className="stat-card">
          <div className="stat-icon">
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor">
              <path d="M17 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2" strokeWidth="1.8" strokeLinecap="round" />
              <circle cx="9" cy="7" r="4" strokeWidth="1.8" />
            </svg>
          </div>
          <div className="stat-value">{report.total_buyers ?? 0}</div>
          <div className="stat-label">Total Buyers in DB</div>
        </div>

        <div className="stat-card green">
          <div className="stat-icon">
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor">
              <polyline points="20 6 9 17 4 12" strokeWidth="1.8" strokeLinecap="round" />
            </svg>
          </div>
          <div className="stat-value">{totalSuccess}</div>
          <div className="stat-label">Total Emails Sent</div>
        </div>

        <div className="stat-card red">
          <div className="stat-icon">
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor">
              <circle cx="12" cy="12" r="10" strokeWidth="1.8" />
              <line x1="15" y1="9" x2="9" y2="15" strokeWidth="1.8" strokeLinecap="round" />
              <line x1="9" y1="9" x2="15" y2="15" strokeWidth="1.8" strokeLinecap="round" />
            </svg>
          </div>
          <div className="stat-value">{totalFailed}</div>
          <div className="stat-label">Total Failed</div>
        </div>

        <div className="stat-card blue">
          <div className="stat-icon">
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor">
              <polyline points="22 12 18 12 15 21 9 3 6 12 2 12" strokeWidth="1.8" strokeLinecap="round" />
            </svg>
          </div>
          <div className="stat-value">{report.success_rate}%</div>
          <div className="stat-label">Success Rate</div>
        </div>
      </div>

      <div className="grid-2">
        {/* Report Details */}
        <div className="card">
          <div className="card-title">Report Summary</div>
          <div style={{ display: 'flex', flexDirection: 'column', gap: 10, marginTop: 12 }}>
            {[
              { label: 'Type', value: report.run_type === 'campaign' ? 'Latest Campaign Run' : 'Historical Lifetime Summary' },
              { label: 'Generated At', value: new Date(report.generated_at).toLocaleString() },
              { label: 'Total Historical Attempts', value: sentLog.length },
              { label: 'Successful Dispatches', value: totalSuccess },
              { label: 'Failed Dispatches', value: totalFailed },
              { label: 'Sent Log File Size', value: `${report.sent_log_size ?? 0} KB` },
            ].map((row) => (
              <div
                key={row.label}
                className="flex justify-between"
                style={{
                  padding: '9px 14px',
                  background: 'var(--bg-elevated)',
                  borderRadius: 'var(--radius-sm)',
                  border: '1px solid var(--border)',
                  fontSize: '0.85rem',
                }}
              >
                <span className="text-muted">{row.label}</span>
                <span className="font-semibold">{row.value}</span>
              </div>
            ))}
          </div>
        </div>

        {/* Success Rate Gauge & Export */}
        <div className="card">
          <div className="card-title">Delivery Rate</div>
          <div style={{ textAlign: 'center', padding: '16px 0' }}>
            <div
              style={{
                fontSize: '3rem',
                fontWeight: 700,
                color:
                  report.success_rate >= 80
                    ? 'var(--green)'
                    : report.success_rate >= 50
                    ? 'var(--amber)'
                    : 'var(--red)',
                letterSpacing: '-0.04em',
              }}
            >
              {report.success_rate}%
            </div>
            <p className="text-sm text-muted" style={{ marginTop: 4 }}>
              {totalSuccess} delivered · {totalFailed} failed out of {sentLog.length} attempts
            </p>
          </div>
          <div className="progress-bar" style={{ height: 10 }}>
            <div className="progress-fill" style={{ width: `${report.success_rate}%` }} />
          </div>
          <div style={{ marginTop: 20 }}>
            <Link
              href="/api/report/download"
              className="btn btn-secondary w-full"
              style={{ justifyContent: 'center' }}
            >
              <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" width="16" height="16">
                <path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4" strokeWidth="1.8" strokeLinecap="round" />
                <polyline points="7 10 12 15 17 10" strokeWidth="1.8" strokeLinecap="round" />
                <line x1="12" y1="15" x2="12" y2="3" strokeWidth="1.8" strokeLinecap="round" />
              </svg>
              Download Complete CSV Log
            </Link>
          </div>
        </div>
      </div>

      {/* Complete Historical Sent Log Explorer */}
      <div className="card" style={{ marginTop: 24 }}>
        <div className="flex justify-between items-center" style={{ flexWrap: 'wrap', gap: 12 }}>
          <div>
            <div className="card-title" style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
              <span>Historical Send Log ({filteredLog.length} Records)</span>
              {filteredLog.length !== sentLog.length && (
                <span className="text-xs text-muted font-normal">(filtered from {sentLog.length} total)</span>
              )}
            </div>
            <div className="card-subtitle">All past outreach dispatches recorded in the database</div>
          </div>
        </div>

        {/* Toolbar: Search, Status Filter, Sort */}
        <div className="table-toolbar">
          <div className="table-toolbar-left">
            <input
              type="text"
              placeholder="Search sent log by email address or subject line…"
              value={search}
              onChange={(e) => handleSearchChange(e.target.value)}
              className="table-search-input"
            />
          </div>

          <div className="table-toolbar-right">
            {/* Status Filter */}
            <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
              <span className="text-xs text-muted">Status:</span>
              <select
                value={statusFilter}
                onChange={(e) => handleStatusFilterChange(e.target.value as 'all' | 'sent' | 'failed')}
                className="table-filter-select"
              >
                <option value="all">All Statuses ({sentLog.length})</option>
                <option value="sent">✓ Sent ({totalSuccess})</option>
                <option value="failed">✗ Failed ({totalFailed})</option>
              </select>
            </div>

            {/* Sort Order */}
            <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
              <span className="text-xs text-muted">Order:</span>
              <select
                value={sortOrder}
                onChange={(e) => setSortOrder(e.target.value as 'desc' | 'asc')}
                className="table-filter-select"
              >
                <option value="desc">Newest First</option>
                <option value="asc">Oldest First</option>
              </select>
            </div>
          </div>
        </div>

        {filteredLog.length === 0 ? (
          <div className="empty-state">
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor">
              <circle cx="12" cy="12" r="10" strokeWidth="1.5" />
              <line x1="12" y1="8" x2="12" y2="12" strokeWidth="1.5" strokeLinecap="round" />
              <line x1="12" y1="16" x2="12.01" y2="16" strokeWidth="2" strokeLinecap="round" />
            </svg>
            <p>
              {sentLog.length === 0
                ? 'No emails have been sent yet. Launch a campaign to see records here.'
                : 'No sent email records match the active search/filters.'}
            </p>
            {sentLog.length > 0 && (
              <button
                type="button"
                className="btn btn-secondary"
                onClick={() => { setSearch(''); setStatusFilter('all'); }}
                style={{ marginTop: 12 }}
              >
                Clear Search Filters
              </button>
            )}
          </div>
        ) : (
          <>
            <div className="table-wrap">
              <table>
                <thead>
                  <tr>
                    <th style={{ width: 40 }}>#</th>
                    <th>Recipient Email</th>
                    <th>Status</th>
                    <th>Timestamp</th>
                    <th>Subject Line</th>
                  </tr>
                </thead>
                <tbody>
                  {paginatedLog.map((row, i) => {
                    const globalIdx = (currentPage - 1) * pageSize + i + 1;
                    return (
                      <tr key={row.email + row.timestamp + i}>
                        <td style={{ color: 'var(--text-muted)', fontSize: '0.75rem' }}>{globalIdx}</td>
                        <td className="td-primary">
                          <span style={{ fontFamily: 'monospace', fontSize: '0.82rem' }}>
                            {row.email}
                          </span>
                        </td>
                        <td>{statusBadge(row.status)}</td>
                        <td>
                          <span className="text-xs" style={{ color: 'var(--text-secondary)' }}>
                            {row.timestamp ? new Date(row.timestamp).toLocaleString() : '—'}
                          </span>
                        </td>
                        <td style={{ maxWidth: 300, overflow: 'hidden', textOverflow: 'ellipsis' }}>
                          <span className="text-xs text-muted" title={row.subject}>
                            {row.subject || '—'}
                          </span>
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>

            {/* Pagination Controls */}
            <Pagination
              currentPage={currentPage}
              totalItems={filteredLog.length}
              pageSize={pageSize}
              onPageChange={setCurrentPage}
              onPageSizeChange={handlePageSizeChange}
              pageSizeOptions={[10, 15, 25, 50, 100]}
              itemLabel="sent records"
            />
          </>
        )}
      </div>
    </>
  );
}
