'use client';

import { useState, useEffect, useRef } from 'react';

interface RemovedEntry { email: string; reason: string; }
interface ValidationResult {
  valid_count: number;
  removed_count: number;
  removed: RemovedEntry[];
}

interface Props {
  initial_count: number;
}

export default function ValidateClient({ initial_count }: Props) {
  const [running, setRunning] = useState(false);
  const [log, setLog] = useState<string[]>([]);
  const [result, setResult] = useState<ValidationResult | null>(null);
  const [error, setError] = useState('');
  const logRef = useRef<HTMLDivElement>(null);

  // Poll status while running
  useEffect(() => {
    if (!running) return;
    const interval = setInterval(async () => {
      try {
        const res = await fetch('/api/validate');
        if (!res.ok) return;
        const data = await res.json() as { running: boolean; log: string[]; result?: ValidationResult };
        setLog(data.log ?? []);
        if (!data.running) {
          setRunning(false);
          clearInterval(interval);
          if (data.result) setResult(data.result);
        }
      } catch { /* ignore poll errors */ }
    }, 800);
    return () => clearInterval(interval);
  }, [running]);

  // Auto-scroll log
  useEffect(() => {
    if (logRef.current) logRef.current.scrollTop = logRef.current.scrollHeight;
  }, [log]);

  async function handleRun() {
    setRunning(true);
    setLog([]);
    setResult(null);
    setError('');
    try {
      const res = await fetch('/api/validate', { method: 'POST' });
      if (!res.ok) {
        const d = await res.json() as { error?: string };
        setError(d.error ?? 'Failed to start validation.');
        setRunning(false);
      }
    } catch {
      setError('Network error while starting validation.');
      setRunning(false);
    }
  }

  return (
    <>
      <div className="page-header">
        <div className="breadcrumb"><span>Pipeline</span> / Validate Emails</div>
        <h2>Validate Emails</h2>
        <p>Scan all discovered buyer emails and remove fake, disposable, and invalid addresses before sending</p>
      </div>

      {error && (
        <div style={{ padding: '12px 16px', background: 'rgba(239,68,68,0.1)', border: '1px solid rgba(239,68,68,0.3)', borderRadius: 8, marginBottom: 16, color: 'var(--red)', fontSize: '0.875rem' }}>
          {error}
        </div>
      )}

      <div className="grid-2">
        {/* Summary Card */}
        <div className="card">
          <div className="card-title">
            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8"><path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z"/></svg>
            Validation Status
          </div>
          <div className="card-subtitle">Checks email syntax, disposable domains, placeholder patterns & asset false-positives</div>

          <div style={{ display: 'flex', flexDirection: 'column', gap: 12, marginTop: 16 }}>
            <div style={{ padding: '12px 14px', background: 'var(--bg-elevated)', borderRadius: 'var(--radius-sm)', border: '1px solid var(--border)', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
              <span style={{ fontSize: '0.85rem', color: 'var(--text-muted)' }}>Total Buyers in DB</span>
              <span style={{ fontSize: '1.3rem', fontWeight: 700, color: 'var(--primary)' }}>{result ? result.valid_count : initial_count}</span>
            </div>
            {result && (
              <>
                <div style={{ padding: '12px 14px', background: 'rgba(16,185,129,0.08)', borderRadius: 'var(--radius-sm)', border: '1px solid rgba(16,185,129,0.25)', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                  <span style={{ fontSize: '0.85rem', color: 'var(--green)' }}>✓ Valid Emails Kept</span>
                  <span style={{ fontSize: '1.2rem', fontWeight: 700, color: 'var(--green)' }}>{result.valid_count}</span>
                </div>
                <div style={{ padding: '12px 14px', background: 'rgba(239,68,68,0.08)', borderRadius: 'var(--radius-sm)', border: '1px solid rgba(239,68,68,0.25)', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                  <span style={{ fontSize: '0.85rem', color: 'var(--red)' }}>✗ Fake Emails Removed</span>
                  <span style={{ fontSize: '1.2rem', fontWeight: 700, color: 'var(--red)' }}>{result.removed_count}</span>
                </div>
              </>
            )}
          </div>

          <div style={{ marginTop: 20 }}>
            <button
              id="run-validation-btn"
              className="btn btn-primary"
              onClick={handleRun}
              disabled={running}
              style={{ width: '100%' }}
            >
              {running ? (
                <><div className="spinner" /> Validating…</>
              ) : (
                <>
                  <svg viewBox="0 0 24 24" fill="none" stroke="currentColor"><path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z" strokeWidth="1.8"/><polyline points="9 12 11 14 15 10" strokeWidth="2" strokeLinecap="round"/></svg>
                  Run Email Validation
                </>
              )}
            </button>
          </div>
        </div>

        {/* Live Log */}
        <div className="card" style={{ display: 'flex', flexDirection: 'column' }}>
          <div className="card-title">
            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8"><polyline points="4 17 10 11 4 5"/><line x1="12" y1="19" x2="20" y2="19"/></svg>
            Live Log
          </div>
          <div className="card-subtitle">{running ? 'Scanning emails in progress…' : log.length > 0 ? 'Scan complete' : 'Press Run to start'}</div>

          <div
            ref={logRef}
            id="validate-log-output"
            style={{
              flex: 1,
              minHeight: 200,
              maxHeight: 320,
              overflowY: 'auto',
              marginTop: 12,
              padding: 12,
              background: 'var(--bg-primary)',
              borderRadius: 'var(--radius-sm)',
              border: '1px solid var(--border)',
              fontFamily: 'monospace',
              fontSize: '0.78rem',
              lineHeight: 1.7,
              color: 'var(--text-muted)',
            }}
          >
            {running && log.length === 0 && (
              <div style={{ display: 'flex', alignItems: 'center', gap: 8, color: 'var(--amber)' }}>
                <div className="spinner" style={{ width: 12, height: 12 }} />
                Initializing scanner…
              </div>
            )}
            {log.map((line, i) => (
              <div key={i} style={{ color: line.includes('✗') ? 'var(--red)' : line.includes('✓') ? 'var(--green)' : 'var(--text-muted)' }}>
                {line}
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* Removed Emails Table */}
      {result && result.removed.length > 0 && (
        <div className="card" style={{ marginTop: 20 }}>
          <div className="card-title" style={{ color: 'var(--red)' }}>
            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8"><circle cx="12" cy="12" r="10"/><line x1="15" y1="9" x2="9" y2="15" strokeLinecap="round"/><line x1="9" y1="9" x2="15" y2="15" strokeLinecap="round"/></svg>
            Removed Invalid Emails ({result.removed_count})
          </div>
          <div className="card-subtitle">These addresses were detected as fake, disposable, or invalid and have been removed from your buyer database.</div>
          <div style={{ overflowX: 'auto', marginTop: 12 }}>
            <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '0.82rem' }}>
              <thead>
                <tr style={{ borderBottom: '1px solid var(--border)' }}>
                  <th style={{ textAlign: 'left', padding: '8px 12px', color: 'var(--text-muted)', fontWeight: 600 }}>#</th>
                  <th style={{ textAlign: 'left', padding: '8px 12px', color: 'var(--text-muted)', fontWeight: 600 }}>Email</th>
                  <th style={{ textAlign: 'left', padding: '8px 12px', color: 'var(--text-muted)', fontWeight: 600 }}>Removal Reason</th>
                </tr>
              </thead>
              <tbody>
                {result.removed.map((entry, i) => (
                  <tr key={i} style={{ borderBottom: '1px solid var(--border)', opacity: 0.85 }}>
                    <td style={{ padding: '8px 12px', color: 'var(--text-muted)' }}>{i + 1}</td>
                    <td style={{ padding: '8px 12px', fontFamily: 'monospace', color: 'var(--red)', fontSize: '0.8rem' }}>{entry.email}</td>
                    <td style={{ padding: '8px 12px', color: 'var(--text-secondary)' }}>{entry.reason}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {result && result.removed_count === 0 && (
        <div className="card" style={{ marginTop: 20, textAlign: 'center', padding: '32px 16px' }}>
          <div style={{ fontSize: '2rem', marginBottom: 8 }}>✅</div>
          <div style={{ fontWeight: 700, color: 'var(--green)', fontSize: '1.1rem' }}>All emails are valid!</div>
          <p style={{ color: 'var(--text-muted)', marginTop: 6, fontSize: '0.875rem' }}>No fake or invalid email addresses were found in your buyer database.</p>
        </div>
      )}
    </>
  );
}
