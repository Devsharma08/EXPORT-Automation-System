'use client';

import { useState, useEffect } from 'react';
import FlashMessages from '@/components/FlashMessages';
import type { FlashMessage } from '@/types';
import { useRouter } from 'next/navigation';

export default function DashboardSearchClient() {
  const router = useRouter();
  const [keyword, setKeyword] = useState('Singing Bowls');
  const [loading, setLoading] = useState(false); // Indicates search is actively running
  const [messages, setMessages] = useState<FlashMessage[]>([]);
  const [searchLog, setSearchLog] = useState<string[]>([]);

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
        body: JSON.stringify({ keyword }),
      });
      const data = await res.json() as { message?: string; error?: string };
      if (!res.ok) {
        setLoading(false);
        setMessages([{ category: 'error', message: data.error ?? 'Failed to start search.' }]);
      }
    } catch {
      setLoading(false);
      setMessages([{ category: 'error', message: 'Network error.' }]);
    }
  }

  return (
    <>
      <form onSubmit={handleSearch} style={{ marginTop: 16 }}>
        <div style={{ display: 'flex', gap: 8 }}>
          <input
            name="keyword"
            value={keyword}
            onChange={(e) => setKeyword(e.target.value)}
            className="form-input"
            placeholder="Search keyword…"
            disabled={loading}
          />
          <button type="submit" className="btn btn-primary" style={{ whiteSpace: 'nowrap' }} disabled={loading}>
            {loading ? <><div className="spinner" /> Searching…</> : <>
              <svg viewBox="0 0 24 24" fill="none" stroke="currentColor"><circle cx="11" cy="11" r="8" strokeWidth="2"/><line x1="21" y1="21" x2="16.65" y2="16.65" strokeWidth="2" strokeLinecap="round"/></svg>
              Search
            </>}
          </button>
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
