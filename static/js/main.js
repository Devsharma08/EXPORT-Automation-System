// ── Flash auto-dismiss ──────────────────────────────────────
document.addEventListener('DOMContentLoaded', () => {
  const flashes = document.querySelectorAll('.flash');
  flashes.forEach(flash => {
    setTimeout(() => flash.remove(), 5000);
    flash.addEventListener('click', () => flash.remove());
  });

  // ── Active nav link ─────────────────────────────────────────
  const currentPath = window.location.pathname;
  document.querySelectorAll('.nav-link').forEach(link => {
    const href = link.getAttribute('href');
    if (href === currentPath || (href !== '/' && currentPath.startsWith(href))) {
      link.classList.add('active');
    }
  });

  // ── Audience card selection ──────────────────────────────────
  document.querySelectorAll('.audience-card').forEach(card => {
    const radio = card.querySelector('input[type="radio"]');
    if (!radio) return;

    if (radio.checked) card.classList.add('selected');

    card.addEventListener('click', () => {
      document.querySelectorAll('.audience-card').forEach(c => c.classList.remove('selected'));
      card.classList.add('selected');
      radio.checked = true;
    });
  });

  // ── Upload drop zone ─────────────────────────────────────────
  const uploadZone = document.getElementById('upload-zone');
  if (uploadZone) {
    ['dragenter', 'dragover'].forEach(e =>
      uploadZone.addEventListener(e, ev => {
        ev.preventDefault();
        uploadZone.classList.add('drag-over');
      })
    );

    ['dragleave', 'drop'].forEach(e =>
      uploadZone.addEventListener(e, ev => {
        ev.preventDefault();
        uploadZone.classList.remove('drag-over');
      })
    );

    uploadZone.addEventListener('drop', ev => {
      const files = ev.dataTransfer.files;
      const fileInput = uploadZone.querySelector('input[type="file"]');
      if (fileInput && files.length) {
        const dt = new DataTransfer();
        dt.items.add(files[0]);
        fileInput.files = dt.files;
        uploadZone.querySelector('.upload-title').textContent = files[0].name;
      }
    });

    const fileInput = uploadZone.querySelector('input[type="file"]');
    if (fileInput) {
      fileInput.addEventListener('change', () => {
        if (fileInput.files.length) {
          uploadZone.querySelector('.upload-title').textContent = fileInput.files[0].name;
        }
      });
    }
  }

  // ── Animate stat numbers ─────────────────────────────────────
  document.querySelectorAll('.stat-value[data-target]').forEach(el => {
    const target = parseInt(el.dataset.target, 10);
    if (isNaN(target)) return;
    let current = 0;
    const step = Math.max(1, Math.ceil(target / 40));
    const timer = setInterval(() => {
      current = Math.min(current + step, target);
      el.textContent = current.toLocaleString();
      if (current >= target) clearInterval(timer);
    }, 20);
  });

  // ── Progress bar animation ───────────────────────────────────
  document.querySelectorAll('.progress-bar[data-width]').forEach(bar => {
    setTimeout(() => {
      bar.style.width = bar.dataset.width + '%';
    }, 200);
  });

  // ── Search status poller ─────────────────────────────────────
  const statusPanel = document.getElementById('search-status-panel');
  const statusLog = document.getElementById('search-log');
  const statusBadge = document.getElementById('search-badge');

  if (statusPanel) {
    const pollStatus = () => {
      fetch('/search-status')
        .then(r => r.json())
        .then(data => {
          if (data.running || data.log.length > 0) {
            statusPanel.classList.add('visible');
            if (statusLog) {
              statusLog.innerHTML = data.log.map(l => `<div>${l}</div>`).join('');
              statusLog.scrollTop = statusLog.scrollHeight;
            }
            if (statusBadge) {
              statusBadge.textContent = data.running ? '⟳ Running…' : '✓ Done';
              statusBadge.className = data.running ? 'badge badge-warning' : 'badge badge-success';
            }
          }
          if (data.running) setTimeout(pollStatus, 2000);
        })
        .catch(() => {});
    };
    pollStatus();
  }

  // ── Character counter for email body ─────────────────────────
  const bodyArea = document.getElementById('email-body');
  const charCount = document.getElementById('char-count');
  if (bodyArea && charCount) {
    bodyArea.addEventListener('input', () => {
      charCount.textContent = bodyArea.value.length;
    });
    charCount.textContent = bodyArea.value.length;
  }

  // ── Settings: mask/unmask password ───────────────────────────
  document.querySelectorAll('.toggle-password').forEach(btn => {
    btn.addEventListener('click', () => {
      const input = document.getElementById(btn.dataset.target);
      if (!input) return;
      if (input.type === 'password') {
        input.type = 'text';
        btn.textContent = '🙈';
      } else {
        input.type = 'password';
        btn.textContent = '👁️';
      }
    });
  });

  // ── Confirm dangerous action ─────────────────────────────────
  document.querySelectorAll('[data-confirm]').forEach(el => {
    el.addEventListener('click', e => {
      if (!confirm(el.dataset.confirm)) e.preventDefault();
    });
  });
});
