'use client';

import { useState } from 'react';
import type { FlashMessage, AppSettings, ReportData } from '@/types';
import FlashMessages from '@/components/FlashMessages';

interface AttachmentInfo { exists: boolean; filename: string; size_kb: number; }

interface Props {
  settings: AppSettings;
  attachment: AttachmentInfo;
  biz_count: number;
  ind_count: number;
  all_count: number;
}

export default function SendClient({ settings, attachment, biz_count, ind_count, all_count }: Props) {
  const [messages, setMessages] = useState<FlashMessage[]>([]);
  const [sending, setSending] = useState(false);
  const [audience, setAudience] = useState('all');
  const [subject, setSubject] = useState(settings.default_subject);
  const [body, setBody] = useState(settings.default_body);
  const [useAttachment, setUseAttachment] = useState(true);

  const audienceOptions = [
    { value: 'business', label: 'Business', count: biz_count },
    { value: 'individual', label: 'Individual', count: ind_count },
    { value: 'all', label: 'All', count: all_count },
  ];

  async function handleSend(e: React.FormEvent) {
    e.preventDefault();
    if (!subject.trim() || !body.trim()) {
      setMessages([{ category: 'error', message: 'Subject and body are required.' }]);
      return;
    }
    setSending(true);
    setMessages([]);
    try {
      const res = await fetch('/api/send', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ subject, body, audience, use_attachment: useAttachment }),
      });
      const data = await res.json() as { message?: string; error?: string; report?: ReportData };
      if (res.ok) {
        setMessages([{ category: 'success', message: data.message ?? 'Campaign launched!' }]);
      } else {
        setMessages([{ category: 'error', message: data.error ?? 'Campaign failed.' }]);
      }
    } catch {
      setMessages([{ category: 'error', message: 'Network error.' }]);
    } finally {
      setSending(false);
    }
  }

  return (
    <>
      <div className="page-header">
        <div className="breadcrumb"><span>Pipeline</span> / Send Campaign</div>
        <h2>Send Campaign</h2>
        <p>Compose and launch your email outreach campaign</p>
      </div>

      <FlashMessages messages={messages} />

      <form onSubmit={handleSend}>
        <div className="grid-2">
          {/* Compose */}
          <div className="card" style={{ gridColumn: '1', gridRow: '1' }}>
            <div className="card-title">Compose Email</div>
            <div className="card-subtitle">Use {'{name}'} and {'{company}'} as personalization placeholders</div>

            <div className="form-group">
              <label className="form-label" htmlFor="email-subject">Subject Line</label>
              <input
                id="email-subject"
                className="form-input"
                value={subject}
                onChange={(e) => setSubject(e.target.value)}
                placeholder="e.g. Singing Bowls — Product Catalogue"
                required
              />
            </div>

            <div className="form-group">
              <label className="form-label" htmlFor="email-body">Email Body</label>
              <textarea
                id="email-body"
                className="form-textarea"
                value={body}
                onChange={(e) => setBody(e.target.value)}
                style={{ minHeight: 180 }}
                placeholder="Dear {name},…"
                required
              />
            </div>
          </div>

          {/* Settings Panel */}
          <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
            {/* Audience */}
            <div className="card">
              <div className="card-title">Target Audience</div>
              <div className="audience-cards">
                {audienceOptions.map((opt) => (
                  <label
                    key={opt.value}
                    className={`audience-card${audience === opt.value ? ' selected' : ''}`}
                    htmlFor={`aud-${opt.value}`}
                  >
                    <input
                      type="radio"
                      id={`aud-${opt.value}`}
                      name="audience"
                      value={opt.value}
                      checked={audience === opt.value}
                      onChange={() => setAudience(opt.value)}
                    />
                    <span className="audience-count">{opt.count}</span>
                    <span className="audience-label">{opt.label}</span>
                  </label>
                ))}
              </div>
            </div>

            {/* Attachment */}
            <div className="card">
              <div className="card-title">Attachment</div>
              <div style={{ display: 'flex', alignItems: 'center', gap: 12, padding: '12px', background: 'var(--bg-elevated)', borderRadius: 'var(--radius-sm)', border: '1px solid var(--border)' }}>
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
                    <p className="text-xs text-muted">{attachment.size_kb} KB</p>
                  )}
                </div>
                {!attachment.exists && (
                  <span className="badge badge-error" style={{ marginLeft: 'auto' }}>Missing</span>
                )}
              </div>
            </div>

            {/* Campaign Limits */}
            <div className="card">
              <div className="card-title">Campaign Limits</div>
              <div style={{ display: 'flex', flexDirection: 'column', gap: 8, marginTop: 4 }}>
                <div className="flex justify-between" style={{ fontSize: '0.82rem' }}>
                  <span className="text-muted">Daily Send Limit</span>
                  <span className="font-semibold">{settings.daily_send_limit}</span>
                </div>
                <div className="flex justify-between" style={{ fontSize: '0.82rem' }}>
                  <span className="text-muted">Delay Between Sends</span>
                  <span className="font-semibold">{settings.send_delay}s</span>
                </div>
                <div className="flex justify-between" style={{ fontSize: '0.82rem' }}>
                  <span className="text-muted">Gmail Account</span>
                  <span className="font-semibold text-xs" style={{ maxWidth: 140, overflow: 'hidden', textOverflow: 'ellipsis' }}>{settings.email || 'Not configured'}</span>
                </div>
              </div>
            </div>
          </div>
        </div>

        <div style={{ marginTop: 20, display: 'flex', gap: 12 }}>
          <button
            id="launch-campaign-btn"
            type="submit"
            className="btn btn-primary btn-lg"
            disabled={sending}
          >
            {sending ? <><div className="spinner" /> Sending Campaign…</> : <>
              <svg viewBox="0 0 24 24" fill="none" stroke="currentColor"><line x1="22" y1="2" x2="11" y2="13" strokeWidth="1.8" strokeLinecap="round"/><polygon points="22 2 15 22 11 13 2 9 22 2" strokeWidth="1.8" strokeLinecap="round"/></svg>
              Launch Campaign
            </>}
          </button>
          {sending && <p className="text-sm text-muted items-center flex">This may take several minutes depending on recipient count…</p>}
        </div>
      </form>
    </>
  );
}
