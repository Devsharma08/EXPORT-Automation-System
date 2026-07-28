'use client';

import { useState } from 'react';
import type { AppSettings, FlashMessage } from '@/types';
import FlashMessages from '@/components/FlashMessages';

interface AttachmentInfo { exists: boolean; filename: string; size_kb: number; }

interface Props {
  settings: AppSettings;
  attachment: AttachmentInfo;
}

export default function SettingsClient({ settings: initial, attachment }: Props) {
  const [form, setForm] = useState<AppSettings>(initial);
  const [messages, setMessages] = useState<FlashMessage[]>([]);
  const [saving, setSaving] = useState(false);

  function update(field: keyof AppSettings) {
    return (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement | HTMLSelectElement>) => {
      setForm((prev) => ({ ...prev, [field]: e.target.value }));
    };
  }

  async function handleSave(e: React.FormEvent) {
    e.preventDefault();
    setSaving(true);
    setMessages([]);
    try {
      const res = await fetch('/api/settings', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(form),
      });
      const data = await res.json() as { message?: string; error?: string };
      if (res.ok) {
        setMessages([{ category: 'success', message: data.message ?? 'Settings saved!' }]);
      } else {
        setMessages([{ category: 'error', message: data.error ?? 'Failed to save settings.' }]);
      }
    } catch {
      setMessages([{ category: 'error', message: 'Network error.' }]);
    } finally {
      setSaving(false);
    }
  }

  const field = (label: string, id: keyof AppSettings, type = 'text', hint?: string) => (
    <div className="form-group">
      <label className="form-label" htmlFor={String(id)}>{label}</label>
      <input
        id={String(id)}
        type={type}
        className="form-input"
        value={String(form[id] ?? '')}
        onChange={update(id)}
        autoComplete="off"
      />
      {hint && <p className="form-hint">{hint}</p>}
    </div>
  );

  return (
    <>
      <div className="page-header">
        <div className="breadcrumb"><span>System</span> / Settings</div>
        <h2>Settings</h2>
        <p>Configure Gmail credentials, Gemini API key, and campaign defaults</p>
      </div>

      <FlashMessages messages={messages} />

      <form onSubmit={handleSave}>
        <div className="grid-2">
          {/* Gmail Settings */}
          <div className="card">
            <div className="card-title">
              <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="var(--amber)" strokeWidth="1.8"><path d="M4 4h16c1.1 0 2 .9 2 2v12c0 1.1-.9 2-2 2H4c-1.1 0-2-.9-2-2V6c0-1.1.9-2 2-2z"/><polyline points="22,6 12,13 2,6"/></svg>
              Gmail SMTP
            </div>
            {field('Gmail Email', 'email', 'email')}
            {field('App Password', 'app_password', 'password', '16-character App Password from Google Account Security')}
            {field('CC Email (monitoring)', 'cc_email', 'email')}
          </div>

          {/* AI Settings */}
          <div className="card">
            <div className="card-title">
              <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="var(--blue)" strokeWidth="1.8"><path d="M12 2a10 10 0 1 0 10 10A10 10 0 0 0 12 2z"/><circle cx="12" cy="12" r="3" fill="var(--blue)" stroke="none"/></svg>
              Gemini AI
            </div>
            {field('Gemini API Key', 'gemini_api_key', 'password', 'Get from https://aistudio.google.com/app/apikey')}
            <div className="form-group">
              <label className="form-label" htmlFor="classification_preference">Classification Preference</label>
              <select id="classification_preference" className="form-select" value={form.classification_preference} onChange={update('classification_preference')}>
                <option value="both">Both (Business + Individual)</option>
                <option value="business">Business Only</option>
                <option value="individual">Individual Only</option>
              </select>
            </div>
          </div>

          {/* Campaign Defaults */}
          <div className="card">
            <div className="card-title">
              <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="var(--green)" strokeWidth="1.8"><line x1="22" y1="2" x2="11" y2="13"/><polygon points="22 2 15 22 11 13 2 9 22 2"/></svg>
              Campaign Defaults
            </div>
            {field('Default Subject', 'default_subject')}
            <div className="form-group">
              <label className="form-label" htmlFor="default_body">Default Body</label>
              <textarea id="default_body" className="form-textarea" value={form.default_body} onChange={update('default_body')} />
              <p className="form-hint">Use {'{name}'} and {'{company}'} for personalization</p>
            </div>
          </div>

          {/* Send Limits + Attachment */}
          <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
            <div className="card">
              <div className="card-title">Send Limits</div>
              {field('Daily Send Limit', 'daily_send_limit', 'number')}
              {field('Delay Between Sends (s)', 'send_delay', 'number')}
            </div>

            <div className="card">
              <div className="card-title">Presentation File</div>
              {field('File Path', 'presentation_path', 'text', 'Relative or absolute path to your PDF/PPTX/DOCX')}
              <div style={{ padding: '10px 14px', background: 'var(--bg-elevated)', borderRadius: 'var(--radius-sm)', border: '1px solid var(--border)' }}>
                <div className="flex items-center gap-2">
                  <div className={`health-dot ${attachment.exists ? 'ok' : 'err'}`} />
                  <span className="text-xs text-muted">
                    {attachment.exists ? `${attachment.filename} · ${attachment.size_kb} KB` : 'File not found'}
                  </span>
                </div>
              </div>
            </div>
          </div>
        </div>

        <div style={{ marginTop: 20 }}>
          <button
            id="save-settings-btn"
            type="submit"
            className="btn btn-primary btn-lg"
            disabled={saving}
          >
            {saving ? <><div className="spinner" /> Saving…</> : <>
              <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" width="16" height="16"><path d="M19 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h11l5 5v11a2 2 0 0 1-2 2z" strokeWidth="1.8" strokeLinecap="round"/><polyline points="17 21 17 13 7 13 7 21" strokeWidth="1.8" strokeLinecap="round"/><polyline points="7 3 7 8 15 8" strokeWidth="1.8" strokeLinecap="round"/></svg>
              Save Settings
            </>}
          </button>
        </div>
      </form>
    </>
  );
}
