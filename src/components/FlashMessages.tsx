import type { FlashMessage } from '@/types';

interface Props {
  messages: FlashMessage[];
}

export default function FlashMessages({ messages }: Props) {
  if (!messages.length) return null;

  const icons = {
    success: <svg viewBox="0 0 24 24" fill="none" stroke="currentColor"><path d="M22 11.08V12a10 10 0 1 1-5.93-9.14" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/><polyline points="22 4 12 14.01 9 11.01" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/></svg>,
    error:   <svg viewBox="0 0 24 24" fill="none" stroke="currentColor"><circle cx="12" cy="12" r="10" strokeWidth="2"/><line x1="15" y1="9" x2="9" y2="15" strokeWidth="2" strokeLinecap="round"/><line x1="9" y1="9" x2="15" y2="15" strokeWidth="2" strokeLinecap="round"/></svg>,
    warning: <svg viewBox="0 0 24 24" fill="none" stroke="currentColor"><path d="M10.29 3.86L1.82 18a2 2 0 0 0 1.71 3h16.94a2 2 0 0 0 1.71-3L13.71 3.86a2 2 0 0 0-3.42 0z" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/><line x1="12" y1="9" x2="12" y2="13" strokeWidth="2" strokeLinecap="round"/></svg>,
    info:    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor"><circle cx="12" cy="12" r="10" strokeWidth="2"/><line x1="12" y1="8" x2="12" y2="12" strokeWidth="2" strokeLinecap="round"/><line x1="12" y1="16" x2="12.01" y2="16" strokeWidth="2" strokeLinecap="round"/></svg>,
  };

  return (
    <div className="flash-container" role="alert" aria-live="polite">
      {messages.map((msg, i) => (
        <div key={i} className={`flash flash-${msg.category}`}>
          {icons[msg.category]}
          <span>{msg.message}</span>
        </div>
      ))}
    </div>
  );
}
