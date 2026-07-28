'use client';

import { useState } from 'react';
import type { DatabaseStats, BuyerRecord, FlashMessage } from '@/types';
import FlashMessages from '@/components/FlashMessages';

interface Props {
  stats: DatabaseStats;
  recentBuyers: BuyerRecord[];
}

export default function UploadClient({ stats, recentBuyers: initialBuyers }: Props) {
  const [messages, setMessages] = useState<FlashMessage[]>([]);
  const [uploading, setUploading] = useState(false);
  const [dragging, setDragging] = useState(false);
  const [buyers, setBuyers] = useState(initialBuyers);

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
        // Refresh buyers list
        const r2 = await fetch('/api/buyers?limit=10');
        const d2 = await r2.json() as { buyers: BuyerRecord[] };
        setBuyers(d2.buyers ?? []);
      } else {
        setMessages([{ category: 'error', message: data.error ?? 'Upload failed.' }]);
      }
    } catch {
      setMessages([{ category: 'error', message: 'Network error.' }]);
    } finally {
      setUploading(false);
    }
  }

  return (
    <>
      <div className="page-header">
        <div className="breadcrumb"><span>Pipeline</span> / Upload Leads</div>
        <h2>Upload Leads</h2>
        <p>Import a CSV of buyer contacts into the database</p>
      </div>

      <FlashMessages messages={messages} />

      <div className="grid-2">
        {/* Upload Zone */}
        <div className="card">
          <div className="card-title">Import CSV File</div>
          <div className="card-subtitle">Columns are auto-mapped to the schema</div>
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
            <p>Accepted: .csv · Columns auto-matched to schema</p>
          </div>

          {/* Schema Reference */}
          <div style={{ marginTop: 20 }}>
            <div className="text-xs text-muted font-semibold" style={{ marginBottom: 8, textTransform: 'uppercase', letterSpacing: '0.05em' }}>
              Expected Columns (flexible matching)
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
          <div className="card-subtitle">Current state of the buyers database</div>
          <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
            {[
              { label: 'Total Buyers', value: stats.total_buyers },
              { label: 'Business Emails', value: stats.business_emails },
              { label: 'Individual Emails', value: stats.individual_emails },
              { label: 'Emails Sent', value: stats.sent_success },
              { label: 'DB Size (KB)', value: stats.buyers_csv_size },
            ].map((row) => (
              <div key={row.label} className="flex justify-between items-center" style={{ padding: '10px 14px', background: 'var(--bg-elevated)', borderRadius: 'var(--radius-sm)', border: '1px solid var(--border)' }}>
                <span className="text-sm text-muted">{row.label}</span>
                <span className="text-sm font-semibold text-amber">{row.value}</span>
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* Recent Buyers Table */}
      <div className="card mt-6" style={{ marginTop: 20 }}>
        <div className="card-title">Recent Buyers (last 10)</div>
        {buyers.length === 0 ? (
          <div className="empty-state">
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor"><path d="M17 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2" strokeWidth="1.5"/><circle cx="9" cy="7" r="4" strokeWidth="1.5"/></svg>
            <p>No buyers in the database yet. Upload a CSV to get started.</p>
          </div>
        ) : (
          <div className="table-wrap" style={{ marginTop: 12 }}>
            <table>
              <thead>
                <tr>
                  <th>Name</th>
                  <th>Company</th>
                  <th>Email</th>
                  <th>Source</th>
                  <th>Discovered</th>
                </tr>
              </thead>
              <tbody>
                {buyers.map((b, i) => (
                  <tr key={i}>
                    <td className="td-primary">{b.buyer_name || '—'}</td>
                    <td>{b.company_name || '—'}</td>
                    <td>{b.email}</td>
                    <td><span className="badge badge-amber">{b.source_platform || '—'}</span></td>
                    <td>{b.discovered_at ? new Date(b.discovered_at).toLocaleDateString() : '—'}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </>
  );
}
