import type { Metadata } from 'next';
import Link from 'next/link';
import { buildRunReport } from '@/lib/reports/reportGenerator';
import { readSentLog } from '@/lib/data/activityLogger';
import type { SentLogRecord } from '@/types';

export const dynamic = 'force-dynamic';


export const metadata: Metadata = { title: 'Report — EXPORT Automation System' };

function statusBadge(status: string) {
  if (status === 'sent') return <span className="badge badge-success">Sent</span>;
  return <span className="badge badge-error">Failed</span>;
}

export default function ReportPage() {
  const report = buildRunReport(null);
  const sentLog = readSentLog();
  const recentLog: SentLogRecord[] = sentLog.slice(-20).reverse();

  return (
    <>
      <div className="page-header">
        <div className="breadcrumb"><span>Reports</span> / View Report</div>
        <h2>Campaign Report</h2>
        <p>Summary of all outreach activity</p>
      </div>

      {/* Summary Stats */}
      <div className="stats-grid">
        <div className="stat-card">
          <div className="stat-icon"><svg viewBox="0 0 24 24" fill="none" stroke="currentColor"><path d="M17 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2" strokeWidth="1.8" strokeLinecap="round"/><circle cx="9" cy="7" r="4" strokeWidth="1.8"/></svg></div>
          <div className="stat-value">{report.total_buyers ?? 0}</div>
          <div className="stat-label">Total Buyers</div>
        </div>
        <div className="stat-card green">
          <div className="stat-icon"><svg viewBox="0 0 24 24" fill="none" stroke="currentColor"><polyline points="20 6 9 17 4 12" strokeWidth="1.8" strokeLinecap="round"/></svg></div>
          <div className="stat-value">{report.success_count}</div>
          <div className="stat-label">Emails Sent</div>
        </div>
        <div className="stat-card red">
          <div className="stat-icon"><svg viewBox="0 0 24 24" fill="none" stroke="currentColor"><circle cx="12" cy="12" r="10" strokeWidth="1.8"/><line x1="15" y1="9" x2="9" y2="15" strokeWidth="1.8" strokeLinecap="round"/><line x1="9" y1="9" x2="15" y2="15" strokeWidth="1.8" strokeLinecap="round"/></svg></div>
          <div className="stat-value">{report.failed_count}</div>
          <div className="stat-label">Failed</div>
        </div>
        <div className="stat-card blue">
          <div className="stat-icon"><svg viewBox="0 0 24 24" fill="none" stroke="currentColor"><polyline points="22 12 18 12 15 21 9 3 6 12 2 12" strokeWidth="1.8" strokeLinecap="round"/></svg></div>
          <div className="stat-value">{report.success_rate}%</div>
          <div className="stat-label">Success Rate</div>
        </div>
      </div>

      <div className="grid-2">
        {/* Report Meta */}
        <div className="card">
          <div className="card-title">Report Details</div>
          <div style={{ display: 'flex', flexDirection: 'column', gap: 10, marginTop: 12 }}>
            {[
              { label: 'Type', value: report.run_type === 'campaign' ? 'Campaign Run' : 'Historical Summary' },
              { label: 'Generated', value: new Date(report.generated_at).toLocaleString() },
              { label: 'Total Recipients', value: report.total_recipients },
              { label: 'Business Emails', value: report.business_emails ?? 0 },
              { label: 'Individual Emails', value: report.individual_emails ?? 0 },
              { label: 'Sent Log Size', value: `${report.sent_log_size ?? 0} KB` },
            ].map((row) => (
              <div key={row.label} className="flex justify-between" style={{ padding: '9px 14px', background: 'var(--bg-elevated)', borderRadius: 'var(--radius-sm)', border: '1px solid var(--border)', fontSize: '0.85rem' }}>
                <span className="text-muted">{row.label}</span>
                <span className="font-semibold">{row.value}</span>
              </div>
            ))}
          </div>
        </div>

        {/* Progress */}
        <div className="card">
          <div className="card-title">Success Rate</div>
          <div style={{ textAlign: 'center', padding: '20px 0' }}>
            <div style={{ fontSize: '3rem', fontWeight: 700, color: report.success_rate >= 80 ? 'var(--green)' : report.success_rate >= 50 ? 'var(--amber)' : 'var(--red)', letterSpacing: '-0.04em' }}>
              {report.success_rate}%
            </div>
            <p className="text-sm text-muted" style={{ marginTop: 4 }}>
              {report.success_count} sent · {report.failed_count} failed
            </p>
          </div>
          <div className="progress-bar" style={{ height: 10 }}>
            <div className="progress-fill" style={{ width: `${report.success_rate}%` }} />
          </div>
          <div style={{ marginTop: 20 }}>
            <Link href="/api/report/download" className="btn btn-secondary w-full" style={{ justifyContent: 'center' }}>
              <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" width="16" height="16"><path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4" strokeWidth="1.8" strokeLinecap="round"/><polyline points="7 10 12 15 17 10" strokeWidth="1.8" strokeLinecap="round"/><line x1="12" y1="15" x2="12" y2="3" strokeWidth="1.8" strokeLinecap="round"/></svg>
              Download CSV Report
            </Link>
          </div>
        </div>
      </div>

      {/* Recent Send Log */}
      <div className="card" style={{ marginTop: 20 }}>
        <div className="card-title">Recent Send Log (last 20)</div>
        {recentLog.length === 0 ? (
          <div className="empty-state"><p>No emails have been sent yet.</p></div>
        ) : (
          <div className="table-wrap" style={{ marginTop: 12 }}>
            <table>
              <thead>
                <tr>
                  <th>Email</th>
                  <th>Status</th>
                  <th>Timestamp</th>
                  <th>Subject</th>
                </tr>
              </thead>
              <tbody>
                {recentLog.map((row, i) => (
                  <tr key={i}>
                    <td className="td-primary">{row.email}</td>
                    <td>{statusBadge(row.status)}</td>
                    <td>{new Date(row.timestamp).toLocaleString()}</td>
                    <td style={{ maxWidth: 200 }}>{row.subject}</td>
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
