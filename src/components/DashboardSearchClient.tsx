'use client';

import { useState, useEffect } from 'react';
import FlashMessages from '@/components/FlashMessages';
import type { FlashMessage } from '@/types';
import { useRouter } from 'next/navigation';

export default function DashboardSearchClient() {
  const router = useRouter();
  const [keyword, setKeyword] = useState('Singing Bowls');
  const [maxResults, setMaxResults] = useState(20);
  const [platforms, setPlatforms] = useState<string[]>(['Google', 'Facebook', 'LinkedIn', 'Directory', 'Website']);
  const [loading, setLoading] = useState(false); // Indicates search is actively running
  const [messages, setMessages] = useState<FlashMessage[]>([]);
  const [searchLog, setSearchLog] = useState<string[]>([]);

  const availablePlatforms = ['Google', 'Facebook', 'LinkedIn', 'Directory', 'Website'];

  const togglePlatform = (p: string) => {
    setPlatforms(prev => prev.includes(p) ? prev.filter(x => x !== p) : [...prev, p]);
  };

  useEffect(() => {
    let interval: NodeJS.Timeout;

    async function checkStatus() {
      try {
        const res = await fetch('/api/search/status');
        if (res.ok) {
          const data = await res.json() as { running: boolean; log: string[] };
          setSearchLog(data.log || []);
          if (!data.running && loading) {
            setLoading(false);
            setMessages([{ category: 'success', message: 'Search finished successfully!' }]);
            // Refresh dashboard stats
            router.refresh();
          } else if (data.running && !loading) {
            setLoading(true); // Sync state if it was already running
          }
        }
      } catch (err) {
        // ignore errors during polling
      }
    }

    if (loading) {
      interval = setInterval(checkStatus, 2000);
    } else {
      // Check status once on mount to see if a search is already running
      checkStatus();
    }

    return () => clearInterval(interval);
  }, [loading, router]);

  async function handleSearch(e: React.FormEvent) {
    e.preventDefault();
    setLoading(true);
    setSearchLog([]);
    setMessages([]);
    try {
      const res = await fetch('/api/search', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ keyword, maxResults, platforms }),
      });
      const data = await res.json() as { message?: string; error?: string };
      if (!res.ok) {
        setLoading(false);
        setMessages([{ category: 'error', message: data.error ?? 'Failed to start search.' }]);
      } else {
        // Instantly refresh the UI to clear old records visually (since backend wiped buyers.csv)
        router.refresh();
      }
    } catch {
      setLoading(false);
      setMessages([{ category: 'error', message: 'Network error.' }]);
    }
  }

  return (
    <>
      <form onSubmit={handleSearch} style={{ marginTop: 16, display: 'flex', flexDirection: 'column', gap: 16 }}>
        <div style={{ display: 'flex', gap: 8 }}>
          <input
            name="keyword"
            value={keyword}
            onChange={(e) => setKeyword(e.target.value)}
            className="form-input"
            placeholder="Search keyword…"
            disabled={loading}
          />
          <button type="submit" className="btn btn-primary" style={{ whiteSpace: 'nowrap' }} disabled={loading || platforms.length === 0}>
            {loading ? <><div className="spinner" /> Searching…</> : <>
              <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" style={{ width: 18, height: 18 }}><circle cx="11" cy="11" r="8" strokeWidth="2"/><line x1="21" y1="21" x2="16.65" y2="16.65" strokeWidth="2" strokeLinecap="round"/></svg>
              Search
            </>}
          </button>
        </div>
        
        <div style={{ display: 'flex', gap: 16, alignItems: 'center', flexWrap: 'wrap' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
            <span style={{ fontSize: '0.9rem', color: 'var(--text-muted)' }}>Platforms:</span>
            <div style={{ display: 'flex', gap: 6 }}>
              {availablePlatforms.map(p => (
                <button
                  key={p}
                  type="button"
                  onClick={() => togglePlatform(p)}
                  disabled={loading}
                  style={{
                    padding: '4px 12px',
                    borderRadius: 20,
                    fontSize: '0.8rem',
                    border: '1px solid',
                    borderColor: platforms.includes(p) ? 'var(--primary)' : 'var(--border)',
                    backgroundColor: platforms.includes(p) ? 'rgba(59, 130, 246, 0.1)' : 'transparent',
                    color: platforms.includes(p) ? 'var(--primary)' : 'var(--text-muted)',
                    cursor: loading ? 'not-allowed' : 'pointer',
                    transition: 'all 0.2s'
                  }}
                >
                  {p}
                </button>
              ))}
            </div>
          </div>
          
          <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginLeft: 'auto' }}>
            <span style={{ fontSize: '0.9rem', color: 'var(--text-muted)' }}>Max Results:</span>
            <input
              type="number"
              min="1"
              max="500"
              value={maxResults}
              onChange={(e) => setMaxResults(Number(e.target.value))}
              disabled={loading}
              className="form-input"
              style={{ width: 80, padding: '4px 8px' }}
            />
          </div>
        </div>
      </form>
      <div style={{ marginTop: 12 }}>
        <FlashMessages messages={messages} />
      </div>
      {(loading || searchLog.length > 0) && (
        <div className="log-terminal" style={{ marginTop: 16 }}>
          {searchLog.length === 0 && loading ? 'Initializing search adapters...\n' : ''}
          {searchLog.map((line, idx) => (
            <div key={idx} className={line.startsWith('✗') ? 'log-line-error' : 'log-line-info'}>
              {line}
            </div>
          ))}
        </div>
      )}
    </>
  );
}
