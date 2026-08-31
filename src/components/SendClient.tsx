'use client';

import { useState, useMemo } from 'react';
import type { FlashMessage, AppSettings, ReportData, BuyerRecord } from '@/types';
import FlashMessages from '@/components/FlashMessages';
import Pagination from '@/components/Pagination';

interface AttachmentInfo {
  exists: boolean;
  filename: string;
  size_kb: number;
}

interface Props {
  settings: AppSettings;
  attachment: AttachmentInfo;
  biz_count: number;
  ind_count: number;
  all_count: number;
  buyers: BuyerRecord[];
}

export default function SendClient({
  settings,
  attachment,
  buyers: initialBuyers,
}: Props) {
  const [messages, setMessages] = useState<FlashMessage[]>([]);
  const [sending, setSending] = useState(false);
  const [subject, setSubject] = useState(settings.default_subject);
  const [body, setBody] = useState(settings.default_body);
  const [useAttachment, setUseAttachment] = useState(true);

  // Outreach Mode: 'safe' (unsent only) vs 'force' (all leads)
  const [sendMode, setSendMode] = useState<'safe' | 'force'>('safe');

  // Preview table search & filter
  const [previewSearch, setPreviewSearch] = useState('');
  const [previewStatusFilter, setPreviewStatusFilter] = useState<'all' | 'pending' | 'contacted'>('all');
  const [currentPage, setCurrentPage] = useState(1);
  const [pageSize, setPageSize] = useState(10);

  const [buyersList, setBuyersList] = useState<BuyerRecord[]>(initialBuyers);

  // Selection state: Map of lowercase email -> boolean
  const [selectedEmails, setSelectedEmails] = useState<Set<string>>(() => {
    const set = new Set<string>();
    // By default, select all valid buyer emails
    initialBuyers.forEach((b) => {
      if (b.email) set.add(b.email.toLowerCase().trim());
    });
    return set;
  });

  const totalBuyersCount = buyersList.length;
  const contactedBuyersCount = buyersList.filter((b) => b.is_sent).length;
  const pendingBuyersCount = totalBuyersCount - contactedBuyersCount;

  // Compute the list of leads that will actually receive an email given current mode and selections
  const effectiveRecipients = useMemo(() => {
    return buyersList.filter((b) => {
      const email = (b.email ?? '').toLowerCase().trim();
      if (!email || !selectedEmails.has(email)) return false;
      if (sendMode === 'safe' && b.is_sent) return false;
      return true;
    });
  }, [buyersList, selectedEmails, sendMode]);

  // Preview table filtering
  const filteredPreviewBuyers = useMemo(() => {
    const q = previewSearch.toLowerCase().trim();
    return buyersList.filter((b) => {
      if (previewStatusFilter === 'pending' && b.is_sent) return false;
      if (previewStatusFilter === 'contacted' && !b.is_sent) return false;

      if (!q) return true;
      return (
        (b.buyer_name && b.buyer_name.toLowerCase().includes(q)) ||
        (b.company_name && b.company_name.toLowerCase().includes(q)) ||
        (b.email && b.email.toLowerCase().includes(q)) ||
        (b.source_platform && b.source_platform.toLowerCase().includes(q))
      );
    });
  }, [buyersList, previewSearch, previewStatusFilter]);

  const paginatedPreviewBuyers = useMemo(() => {
    const start = (currentPage - 1) * pageSize;
    return filteredPreviewBuyers.slice(start, start + pageSize);
  }, [filteredPreviewBuyers, currentPage, pageSize]);

  // Select all / Deselect all
  const toggleSelectAll = () => {
    if (selectedEmails.size === buyersList.length) {
      setSelectedEmails(new Set());
    } else {
      const all = new Set<string>();
      buyersList.forEach((b) => {
        if (b.email) all.add(b.email.toLowerCase().trim());
      });
      setSelectedEmails(all);
    }
  };

  const toggleSelectEmail = (email: string) => {
    const low = email.toLowerCase().trim();
    setSelectedEmails((prev) => {
      const next = new Set(prev);
      if (next.has(low)) next.delete(low);
      else next.add(low);
      return next;
    });
  };

  async function handleSend(e: React.FormEvent) {
    e.preventDefault();
    if (!subject.trim() || !body.trim()) {
      setMessages([{ category: 'error', message: 'Subject and body are required.' }]);
      return;
    }

    if (effectiveRecipients.length === 0) {
      setMessages([
        {
          category: 'error',
          message:
            sendMode === 'safe'
              ? 'No pending (uncontacted) leads selected. Switch to "Force Re-send" if you wish to email already-contacted leads.'
              : 'No recipient leads selected. Please check at least one lead.',
        },
      ]);
      return;
    }

    setSending(true);
    setMessages([]);

    try {
      const payload = {
        subject,
        body,
        audience: 'all',
        use_attachment: useAttachment,
        force_resend: sendMode === 'force',
        selected_emails: effectiveRecipients.map((r) => r.email),
      };

      const res = await fetch('/api/send', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload),
      });

      const data = await res.json() as { message?: string; error?: string; report?: ReportData };

      if (res.ok) {
        setMessages([{ category: 'success', message: data.message ?? 'Campaign launched successfully!' }]);
        // Refresh buyers list to update contacted status
        const bRes = await fetch('/api/buyers?status=true');
        if (bRes.ok) {
          const bData = await bRes.json() as { buyers: BuyerRecord[] };
          setBuyersList((bData.buyers ?? []).reverse());
        }
      } else {
        setMessages([{ category: 'error', message: data.error ?? 'Campaign failed.' }]);
      }
    } catch {
      setMessages([{ category: 'error', message: 'Network error occurred while launching campaign.' }]);
    } finally {
      setSending(false);
    }
  }

  return (
    <>
      <div className="page-header">
        <div className="breadcrumb"><span>Pipeline</span> / Send Campaign</div>
        <h2>Send Campaign</h2>
        <p>Compose and dispatch tailored email outreach to discovered buyers</p>
      </div>

      <FlashMessages messages={messages} />

      {/* Pipeline Status Breakdown Cards */}
      <div className="stats-grid" style={{ marginBottom: 24 }}>
        <div className="stat-card">
          <div className="stat-icon">
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor">
              <path d="M17 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2" strokeWidth="1.8" strokeLinecap="round" />
              <circle cx="9" cy="7" r="4" strokeWidth="1.8" />
            </svg>
          </div>
          <div className="stat-value">{totalBuyersCount}</div>
          <div className="stat-label">Total Leads Scanned</div>
        </div>

        <div className="stat-card" style={{ borderColor: 'rgba(59, 130, 246, 0.3)' }}>
          <div className="stat-icon" style={{ background: 'rgba(59, 130, 246, 0.15)', color: '#3b82f6' }}>
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor">
              <polyline points="20 6 9 17 4 12" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
            </svg>
          </div>
          <div className="stat-value" style={{ color: '#60a5fa' }}>{contactedBuyersCount}</div>
          <div className="stat-label">Already Contacted</div>
        </div>

        <div className="stat-card" style={{ borderColor: 'rgba(245, 158, 11, 0.4)' }}>
          <div className="stat-icon" style={{ background: 'rgba(245, 158, 11, 0.15)', color: 'var(--amber)' }}>
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor">
              <circle cx="12" cy="12" r="10" strokeWidth="1.8" />
              <polyline points="12 6 12 12 16 14" strokeWidth="1.8" strokeLinecap="round" />
            </svg>
          </div>
          <div className="stat-value" style={{ color: 'var(--amber)' }}>{pendingBuyersCount}</div>
          <div className="stat-label">Pending Outreach (Uncontacted)</div>
        </div>

        <div className="stat-card green">
          <div className="stat-icon">
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor">
              <line x1="22" y1="2" x2="11" y2="13" strokeWidth="1.8" strokeLinecap="round" />
              <polygon points="22 2 15 22 11 13 2 9 22 2" strokeWidth="1.8" strokeLinecap="round" />
            </svg>
          </div>
          <div className="stat-value">{effectiveRecipients.length}</div>
          <div className="stat-label">Target Outreach Queue</div>
        </div>
      </div>

      <form onSubmit={handleSend}>
        <div className="grid-2">
          {/* Compose Card */}
          <div className="card" style={{ gridColumn: '1', gridRow: '1' }}>
            <div className="card-title">Compose Email</div>
            <div className="card-subtitle">Use the pre-styled B2B HTML template below or edit subject and body</div>

            <div className="form-group">
              <label className="form-label" htmlFor="email-subject">
                Subject Line
              </label>
              <input
                id="email-subject"
                className="form-input"
                value={subject}
                onChange={(e) => setSubject(e.target.value)}
                placeholder="e.g. Premium Crystal & Glass Candle Holders — Bulk Export Range"
                required
              />
            </div>

            <div className="form-group">
              <label className="form-label" htmlFor="email-body">
                Email Body (HTML or Plaintext)
              </label>
              <textarea
                id="email-body"
                className="form-textarea"
                value={body}
                onChange={(e) => setBody(e.target.value)}
                style={{ minHeight: 280 }}
                placeholder="Paste your HTML template here..."
                required
              />
            </div>
          </div>

          {/* Right Sidebar: Outreach Mode & Attachment Settings */}
          <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
            {/* Outreach Dispatch Mode */}
            <div className="card">
              <div className="card-title">Outreach Dispatch Mode</div>
              <div className="card-subtitle">Control duplicate filtering & contact policy</div>

              <div style={{ display: 'flex', flexDirection: 'column', gap: 10, marginTop: 12 }}>
                <label
                  style={{
                    display: 'flex',
                    alignItems: 'flex-start',
                    gap: 10,
                    padding: '12px',
                    borderRadius: 'var(--radius-sm)',
                    background: sendMode === 'safe' ? 'rgba(245, 158, 11, 0.08)' : 'var(--bg-elevated)',
                    border: `1px solid ${sendMode === 'safe' ? 'var(--amber)' : 'var(--border)'}`,
                    cursor: 'pointer',
                    transition: 'all var(--transition)',
                  }}
                >
                  <input
                    type="radio"
                    name="outreach_mode"
                    checked={sendMode === 'safe'}
                    onChange={() => setSendMode('safe')}
                    style={{ accentColor: 'var(--amber)', marginTop: 3, cursor: 'pointer' }}
                  />
                  <div>
                    <div style={{ fontSize: '0.85rem', fontWeight: 600, color: 'var(--text-primary)' }}>
                      Safe Mode: Send to Uncontacted Only
                      <span className="badge badge-pending" style={{ marginLeft: 8 }}>Recommended</span>
                    </div>
                    <div className="text-xs text-muted" style={{ marginTop: 2 }}>
                      Skips the {contactedBuyersCount} already-contacted leads and dispatches only to the {pendingBuyersCount} new leads.
                    </div>
                  </div>
                </label>

                <label
                  style={{
                    display: 'flex',
                    alignItems: 'flex-start',
                    gap: 10,
                    padding: '12px',
                    borderRadius: 'var(--radius-sm)',
                    background: sendMode === 'force' ? 'rgba(59, 130, 246, 0.08)' : 'var(--bg-elevated)',
                    border: `1px solid ${sendMode === 'force' ? 'var(--blue)' : 'var(--border)'}`,
                    cursor: 'pointer',
                    transition: 'all var(--transition)',
                  }}
                >
                  <input
                    type="radio"
                    name="outreach_mode"
                    checked={sendMode === 'force'}
                    onChange={() => setSendMode('force')}
                    style={{ accentColor: 'var(--blue)', marginTop: 3, cursor: 'pointer' }}
                  />
                  <div>
                    <div style={{ fontSize: '0.85rem', fontWeight: 600, color: 'var(--text-primary)' }}>
                      Force Re-send: Send to All Discovered Leads
                    </div>
                    <div className="text-xs text-muted" style={{ marginTop: 2 }}>
                      Sends emails to all {totalBuyersCount} selected leads regardless of past campaign history.
                    </div>
                  </div>
                </label>
              </div>
            </div>

            {/* Presentation Attachment */}
            <div className="card">
              <div className="card-title">Attachment</div>
              <div
                style={{
                  display: 'flex',
                  alignItems: 'center',
                  gap: 12,
                  padding: '12px',
                  background: 'var(--bg-elevated)',
                  borderRadius: 'var(--radius-sm)',
                  border: '1px solid var(--border)',
                  marginTop: 10,
                }}
              >
                <input
                  type="checkbox"
                  id="use-attachment"
                  checked={useAttachment}
                  onChange={(e) => setUseAttachment(e.target.checked)}
                  style={{ accentColor: 'var(--amber)', width: 16, height: 16, cursor: 'pointer' }}
                />
                <div>
                  <label htmlFor="use-attachment" className="text-sm font-semibold" style={{ cursor: 'pointer' }}>
                    {attachment.exists ? attachment.filename : 'No presentation file found'}
                  </label>
                  {attachment.exists && (
                    <p className="text-xs text-muted">{attachment.size_kb} KB · Attached to each outreach email</p>
                  )}
                </div>
                {!attachment.exists && (
                  <span className="badge badge-error" style={{ marginLeft: 'auto' }}>
                    Missing
                  </span>
                )}
              </div>
            </div>

            {/* Campaign Limits & SMTP Account */}
            <div className="card">
              <div className="card-title">System & Rate Limits</div>
              <div style={{ display: 'flex', flexDirection: 'column', gap: 8, marginTop: 10 }}>
                <div className="flex justify-between" style={{ fontSize: '0.82rem' }}>
                  <span className="text-muted">Daily Send Limit</span>
                  <span className="font-semibold">{settings.daily_send_limit} emails</span>
                </div>
                <div className="flex justify-between" style={{ fontSize: '0.82rem' }}>
                  <span className="text-muted">Delay Between Emails</span>
                  <span className="font-semibold">{settings.send_delay}s</span>
                </div>
                <div className="flex justify-between" style={{ fontSize: '0.82rem' }}>
                  <span className="text-muted">Sender Account</span>
                  <span className="font-semibold text-xs text-amber" style={{ maxWidth: 160, overflow: 'hidden', textOverflow: 'ellipsis' }}>
                    {settings.email || 'Not configured'}
                  </span>
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* Audience Preview Table with Pagination */}
        <div className="card mt-6" style={{ marginTop: 24 }}>
          <div className="flex justify-between items-center" style={{ flexWrap: 'wrap', gap: 12 }}>
            <div>
              <div className="card-title" style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                <span>Audience Recipient Queue ({effectiveRecipients.length} Selected to Send)</span>
              </div>
              <div className="card-subtitle">
                Review the exact list of leads that will receive outreach emails in this campaign
              </div>
            </div>

            <div style={{ display: 'flex', gap: 8 }}>
              <button
                type="button"
                className="btn btn-secondary"
                onClick={toggleSelectAll}
                style={{ padding: '6px 12px', fontSize: '0.78rem' }}
              >
                {selectedEmails.size === buyersList.length ? 'Deselect All' : 'Select All Leads'}
              </button>
            </div>
          </div>

          {/* Search & Filter Toolbar */}
          <div className="table-toolbar">
            <div className="table-toolbar-left">
              <input
                type="text"
                placeholder="Search recipient queue by name, company, email…"
                value={previewSearch}
                onChange={(e) => { setPreviewSearch(e.target.value); setCurrentPage(1); }}
                className="table-search-input"
              />
            </div>

            <div className="table-toolbar-right">
              <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
                <span className="text-xs text-muted">Filter:</span>
                <select
                  value={previewStatusFilter}
                  onChange={(e) => { setPreviewStatusFilter(e.target.value as 'all' | 'pending' | 'contacted'); setCurrentPage(1); }}
                  className="table-filter-select"
                >
                  <option value="all">All Leads ({buyersList.length})</option>
                  <option value="pending">⏳ Pending Outreach ({pendingBuyersCount})</option>
                  <option value="contacted">✓ Already Contacted ({contactedBuyersCount})</option>
                </select>
              </div>
            </div>
          </div>

          {filteredPreviewBuyers.length === 0 ? (
            <div className="empty-state" style={{ padding: '32px 16px' }}>
              <p>No recipient leads match the active search/filter.</p>
            </div>
          ) : (
            <>
              <div className="table-wrap">
                <table>
                  <thead>
                    <tr>
                      <th style={{ width: 36 }}>
                        <input
                          type="checkbox"
                          checked={selectedEmails.size === buyersList.length && buyersList.length > 0}
                          onChange={toggleSelectAll}
                          style={{ accentColor: 'var(--amber)', cursor: 'pointer' }}
                        />
                      </th>
                      <th style={{ width: 36 }}>#</th>
                      <th>Recipient Lead</th>
                      <th>Email</th>
                      <th>Source Platform</th>
                      <th>Contact Status</th>
                      <th>Queue Action</th>
                    </tr>
                  </thead>
                  <tbody>
                    {paginatedPreviewBuyers.map((b, i) => {
                      const low = (b.email ?? '').toLowerCase().trim();
                      const isChecked = selectedEmails.has(low);
                      const willSend = isChecked && (sendMode === 'force' || !b.is_sent);
                      const globalIdx = (currentPage - 1) * pageSize + i + 1;

                      return (
                        <tr key={low + i} style={{ opacity: willSend ? 1 : 0.6 }}>
                          <td>
                            <input
                              type="checkbox"
                              checked={isChecked}
                              onChange={() => toggleSelectEmail(low)}
                              style={{ accentColor: 'var(--amber)', cursor: 'pointer' }}
                            />
                          </td>
                          <td style={{ color: 'var(--text-muted)', fontSize: '0.75rem' }}>{globalIdx}</td>
                          <td>
                            <div className="td-primary" style={{ maxWidth: 200, overflow: 'hidden', textOverflow: 'ellipsis' }}>
                              {b.buyer_name || b.company_name || 'Buyer'}
                            </div>
                            {b.company_name && b.company_name !== b.buyer_name && (
                              <div className="text-xs text-muted" style={{ maxWidth: 200, overflow: 'hidden', textOverflow: 'ellipsis' }}>
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
                            <span className="badge badge-amber">{b.source_platform || 'Web'}</span>
                          </td>
                          <td>
                            {b.is_sent ? (
                              <span className="badge badge-contacted">
                                ✓ Contacted
                              </span>
                            ) : (
                              <span className="badge badge-pending">
                                ⏳ Pending
                              </span>
                            )}
                          </td>
                          <td>
                            {willSend ? (
                              <span className="badge badge-success">
                                Ready to Send
                              </span>
                            ) : b.is_sent && sendMode === 'safe' ? (
                              <span className="badge badge-error" style={{ opacity: 0.8 }}>
                                Skipped (Already Sent)
                              </span>
                            ) : (
                              <span className="badge badge-error" style={{ opacity: 0.8 }}>
                                Excluded
                              </span>
                            )}
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
                totalItems={filteredPreviewBuyers.length}
                pageSize={pageSize}
                onPageChange={setCurrentPage}
                onPageSizeChange={(size) => { setPageSize(size); setCurrentPage(1); }}
                pageSizeOptions={[10, 25, 50, 100]}
                itemLabel="leads in preview"
              />
            </>
          )}
        </div>

        {/* Launch Campaign Action Bar */}
        <div style={{ marginTop: 24, display: 'flex', alignItems: 'center', gap: 16, flexWrap: 'wrap' }}>
          <button
            id="launch-campaign-btn"
            type="submit"
            className="btn btn-primary btn-lg"
            disabled={sending || effectiveRecipients.length === 0}
          >
            {sending ? (
              <>
                <div className="spinner" /> Sending Campaign to {effectiveRecipients.length} Leads…
              </>
            ) : (
              <>
                <svg viewBox="0 0 24 24" fill="none" stroke="currentColor">
                  <line x1="22" y1="2" x2="11" y2="13" strokeWidth="1.8" strokeLinecap="round" />
                  <polygon points="22 2 15 22 11 13 2 9 22 2" strokeWidth="1.8" strokeLinecap="round" />
                </svg>
                Launch Campaign ({effectiveRecipients.length} {effectiveRecipients.length === 1 ? 'Lead' : 'Leads'})
              </>
            )}
          </button>

          {effectiveRecipients.length === 0 && (
            <span className="text-xs text-red">
              Select at least 1 recipient lead to enable launch.
            </span>
          )}

          {sending && (
            <p className="text-sm text-muted">
              Dispatching outreach emails with rate delay ({settings.send_delay}s per email). This may take a moment…
            </p>
          )}
        </div>
      </form>
    </>
  );
}
