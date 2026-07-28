import type { Metadata } from 'next';
import Link from 'next/link';
import { getDatabaseStats } from '@/lib/data/activityLogger';
import { loadSettings } from '@/lib/data/settingsHelper';
import { getAttachmentInfo } from '@/lib/outreach/attachmentHandler';
import DashboardSearchClient from '@/components/DashboardSearchClient';

export const dynamic = 'force-dynamic';


export const metadata: Metadata = { title: 'Dashboard — EXPORT Automation System' };

export default function Dashboard() {
  const stats = getDatabaseStats();
  const settings = loadSettings();
  const attachment = getAttachmentInfo(settings.presentation_path);

  const healthChecks = [
    { label: 'Gmail Credentials', ok: !!(settings.email && settings.app_password) },
    { label: 'Gemini API Key', ok: !!settings.gemini_api_key },
    { label: 'Presentation File', ok: attachment.exists },
    { label: 'Buyers Database', ok: stats.total_buyers > 0 },
  ];

  const statCards = [
    { label: 'Total Buyers', value: stats.total_buyers, color: '', accent: '#f59e0b', bgIcon: 'rgba(245,158,11,0.15)',
      icon: <svg viewBox="0 0 24 24" fill="none" stroke="currentColor"><path d="M17 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2" strokeWidth="1.8" strokeLinecap="round"/><circle cx="9" cy="7" r="4" strokeWidth="1.8"/><path d="M23 21v-2a4 4 0 0 0-3-3.87" strokeWidth="1.8" strokeLinecap="round"/><path d="M16 3.13a4 4 0 0 1 0 7.75" strokeWidth="1.8" strokeLinecap="round"/></svg> },
    { label: 'Emails Sent', value: stats.sent_success, color: 'green', accent: '#10b981', bgIcon: 'rgba(16,185,129,0.15)',
      icon: <svg viewBox="0 0 24 24" fill="none" stroke="currentColor"><line x1="22" y1="2" x2="11" y2="13" strokeWidth="1.8" strokeLinecap="round"/><polygon points="22 2 15 22 11 13 2 9 22 2" strokeWidth="1.8" strokeLinecap="round"/></svg> },
    { label: 'Failed', value: stats.sent_failed, color: 'red', accent: '#ef4444', bgIcon: 'rgba(239,68,68,0.15)',
      icon: <svg viewBox="0 0 24 24" fill="none" stroke="currentColor"><circle cx="12" cy="12" r="10" strokeWidth="1.8"/><line x1="15" y1="9" x2="9" y2="15" strokeWidth="1.8" strokeLinecap="round"/><line x1="9" y1="9" x2="15" y2="15" strokeWidth="1.8" strokeLinecap="round"/></svg> },
    { label: 'Business Leads', value: stats.business_emails, color: 'blue', accent: '#3b82f6', bgIcon: 'rgba(59,130,246,0.15)',
      icon: <svg viewBox="0 0 24 24" fill="none" stroke="currentColor"><rect x="2" y="7" width="20" height="14" rx="2" strokeWidth="1.8"/><path d="M16 21V5a2 2 0 0 0-2-2h-4a2 2 0 0 0-2 2v16" strokeWidth="1.8" strokeLinecap="round"/></svg> },
    { label: 'Individual Leads', value: stats.individual_emails, color: 'purple', accent: '#a855f7', bgIcon: 'rgba(168,85,247,0.15)',
      icon: <svg viewBox="0 0 24 24" fill="none" stroke="currentColor"><path d="M20 21v-2a4 4 0 0 0-4-4H8a4 4 0 0 0-4 4v2" strokeWidth="1.8" strokeLinecap="round"/><circle cx="12" cy="7" r="4" strokeWidth="1.8"/></svg> },
    { label: 'DB Size (KB)', value: stats.buyers_csv_size, color: '', accent: '#f59e0b', bgIcon: 'rgba(245,158,11,0.15)',
      icon: <svg viewBox="0 0 24 24" fill="none" stroke="currentColor"><ellipse cx="12" cy="5" rx="9" ry="3" strokeWidth="1.8"/><path d="M21 12c0 1.66-4 3-9 3s-9-1.34-9-3" strokeWidth="1.8"/><path d="M3 5v14c0 1.66 4 3 9 3s9-1.34 9-3V5" strokeWidth="1.8"/></svg> },
  ];

  const successRate = stats.total_sent > 0
    ? Math.round((stats.sent_success / stats.total_sent) * 1000) / 10
    : 0;

  return (
    <>
      <div className="page-header">
        <div className="breadcrumb"><span>Pipeline</span> / Dashboard</div>
        <h2>Dashboard</h2>
        <p>System overview and pipeline status for your EXPORT Automation</p>
      </div>

      {/* Stats Grid */}
      <div className="stats-grid">
        {statCards.map((card) => (
          <div key={card.label} className={`stat-card ${card.color}`}>
            <div className="stat-icon">{card.icon}</div>
            <div className="stat-value">{card.value}</div>
            <div className="stat-label">{card.label}</div>
          </div>
        ))}
      </div>

      <div className="grid-2">
        {/* Pipeline Flow */}
        <div className="card">
          <div className="card-title">
            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8"><path d="M5 12h14M12 5l7 7-7 7"/></svg>
            Pipeline Flow
          </div>
          <div className="card-subtitle">Current pipeline stage at a glance</div>
          <div className="pipeline">
            {[
              { label: 'Search', done: stats.total_buyers > 0 },
              { label: 'Classify', done: stats.business_emails + stats.individual_emails > 0 },
              { label: 'Send', done: stats.total_sent > 0 },
              { label: 'Report', done: stats.total_sent > 0 },
            ].map((step, i, arr) => (
              <div key={step.label} style={{ display: 'contents' }}>
                <div className={`pipeline-step ${step.done ? 'done' : i === arr.findIndex(s => !s.done) ? 'active' : ''}`}>
                  <div className="step-circle">
                    {step.done ? (
                      <svg viewBox="0 0 24 24" fill="none" stroke="currentColor"><polyline points="20 6 9 17 4 12" strokeWidth="2.5" strokeLinecap="round"/></svg>
                    ) : (
                      <span style={{ fontSize: '0.8rem', fontWeight: 700 }}>{i + 1}</span>
                    )}
                  </div>
                  <div className="step-label">{step.label}</div>
                </div>
                {i < arr.length - 1 && <div className={`step-connector ${step.done ? 'done' : ''}`} />}
              </div>
            ))}
          </div>

          {/* Quick search trigger */}
          <DashboardSearchClient />
        </div>

        {/* System Health */}
        <div className="card">
          <div className="card-title">
            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8"><polyline points="22 12 18 12 15 21 9 3 6 12 2 12"/></svg>
            System Health
          </div>
          <div className="card-subtitle">Configuration status checks</div>
          <div className="health-grid">
            {healthChecks.map((h) => (
              <div key={h.label} className="health-item">
                <div className={`health-dot ${h.ok ? 'ok' : 'warn'}`} />
                <span className="health-label">{h.label}</span>
              </div>
            ))}
          </div>

          {/* Success Rate */}
          <div style={{ marginTop: 24 }}>
            <div className="flex justify-between mb-4" style={{ marginBottom: 8 }}>
              <span className="text-sm text-muted">Campaign Success Rate</span>
              <span className="text-sm font-semibold text-amber">{successRate}%</span>
            </div>
            <div className="progress-bar">
              <div className="progress-fill" style={{ width: `${successRate}%` }} />
            </div>
          </div>

          {/* Attachment Status */}
          <div style={{ marginTop: 20, padding: '12px 14px', background: 'var(--bg-elevated)', borderRadius: 'var(--radius-sm)', border: '1px solid var(--border)' }}>
            <div className="flex items-center gap-2">
              <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke={attachment.exists ? 'var(--green)' : 'var(--text-muted)'} strokeWidth="2"><path d="M21.44 11.05l-9.19 9.19a6 6 0 0 1-8.49-8.49l9.19-9.19a4 4 0 0 1 5.66 5.66l-9.2 9.19a2 2 0 0 1-2.83-2.83l8.49-8.48"/></svg>
              <span className="text-xs" style={{ color: attachment.exists ? 'var(--green)' : 'var(--text-muted)' }}>
                {attachment.exists ? `${attachment.filename} (${attachment.size_kb} KB)` : 'No presentation attached'}
              </span>
            </div>
          </div>
        </div>
      </div>

      {/* Quick Actions */}
      <div className="card mt-6" style={{ marginTop: 20 }}>
        <div className="card-title">Quick Actions</div>
        <div className="card-subtitle">Jump to any stage of the pipeline</div>
        <div style={{ display: 'flex', gap: 12, flexWrap: 'wrap', marginTop: 4 }}>
          <Link href="/upload" className="btn btn-secondary">Upload CSV</Link>
          <Link href="/classify" className="btn btn-secondary">Run AI Classify</Link>
          <Link href="/send" className="btn btn-primary">Send Campaign</Link>
          <Link href="/report" className="btn btn-secondary">View Report</Link>
          <Link href="/settings" className="btn btn-secondary">Settings</Link>
        </div>
      </div>
    </>
  );
}
