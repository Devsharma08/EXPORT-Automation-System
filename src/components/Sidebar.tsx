'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';

const NAV_ITEMS = [
  {
    section: 'Pipeline',
    links: [
      {
        href: '/',
        id: 'nav-dashboard',
        label: 'Dashboard',
        icon: (
          <svg viewBox="0 0 24 24" fill="none" stroke="currentColor">
            <rect x="3" y="3" width="7" height="7" rx="1" strokeWidth="1.8"/>
            <rect x="14" y="3" width="7" height="7" rx="1" strokeWidth="1.8"/>
            <rect x="3" y="14" width="7" height="7" rx="1" strokeWidth="1.8"/>
            <rect x="14" y="14" width="7" height="7" rx="1" strokeWidth="1.8"/>
          </svg>
        ),
      },
      {
        href: '/upload',
        id: 'nav-upload',
        label: 'Upload Leads',
        icon: (
          <svg viewBox="0 0 24 24" fill="none" stroke="currentColor">
            <path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round"/>
            <polyline points="17 8 12 3 7 8" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round"/>
            <line x1="12" y1="3" x2="12" y2="15" strokeWidth="1.8" strokeLinecap="round"/>
          </svg>
        ),
      },
      {
        href: '/classify',
        id: 'nav-classify',
        label: 'AI Classify',
        icon: (
          <svg viewBox="0 0 24 24" fill="none" stroke="currentColor">
            <path d="M12 2a10 10 0 1 0 10 10A10 10 0 0 0 12 2z" strokeWidth="1.8"/>
            <circle cx="12" cy="12" r="3" fill="currentColor" stroke="none"/>
          </svg>
        ),
      },
      {
        href: '/send',
        id: 'nav-send',
        label: 'Send Campaign',
        icon: (
          <svg viewBox="0 0 24 24" fill="none" stroke="currentColor">
            <line x1="22" y1="2" x2="11" y2="13" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round"/>
            <polygon points="22 2 15 22 11 13 2 9 22 2" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round"/>
          </svg>
        ),
      },
    ],
  },
  {
    section: 'Reports',
    links: [
      {
        href: '/report',
        id: 'nav-report',
        label: 'View Report',
        icon: (
          <svg viewBox="0 0 24 24" fill="none" stroke="currentColor">
            <line x1="18" y1="20" x2="18" y2="10" strokeWidth="1.8" strokeLinecap="round"/>
            <line x1="12" y1="20" x2="12" y2="4" strokeWidth="1.8" strokeLinecap="round"/>
            <line x1="6" y1="20" x2="6" y2="14" strokeWidth="1.8" strokeLinecap="round"/>
            <line x1="2" y1="20" x2="22" y2="20" strokeWidth="1.8" strokeLinecap="round"/>
          </svg>
        ),
      },
      {
        href: '/api/report/download',
        id: 'nav-download',
        label: 'Download CSV',
        icon: (
          <svg viewBox="0 0 24 24" fill="none" stroke="currentColor">
            <path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round"/>
            <polyline points="7 10 12 15 17 10" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round"/>
            <line x1="12" y1="15" x2="12" y2="3" strokeWidth="1.8" strokeLinecap="round"/>
          </svg>
        ),
      },
    ],
  },
  {
    section: 'System',
    links: [
      {
        href: '/settings',
        id: 'nav-settings',
        label: 'Settings',
        icon: (
          <svg viewBox="0 0 24 24" fill="none" stroke="currentColor">
            <circle cx="12" cy="12" r="3" strokeWidth="1.8"/>
            <path d="M19.4 15a1.65 1.65 0 0 0 .33 1.82l.06.06a2 2 0 0 1-2.83 2.83l-.06-.06a1.65 1.65 0 0 0-1.82-.33 1.65 1.65 0 0 0-1 1.51V21a2 2 0 0 1-4 0v-.09A1.65 1.65 0 0 0 9 19.4a1.65 1.65 0 0 0-1.82.33l-.06.06a2 2 0 0 1-2.83-2.83l.06-.06A1.65 1.65 0 0 0 4.68 15a1.65 1.65 0 0 0-1.51-1H3a2 2 0 0 1 0-4h.09A1.65 1.65 0 0 0 4.6 9a1.65 1.65 0 0 0-.33-1.82l-.06-.06a2 2 0 0 1 2.83-2.83l.06.06A1.65 1.65 0 0 0 9 4.68a1.65 1.65 0 0 0 1-1.51V3a2 2 0 0 1 4 0v.09a1.65 1.65 0 0 0 1 1.51 1.65 1.65 0 0 0 1.82-.33l.06-.06a2 2 0 0 1 2.83 2.83l-.06.06A1.65 1.65 0 0 0 19.4 9a1.65 1.65 0 0 0 1.51 1H21a2 2 0 0 1 0 4h-.09a1.65 1.65 0 0 0-1.51 1z" strokeWidth="1.8"/>
          </svg>
        ),
      },
    ],
  },
];

export default function Sidebar() {
  const pathname = usePathname();

  return (
    <nav className="sidebar" role="navigation" aria-label="Main navigation">
      {/* Brand */}
      <div className="sidebar-logo">
        <div className="logo-mark">
          <div className="logo-icon">
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor">
              <path d="M12 3C7.03 3 3 5.69 3 9c0 2.21 1.79 4.15 4.5 5.32V20h9v-5.68C19.21 13.15 21 11.21 21 9c0-3.31-4.03-6-9-6z" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round"/>
              <path d="M6.5 14.5c1.5.67 3.5 1 5.5 1s4-.33 5.5-1" strokeWidth="1.8" strokeLinecap="round"/>
            </svg>
          </div>
          <div className="logo-text">
            <h1>Export System</h1>
            <p>API 3 · Automation Pipeline</p>
          </div>
        </div>
      </div>

      {/* Nav Groups */}
      {NAV_ITEMS.map(({ section, links }) => (
        <div key={section}>
          <div className="nav-section-label">{section}</div>
          {links.map(({ href, id, label, icon }) => {
            const isActive = href === '/' ? pathname === '/' : pathname.startsWith(href) && href !== '/api/report/download';
            return (
              <Link
                key={href}
                href={href}
                id={id}
                className={`nav-link${isActive ? ' active' : ''}`}
              >
                <span className="nav-icon">{icon}</span>
                {label}
              </Link>
            );
          })}
        </div>
      ))}

      {/* Footer */}
      <div className="sidebar-footer">
        <div className="version-pill">
          <div className="version-dot" />
          v2.0.0 · Next.js
        </div>
      </div>
    </nav>
  );
}
