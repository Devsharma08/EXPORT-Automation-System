'use client';

import { useState } from 'react';
import type { FlashMessage } from '@/types';
import FlashMessages from '@/components/FlashMessages';

interface ClassifyData {
  biz_emails: string[];
  ind_emails: string[];
  biz_count: number;
  ind_count: number;
}

interface Props {
  initial: ClassifyData;
}

export default function ClassifyClient({ initial }: Props) {
  const [data, setData] = useState(initial);
  const [messages, setMessages] = useState<FlashMessage[]>([]);
  const [loading, setLoading] = useState(false);

  async function runClassification() {
    setLoading(true);
    setMessages([]);
    try {
      const res = await fetch('/api/classify', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({}) });
      const json = await res.json() as { message?: string; error?: string; business_count?: number; individual_count?: number };
      if (res.ok) {
        setMessages([{ category: 'success', message: json.message ?? 'Classification complete!' }]);
        // Reload results
        const r2 = await fetch('/api/classify');
        const d2 = await r2.json() as ClassifyData;
        setData(d2);
      } else {
        setMessages([{ category: 'error', message: json.error ?? 'Classification failed.' }]);
      }
    } catch {
      setMessages([{ category: 'error', message: 'Network error.' }]);
    } finally {
      setLoading(false);
    }
  }

  return (
    <>
      <div className="page-header">
        <div className="breadcrumb"><span>Pipeline</span> / AI Classify</div>
        <h2>AI Classification</h2>
        <p>Use Gemini to classify buyer emails as business or individual</p>
      </div>

      <FlashMessages messages={messages} />

      {/* Counts + Action */}
      <div className="stats-grid" style={{ gridTemplateColumns: 'repeat(3, 1fr)', marginBottom: 24 }}>
        <div className="stat-card blue">
          <div className="stat-icon"><svg viewBox="0 0 24 24" fill="none" stroke="currentColor"><rect x="2" y="7" width="20" height="14" rx="2" strokeWidth="1.8"/><path d="M16 21V5a2 2 0 0 0-2-2h-4a2 2 0 0 0-2 2v16" strokeWidth="1.8" strokeLinecap="round"/></svg></div>
          <div className="stat-value">{data.biz_count}</div>
          <div className="stat-label">Business Emails</div>
        </div>
        <div className="stat-card purple">
          <div className="stat-icon"><svg viewBox="0 0 24 24" fill="none" stroke="currentColor"><path d="M20 21v-2a4 4 0 0 0-4-4H8a4 4 0 0 0-4 4v2" strokeWidth="1.8" strokeLinecap="round"/><circle cx="12" cy="7" r="4" strokeWidth="1.8"/></svg></div>
          <div className="stat-value">{data.ind_count}</div>
          <div className="stat-label">Individual Emails</div>
        </div>
        <div className="card" style={{ display: 'flex', flexDirection: 'column', justifyContent: 'center', alignItems: 'center', gap: 12 }}>
          <button
            id="run-classify-btn"
            className="btn btn-primary btn-lg"
            onClick={runClassification}
            disabled={loading}
          >
            {loading ? <><div className="spinner" /> Classifying…</> : <>
              <svg viewBox="0 0 24 24" fill="none" stroke="currentColor"><path d="M12 2a10 10 0 1 0 10 10A10 10 0 0 0 12 2z" strokeWidth="1.8"/><circle cx="12" cy="12" r="3" fill="currentColor" stroke="none"/></svg>
              Run Classification
            </>}
          </button>
          <p className="text-xs text-muted" style={{ textAlign: 'center' }}>Powered by Google Gemini</p>
        </div>
      </div>

      <div className="grid-2">
        {/* Business Emails */}
        <div className="card">
          <div className="card-title" style={{ color: 'var(--blue)' }}>
            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8"><rect x="2" y="7" width="20" height="14" rx="2"/><path d="M16 21V5a2 2 0 0 0-2-2h-4a2 2 0 0 0-2 2v16" strokeLinecap="round"/></svg>
            Business Emails <span className="badge badge-blue" style={{ marginLeft: 4 }}>{data.biz_count}</span>
          </div>
          {data.biz_emails.length === 0 ? (
            <div className="empty-state" style={{ padding: '24px 0' }}>
              <p>No business emails classified yet</p>
            </div>
          ) : (
            <div style={{ display: 'flex', flexDirection: 'column', gap: 6, marginTop: 12 }}>
              {data.biz_emails.map((e) => (
                <div key={e} style={{ padding: '7px 12px', background: 'var(--bg-elevated)', borderRadius: 'var(--radius-sm)', border: '1px solid var(--border)', fontSize: '0.82rem', color: 'var(--text-secondary)' }}>
                  {e}
                </div>
              ))}
              {data.biz_count > 20 && <p className="text-xs text-muted">…and {data.biz_count - 20} more</p>}
            </div>
          )}
        </div>

        {/* Individual Emails */}
        <div className="card">
          <div className="card-title" style={{ color: 'var(--purple)' }}>
            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8"><path d="M20 21v-2a4 4 0 0 0-4-4H8a4 4 0 0 0-4 4v2" strokeLinecap="round"/><circle cx="12" cy="7" r="4"/></svg>
            Individual Emails <span className="badge badge-purple" style={{ marginLeft: 4 }}>{data.ind_count}</span>
          </div>
          {data.ind_emails.length === 0 ? (
            <div className="empty-state" style={{ padding: '24px 0' }}>
              <p>No individual emails classified yet</p>
            </div>
          ) : (
            <div style={{ display: 'flex', flexDirection: 'column', gap: 6, marginTop: 12 }}>
              {data.ind_emails.map((e) => (
                <div key={e} style={{ padding: '7px 12px', background: 'var(--bg-elevated)', borderRadius: 'var(--radius-sm)', border: '1px solid var(--border)', fontSize: '0.82rem', color: 'var(--text-secondary)' }}>
                  {e}
                </div>
              ))}
              {data.ind_count > 20 && <p className="text-xs text-muted">…and {data.ind_count - 20} more</p>}
            </div>
          )}
        </div>
      </div>
    </>
  );
}
