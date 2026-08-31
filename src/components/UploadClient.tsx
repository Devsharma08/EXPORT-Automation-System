'use client';

import { useState, useMemo } from 'react';
import type { DatabaseStats, BuyerRecord, FlashMessage } from '@/types';
import FlashMessages from '@/components/FlashMessages';
import Pagination from '@/components/Pagination';

interface Props {
  stats: DatabaseStats;
  initialBuyers: BuyerRecord[];
}

export default function UploadClient({ stats: initialStats, initialBuyers }: Props) {
  const [messages, setMessages] = useState<FlashMessage[]>([]);
  const [uploading, setUploading] = useState(false);
  const [dragging, setDragging] = useState(false);
  const [buyers, setBuyers] = useState<BuyerRecord[]>(initialBuyers);
  const [stats, setStats] = useState<DatabaseStats>(initialStats);
  const [deletingEmail, setDeletingEmail] = useState<string | null>(null);

  // Search & Filter state
  const [search, setSearch] = useState('');
  const [platformFilter, setPlatformFilter] = useState('all');
  const [statusFilter, setStatusFilter] = useState('all');

  // Pagination state
  const [currentPage, setCurrentPage] = useState(1);
  const [pageSize, setPageSize] = useState(10);

  // Distinct platforms for filter
  const platforms = useMemo(() => {
    const set = new Set<string>();
    buyers.forEach((b) => {
      if (b.source_platform) set.add(b.source_platform);
    });
    return Array.from(set).sort();
  }, [buyers]);

  // Filtered buyers
  const filteredBuyers = useMemo(() => {
    const q = search.toLowerCase().trim();
    return buyers.filter((b) => {
      // Platform filter
      if (platformFilter !== 'all' && b.source_platform !== platformFilter) {
        return false;
      }
      // Status filter
      if (statusFilter === 'contacted' && !b.is_sent) return false;
      if (statusFilter === 'pending' && b.is_sent) return false;

      // Text search
      if (!q) return true;
      return (
        (b.buyer_name && b.buyer_name.toLowerCase().includes(q)) ||
        (b.company_name && b.company_name.toLowerCase().includes(q)) ||
        (b.email && b.email.toLowerCase().includes(q)) ||
        (b.website && b.website.toLowerCase().includes(q)) ||
        (b.country && b.country.toLowerCase().includes(q)) ||
        (b.source_platform && b.source_platform.toLowerCase().includes(q))
      );
    });
  }, [buyers, search, platformFilter, statusFilter]);

  // Paginated slice
  const paginatedBuyers = useMemo(() => {
    const start = (currentPage - 1) * pageSize;
    return filteredBuyers.slice(start, start + pageSize);
  }, [filteredBuyers, currentPage, pageSize]);

  // Reset to page 1 on filter changes
  const handleSearchChange = (val: string) => {
    setSearch(val);
    setCurrentPage(1);
  };

  const handlePlatformChange = (val: string) => {
    setPlatformFilter(val);
    setCurrentPage(1);
  };

  const handleStatusChange = (val: string) => {
    setStatusFilter(val);
    setCurrentPage(1);
  };

  const handlePageSizeChange = (size: number) => {
    setPageSize(size);
    setCurrentPage(1);
  };

  async function refreshBuyers() {
    try {
      const res = await fetch('/api/buyers?status=true');
      if (res.ok) {
        const d = await res.json() as { buyers: BuyerRecord[] };
        setBuyers((d.buyers ?? []).reverse());
      }
      const sRes = await fetch('/api/stats');
      if (sRes.ok) {
        const sData = await sRes.json() as { stats: DatabaseStats };
        if (sData.stats) setStats(sData.stats);
      }
    } catch {
      // ignore
    }
  }

  async function handleUpload(file: File) {
    if (!file.name.toLowerCase().endsWith('.csv')) {
      setMessages([{ category: 'error', message: 'Only CSV files are accepted.' }]);
      return;
    }
    setUploading(true);
    setMessages([]);
    const form = new FormData();
    form.append('file', file);
    try {
      const res = await fetch('/api/buyers/upload', { method: 'POST', body: form });
      const data = await res.json() as { message?: string; error?: string };
      if (res.ok) {
        setMessages([{ category: 'success', message: data.message ?? 'Upload successful!' }]);
        await refreshBuyers();
      } else {
        setMessages([{ category: 'error', message: data.error ?? 'Upload failed.' }]);
      }
    } catch {
      setMessages([{ category: 'error', message: 'Network error.' }]);
    } finally {
      setUploading(false);
    }
  }

  async function handleDeleteBuyer(email: string) {
    if (!confirm(`Are you sure you want to remove ${email} from the leads database?`)) return;
    setDeletingEmail(email);
    try {
      const res = await fetch(`/api/buyers?email=${encodeURIComponent(email)}`, { method: 'DELETE' });
      const data = await res.json() as { message?: string; error?: string };
      if (res.ok) {
        setMessages([{ category: 'success', message: data.message ?? 'Lead removed.' }]);
        setBuyers((prev) => prev.filter((b) => b.email.toLowerCase() !== email.toLowerCase()));
      } else {
        setMessages([{ category: 'error', message: data.error ?? 'Failed to delete.' }]);
      }
    } catch {
      setMessages([{ category: 'error', message: 'Network error while deleting.' }]);
    } finally {
      setDeletingEmail(null);
    }
  }

  const contactedCount = buyers.filter((b) => b.is_sent).length;
  const pendingCount = buyers.length - contactedCount;

  return (
    <>
      <div className="page-header">
        <div className="breadcrumb"><span>Pipeline</span> / Discovered Leads & Database</div>
        <h2>Leads Database & Upload</h2>
        <p>Explore, search, and manage all scanned and imported buyer leads</p>
      </div>

      <FlashMessages messages={messages} />

      <div className="grid-2">
        {/* Upload Zone */}
        <div className="card">
          <div className="card-title">Import CSV File</div>
          <div className="card-subtitle">Columns are auto-mapped to the database schema</div>
          <div
            className={`drop-zone${dragging ? ' dragover' : ''}`}
            onDragOver={(e) => { e.preventDefault(); setDragging(true); }}
            onDragLeave={() => setDragging(false)}
            onDrop={(e) => {
              e.preventDefault();
              setDragging(false);
              const file = e.dataTransfer.files[0];
              if (file) handleUpload(file);
            }}
          >
            <input
              id="csv-upload"
              type="file"
              accept=".csv"
              onChange={(e) => { const f = e.target.files?.[0]; if (f) handleUpload(f); }}
            />
            <div className="drop-zone-icon">
              {uploading ? <div className="spinner" /> : (
                <svg viewBox="0 0 24 24" fill="none" stroke="currentColor">
                  <path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round"/>
                  <polyline points="17 8 12 3 7 8" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round"/>
                  <line x1="12" y1="3" x2="12" y2="15" strokeWidth="1.8" strokeLinecap="round"/>
                </svg>
              )}
            </div>
            <h3>{uploading ? 'Uploading…' : 'Drop CSV here or click to browse'}</h3>
            <p>Accepted: .csv · Automatic duplicate checking</p>
          </div>

          {/* Schema Reference */}
          <div style={{ marginTop: 20 }}>
            <div className="text-xs text-muted font-semibold" style={{ marginBottom: 8, textTransform: 'uppercase', letterSpacing: '0.05em' }}>
              Expected Columns
            </div>
            <div style={{ display: 'flex', flexWrap: 'wrap', gap: 6 }}>
              {['buyer_name', 'company_name', 'email', 'website', 'country', 'source_platform', 'discovered_at'].map((col) => (
                <span key={col} className="badge badge-amber">{col}</span>
              ))}
            </div>
          </div>
        </div>

        {/* Database Stats */}
        <div className="card">
          <div className="card-title">Database Overview</div>
          <div className="card-subtitle">Current lead pipeline and contact distribution</div>
          <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
            <div className="flex justify-between items-center" style={{ padding: '10px 14px', background: 'var(--bg-elevated)', borderRadius: 'var(--radius-sm)', border: '1px solid var(--border)' }}>
              <span className="text-sm text-muted">Total Scanned / Saved Leads</span>
              <span className="text-sm font-semibold text-amber">{buyers.length}</span>
            </div>
            <div className="flex justify-between items-center" style={{ padding: '10px 14px', background: 'rgba(59, 130, 246, 0.08)', borderRadius: 'var(--radius-sm)', border: '1px solid rgba(59, 130, 246, 0.25)' }}>
              <span className="text-sm" style={{ color: '#93c5fd' }}>✓ Already Contacted / Sent</span>
              <span className="text-sm font-semibold" style={{ color: '#60a5fa' }}>{contactedCount}</span>
            </div>
            <div className="flex justify-between items-center" style={{ padding: '10px 14px', background: 'rgba(245, 158, 11, 0.08)', borderRadius: 'var(--radius-sm)', border: '1px solid rgba(245, 158, 11, 0.25)' }}>
              <span className="text-sm" style={{ color: '#fde68a' }}>⏳ Pending Outreach (Uncontacted)</span>
              <span className="text-sm font-semibold" style={{ color: '#f59e0b' }}>{pendingCount}</span>
            </div>
            <div className="flex justify-between items-center" style={{ padding: '10px 14px', background: 'var(--bg-elevated)', borderRadius: 'var(--radius-sm)', border: '1px solid var(--border)' }}>
              <span className="text-sm text-muted">Total Historical Email Sends</span>
              <span className="text-sm font-semibold text-green">{stats.sent_success}</span>
            </div>
            <div className="flex justify-between items-center" style={{ padding: '10px 14px', background: 'var(--bg-elevated)', borderRadius: 'var(--radius-sm)', border: '1px solid var(--border)' }}>
              <span className="text-sm text-muted">Database File Size</span>
              <span className="text-sm font-semibold text-muted">{stats.buyers_csv_size} KB</span>
            </div>
          </div>
        </div>
      </div>

      {/* Discovered Buyers Table Explorer */}
      <div className="card mt-6" style={{ marginTop: 24 }}>
        <div className="flex justify-between items-center" style={{ flexWrap: 'wrap', gap: 12 }}>
          <div>
            <div className="card-title" style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
              <span>Discovered Buyer Leads ({filteredBuyers.length})</span>
              {filteredBuyers.length !== buyers.length && (
                <span className="text-xs text-muted font-normal">(filtered from {buyers.length} total)</span>
              )}
            </div>
            <div className="card-subtitle">All leads extracted via Search/Scraping APIs and CSV uploads</div>
          </div>
          <button
            type="button"
            className="btn btn-secondary"
            onClick={refreshBuyers}
            title="Refresh list from database"
            style={{ padding: '6px 14px', fontSize: '0.8rem' }}
          >
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" width="14" height="14">
              <path d="M23 4v6h-6M1 20v-6h6" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
              <path d="M3.51 9a9 9 0 0 1 14.85-3.36L23 10M1 14l4.64 4.36A9 9 0 0 0 20.49 15" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
            </svg>
            Refresh
          </button>
        </div>

        {/* Toolbar: Search, Platform Filter, Status Filter */}
        <div className="table-toolbar">
          <div className="table-toolbar-left">
            <input
              type="text"
              placeholder="Search by name, company, email, country…"
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
                onChange={(e) => handleStatusChange(e.target.value)}
                className="table-filter-select"
              >
                <option value="all">All Statuses ({buyers.length})</option>
                <option value="pending">⏳ Pending Outreach ({pendingCount})</option>
                <option value="contacted">✓ Contacted ({contactedCount})</option>
              </select>
            </div>

            {/* Platform Filter */}
            <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
              <span className="text-xs text-muted">Source:</span>
              <select
                value={platformFilter}
                onChange={(e) => handlePlatformChange(e.target.value)}
                className="table-filter-select"
              >
                <option value="all">All Sources</option>
                {platforms.map((p) => (
                  <option key={p} value={p}>
                    {p}
                  </option>
                ))}
              </select>
            </div>
          </div>
        </div>

        {filteredBuyers.length === 0 ? (
          <div className="empty-state">
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor">
              <path d="M17 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2" strokeWidth="1.5"/>
              <circle cx="9" cy="7" r="4" strokeWidth="1.5"/>
            </svg>
            <p>
              {buyers.length === 0
                ? 'No buyers in the database yet. Run a search or upload a CSV.'
                : 'No buyer leads match the active filters.'}
            </p>
            {buyers.length > 0 && (
              <button
                type="button"
                className="btn btn-secondary"
                onClick={() => { setSearch(''); setPlatformFilter('all'); setStatusFilter('all'); }}
                style={{ marginTop: 12 }}
              >
                Clear Filters
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
                    <th>Buyer / Company</th>
                    <th>Email Address</th>
                    <th>Source & Website</th>
                    <th>Country</th>
                    <th>Outreach Status</th>
                    <th>Discovered</th>
                    <th style={{ textAlign: 'right' }}>Actions</th>
                  </tr>
                </thead>
                <tbody>
                  {paginatedBuyers.map((b, i) => {
                    const globalIdx = (currentPage - 1) * pageSize + i + 1;
                    return (
                      <tr key={b.email + i}>
                        <td style={{ color: 'var(--text-muted)', fontSize: '0.75rem' }}>{globalIdx}</td>
                        <td>
                          <div className="td-primary" style={{ maxWidth: 220, overflow: 'hidden', textOverflow: 'ellipsis' }}>
                            {b.buyer_name || b.company_name || 'Export Buyer'}
                          </div>
                          {b.company_name && b.company_name !== b.buyer_name && (
                            <div className="text-xs text-muted" style={{ maxWidth: 220, overflow: 'hidden', textOverflow: 'ellipsis' }}>
                              {b.company_name}
                            </div>
                          )}
                        </td>
                        <td>
                          <span style={{ fontFamily: 'monospace', fontSize: '0.82rem', color: 'var(--text-primary)' }}>
                            {b.email}
                          </span>
                        </td>
                        <td>
                          <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
                            <span className="badge badge-amber">{b.source_platform || 'Web'}</span>
                            {b.website && (
                              <a
                                href={b.website.startsWith('http') ? b.website : `https://${b.website}`}
                                target="_blank"
                                rel="noreferrer"
                                title={b.website}
                                style={{ color: 'var(--text-muted)', display: 'inline-flex' }}
                              >
                                <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" width="13" height="13">
                                  <path d="M18 13v6a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V8a2 2 0 0 1 2-2h6" strokeWidth="2"/>
                                  <polyline points="15 3 21 3 21 9" strokeWidth="2"/>
                                  <line x1="10" y1="14" x2="21" y2="3" strokeWidth="2"/>
                                </svg>
                              </a>
                            )}
                          </div>
                        </td>
                        <td>
                          <span className="text-xs" style={{ color: b.country ? 'var(--text-secondary)' : 'var(--text-muted)' }}>
                            {b.country || '—'}
                          </span>
                        </td>
                        <td>
                          {b.is_sent ? (
                            <span className="badge badge-contacted" title={b.last_sent_at ? `Sent on ${new Date(b.last_sent_at).toLocaleString()}` : 'Previously contacted'}>
                              ✓ Contacted
                            </span>
                          ) : (
                            <span className="badge badge-pending">
                              ⏳ Ready to Send
                            </span>
                          )}
                        </td>
                        <td>
                          <span className="text-xs text-muted">
                            {b.discovered_at ? new Date(b.discovered_at).toLocaleDateString() : '—'}
                          </span>
                        </td>
                        <td style={{ textAlign: 'right' }}>
                          <button
                            type="button"
                            onClick={() => handleDeleteBuyer(b.email)}
                            disabled={deletingEmail === b.email}
                            title="Remove buyer lead"
                            style={{
                              background: 'transparent',
                              color: 'var(--text-muted)',
                              padding: 6,
                              borderRadius: 4,
                              transition: 'color var(--transition)',
                              display: 'inline-flex',
                            }}
                            onMouseEnter={(e) => { e.currentTarget.style.color = 'var(--red)'; }}
                            onMouseLeave={(e) => { e.currentTarget.style.color = 'var(--text-muted)'; }}
                          >
                            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" width="14" height="14">
                              <polyline points="3 6 5 6 21 6" strokeWidth="1.8"/>
                              <path d="M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6m3 0V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2" strokeWidth="1.8"/>
                            </svg>
                          </button>
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
              totalItems={filteredBuyers.length}
              pageSize={pageSize}
              onPageChange={setCurrentPage}
              onPageSizeChange={handlePageSizeChange}
              pageSizeOptions={[10, 25, 50, 100]}
              itemLabel="buyer leads"
            />
          </>
        )}
      </div>
    </>
  );
}
