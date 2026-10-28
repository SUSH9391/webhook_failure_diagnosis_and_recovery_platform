// RelayGuard Dashboard Application Logic
// Complete implementation of all 9 interactive flows from the UI specification:
// 1. Add Endpoint Modal (form submission & feedback)
// 2. Time Range Selector Dropdown (updates time range label & dashboard state)
// 3. Search Bar with Instant Result Dropdown (deliveries, endpoints, failures)
// 4. Notification Bell Dropdown (alerts, mark as read)
// 5. User Avatar Menu (profile, team settings, billing, API keys, sign out)
// 6. Delivery Row Click (opens right-side inspection drawer)
// 7. Retry Delivery Confirmation Modal (confirmation modal before dispatch)
// 8. Replay as New Event Warning Modal (idempotency warning modal before execution)
// 9. More Actions Dropdown (view in new tab, copy IDs, raw payload, cancel retries)

const deliveriesData = [
  {
    id: "evt_8f31a2c9",
    type: "user.created",
    endpoint: "https://api.example.com/webhooks",
    status: "Failed",
    attempts: 3,
    maxAttempts: 5,
    duration: "12.4s",
    timeAgo: "2 min ago",
    timestamp: "Oct 21, 2026 10:24:32",
    diagnosis: {
      observedFact: "HTTP 401 Unauthorized returned by https://api.example.com/webhooks after 12.4s.",
      hypothesis: "The endpoint returned 401 Unauthorized. The provided API key is invalid or expired.",
      confidence: "High confidence",
      confidenceType: "high",
      suggestedActions: [
        "1. Verify the API key configured for this endpoint.",
        "2. Check if the key has expired or been revoked.",
        "3. Update the key and retry the delivery."
      ]
    },
    attemptsDetail: [
      { attempt: 1, time: "10:22:15", code: 401, latency: "11.2s", note: "Unauthorized: Invalid Authorization header" },
      { attempt: 2, time: "10:23:20", code: 401, latency: "12.1s", note: "Backoff retry attempt failed with 401" },
      { attempt: 3, time: "10:24:32", code: 401, latency: "12.4s", note: "Authorization failed. Automatic pausing triggered." }
    ],
    requestPayload: {
      event: "user.created",
      timestamp: 1761042272,
      data: {
        user_id: "usr_998142",
        email: "alex.rivera@example.com",
        plan: "enterprise_annual",
        organization_id: "org_acme_corp"
      }
    },
    responsePayload: {
      error: "unauthorized",
      message: "API key 'sec_live_99a...7b' expired on Oct 20, 2026.",
      code: 401
    }
  },
  {
    id: "evt_5d72b1a0",
    type: "order.paid",
    endpoint: "https://hooks.acme.com/orders",
    status: "Success",
    attempts: 1,
    maxAttempts: 1,
    duration: "423ms",
    timeAgo: "4 min ago",
    timestamp: "Oct 21, 2026 10:22:10",
    diagnosis: {
      observedFact: "HTTP 200 OK acknowledged in 423ms with valid JSON confirmation.",
      hypothesis: "Webhook processing completed synchronously by consumer service.",
      confidence: "Verified delivery",
      confidenceType: "success",
      suggestedActions: [
        "No recovery actions required.",
        "Endpoint latency conforms to standard SLA (< 500ms)."
      ]
    },
    attemptsDetail: [
      { attempt: 1, time: "10:22:10", code: 200, latency: "423ms", note: "HTTP 200 OK acknowledged" }
    ],
    requestPayload: {
      event: "order.paid",
      timestamp: 1761042130,
      data: {
        order_id: "ord_8831920",
        amount_usd: 840.00,
        currency: "USD",
        status: "settled"
      }
    },
    responsePayload: {
      status: "received",
      processing_job_id: "job_99824"
    }
  },
  {
    id: "evt_9c1e7d4f",
    type: "invoice.updated",
    endpoint: "https://api.billing.com/webhooks",
    status: "Retrying",
    attempts: 2,
    maxAttempts: 5,
    duration: "8.1s",
    timeAgo: "6 min ago",
    timestamp: "Oct 21, 2026 10:20:00",
    diagnosis: {
      observedFact: "HTTP 429 Too Many Requests received from https://api.billing.com/webhooks.",
      hypothesis: "Downstream consumer rate limiter tripped due to concurrent traffic bursts.",
      confidence: "High confidence (92%)",
      confidenceType: "warning",
      suggestedActions: [
        "RelayGuard exponential backoff algorithm active.",
        "Next retry attempt automatically scheduled in 30 seconds."
      ]
    },
    attemptsDetail: [
      { attempt: 1, time: "10:18:00", code: 429, latency: "4.1s", note: "Rate limit exceeded" },
      { attempt: 2, time: "10:20:00", code: 429, latency: "8.1s", note: "Jitter backoff attempt queued next in 30s" }
    ],
    requestPayload: {
      event: "invoice.updated",
      timestamp: 1761042000,
      data: { invoice_id: "inv_2026_091", state: "paid" }
    },
    responsePayload: {
      error: "rate_limited",
      retry_after_seconds: 30
    }
  },
  {
    id: "evt_2a8b6f33",
    type: "user.deleted",
    endpoint: "https://api.example.com/webhooks",
    status: "Success",
    attempts: 1,
    maxAttempts: 1,
    duration: "390ms",
    timeAgo: "12 min ago",
    timestamp: "Oct 21, 2026 10:14:48",
    diagnosis: {
      observedFact: "HTTP 204 No Content returned in 390ms.",
      hypothesis: "User resource record successfully queued for deletion downstream.",
      confidence: "Verified delivery",
      confidenceType: "success",
      suggestedActions: [
        "Audit log entry persisted."
      ]
    },
    attemptsDetail: [
      { attempt: 1, time: "10:14:48", code: 204, latency: "390ms", note: "HTTP 204 No Content" }
    ],
    requestPayload: {
      event: "user.deleted",
      timestamp: 1761041688,
      data: { user_id: "usr_10294" }
    },
    responsePayload: null
  },
  {
    id: "evt_d9f7c2a1",
    type: "subscription.created",
    endpoint: "https://webhooks.acme.com/subs",
    status: "Failed",
    attempts: 5,
    maxAttempts: 5,
    duration: "30.2s",
    timeAgo: "18 min ago",
    timestamp: "Oct 21, 2026 10:08:14",
    diagnosis: {
      observedFact: "TCP connection timed out after 30.00s. Destination server dropped connection.",
      hypothesis: "Downstream database deadlocks or thread starvation preventing socket response.",
      confidence: "High confidence (96%)",
      confidenceType: "high",
      suggestedActions: [
        "Examine destination application pool health and RDS connection pool metrics.",
        "Ensure downstream consumer returns 200 before executing background workloads.",
        "Trigger replay as new event once downstream stabilizes."
      ]
    },
    attemptsDetail: [
      { attempt: 1, time: "09:50:00", code: 504, latency: "30.0s", note: "Gateway timeout" },
      { attempt: 2, time: "09:55:00", code: 504, latency: "30.1s", note: "Gateway timeout" },
      { attempt: 3, time: "10:00:00", code: 504, latency: "30.0s", note: "Gateway timeout" },
      { attempt: 4, time: "10:04:00", code: 504, latency: "30.2s", note: "Gateway timeout" },
      { attempt: 5, time: "10:08:14", code: 504, latency: "30.2s", note: "Retries exhausted (5/5)" }
    ],
    requestPayload: {
      event: "subscription.created",
      timestamp: 1761041294,
      data: { sub_id: "sub_tier_enterprise", team_seats: 50 }
    },
    responsePayload: {
      error: "gateway_timeout",
      details: "Upstream socket hung up before response headers"
    }
  }
];

let selectedDelivery = deliveriesData[0]; // Active delivery for drawer
let activeDrawerTab = 'overview';
let activePopover = null;

document.addEventListener('DOMContentLoaded', () => {
  initSidebarPreference();
  renderTable();
  bindSidebar();
  bindDrawerEvents();
  bindGlobalSearch();
  bindGlobalClickDismiss();

  // Initialize Deliveries & Failures tables
  renderDeliveriesPageViewTable();
  renderFailuresView();

  // Initialize Lucide icons on boot
  refreshLucideIcons();

  // On large desktop, start with drawer open for evt_8f31a2c9 as shown in spec
  if (window.innerWidth >= 1280) {
    selectDelivery(deliveriesData[0].id);
  }
});

function openDrawerWithDelivery(id) {
  selectDelivery(id);
}

// ========================================================
// 6. DELIVERY ROW CLICK -> OPENS RIGHT DRAWER
// ========================================================
function renderTable() {
  const tbody = document.getElementById('deliveriesTableBody');
  if (!tbody) return;

  tbody.innerHTML = deliveriesData.map(item => {
    const isSelected = selectedDelivery && selectedDelivery.id === item.id;
    const statusClass = item.status === 'Failed' 
      ? 'failed' 
      : item.status === 'Success' 
        ? 'success' 
        : 'retrying';

    return `
      <tr class="${isSelected ? 'active-row' : ''}" onclick="selectDelivery('${item.id}')">
        <td data-label="Select" onclick="event.stopPropagation()">
          <input type="checkbox" class="event-checkbox" aria-label="Select delivery ${item.id}" />
        </td>
        <td data-label="Event ID" class="event-id-cell num-tabular">${item.id}</td>
        <td data-label="Event type" class="event-type-cell">${item.type}</td>
        <td data-label="Endpoint" class="endpoint-url-cell" title="${item.endpoint}">${item.endpoint}</td>
        <td data-label="Status">
          <span class="status-tag ${statusClass}">
            <i data-lucide="${item.status === 'Failed' ? 'circle-x' : item.status === 'Success' ? 'circle-check' : 'loader-circle'}" class="icon-control" style="margin-right:2px;"></i>
            <span>${item.status}</span>
          </span>
        </td>
        <td data-label="Attempts" class="num-tabular">${item.attempts}/${item.maxAttempts}</td>
        <td data-label="Duration" class="num-tabular">${item.duration}</td>
        <td data-label="Time" class="num-tabular">${item.timeAgo}</td>
        <td data-label="">
          <i data-lucide="chevron-right" class="chevron-row-icon icon-control"></i>
        </td>
      </tr>
    `;
  }).join('');

  refreshLucideIcons();
}

function selectDelivery(id) {
  const found = deliveriesData.find(d => d.id === id);
  if (!found) return;
  selectedDelivery = found;
  renderTable();
  openDrawer();
  renderDrawer();
}

function openDrawer() {
  const drawer = document.getElementById('inspectionDrawer');
  const backdrop = document.getElementById('drawerBackdrop');
  if (drawer) {
    drawer.classList.remove('closed');
  }
  if (backdrop && window.innerWidth < 1280) {
    backdrop.classList.add('active');
  }
}

function closeDrawer() {
  const drawer = document.getElementById('inspectionDrawer');
  const backdrop = document.getElementById('drawerBackdrop');
  if (drawer) {
    drawer.classList.add('closed');
  }
  if (backdrop) {
    backdrop.classList.remove('active');
  }
  closeAllDropdowns();
}

function renderDrawer() {
  const drawer = document.getElementById('inspectionDrawer');
  if (!drawer || !selectedDelivery) return;

  const statusBadgeClass = selectedDelivery.status === 'Failed'
    ? 'failed'
    : selectedDelivery.status === 'Success'
      ? 'success'
      : 'retrying';

  document.getElementById('drawerEventId').textContent = selectedDelivery.id;
  
  const statusBadge = document.getElementById('drawerStatusBadge');
  statusBadge.className = `status-tag ${statusBadgeClass}`;
  statusBadge.textContent = selectedDelivery.status;

  document.getElementById('drawerSubmeta').textContent = `${selectedDelivery.type} · ${selectedDelivery.timestamp}`;

  renderDrawerTabContent();
}


function renderDrawerTabContent() {
  const tabContainer = document.getElementById('drawerTabContent');
  if (!tabContainer || !selectedDelivery) return;

  if (activeDrawerTab === 'overview') {
    const isSuccess = selectedDelivery.status === 'Success';
    const isRetryingStatus = selectedDelivery.status === 'Retrying';

    tabContainer.innerHTML = `
      <div class="diagnosis-card-box">
        <div class="diagnosis-header-line">
          <div class="diagnosis-title-wrap">
            <i data-lucide="${isSuccess ? 'circle-check' : 'circle-alert'}" class="icon-standard" style="color:${isSuccess ? 'var(--color-success)' : 'var(--color-failure)'}"></i>
            <span class="diagnosis-card-title">${isSuccess ? 'Delivery verified' : 'Authentication failed'}</span>
          </div>
          <span class="ai-badge">
            <i data-lucide="sparkles" class="icon-control" style="margin-right:3px;"></i>
            <span>${isSuccess ? 'AI-verified' : 'AI-assisted'}</span>
          </span>
        </div>

        <!-- Explicit Observed Fact (Confirmed telemetry) -->
        <div class="fact-box">
          <span class="fact-label">Observed Fact</span>
          <div style="font-size: 12.5px; color: var(--text-main); font-family: var(--font-family-mono); line-height: 1.45;">
            ${selectedDelivery.diagnosis.observedFact || 'HTTP telemetry recorded by RelayGuard ingest proxy.'}
          </div>
        </div>

        <!-- AI Hypothesis (Suggested interpretation, clearly distinguished from confirmed facts) -->
        <div class="hypothesis-box" style="background: #F8FAFC; border: 1px dashed var(--border-color); border-radius: 6px; padding: 10px;">
          <div style="display: flex; align-items: center; justify-content: space-between; margin-bottom: 4px;">
            <span style="font-size: 11px; font-weight: 600; text-transform: uppercase; letter-spacing: 0.03em; color: var(--text-secondary);">
              Diagnosis Hypothesis (Unconfirmed)
            </span>
            <div class="confidence-indicator" style="color: ${isSuccess ? 'var(--color-success)' : isRetryingStatus ? 'var(--color-warning)' : 'var(--color-failure)'}; font-size: 11.5px; font-weight: 500;">
              <span class="dot-confidence" style="background: currentColor;"></span>
              <span>${selectedDelivery.diagnosis.confidence}</span>
            </div>
          </div>
          <div style="font-size: 12.5px; color: var(--text-main); line-height: 1.45;">
            ${selectedDelivery.diagnosis.hypothesis}
          </div>
        </div>

        ${!isSuccess ? `
          <div class="suggested-steps-box">
            <span class="steps-label">Recommended recovery actions</span>
            <div style="font-size:12px; color:var(--text-secondary); line-height:1.5;">
              ${selectedDelivery.diagnosis.suggestedActions.map(action => `<div>${action}</div>`).join('')}
            </div>
          </div>
        ` : ''}

        <div class="drawer-actions-stack">
          <!-- (7) Retry Delivery button -> opens confirmation modal -->
          <button class="btn-retry-primary" onclick="openRetryModal()">
            <i data-lucide="rotate-ccw" class="icon-control"></i>
            <span>Retry delivery</span>
          </button>

          <!-- (8) Replay as New Event button -> opens warning modal -->
          <button class="btn-replay-secondary" onclick="openReplayModal()">
            <i data-lucide="play" class="icon-control"></i>
            <span>Replay as new event</span>
          </button>
        </div>
      </div>

      <!-- Delivery Details Attributes -->
      <div class="detail-attributes-card">
        <span class="attributes-heading">Delivery details</span>

        <div class="attr-row-stack">
          <span class="attr-label">Endpoint</span>
          <div class="attr-value">
            <a href="${selectedDelivery.endpoint}" target="_blank" rel="noopener" class="url-link">${selectedDelivery.endpoint}</a>
            <button class="copy-btn" onclick="copyToClipboard('${selectedDelivery.endpoint}')" aria-label="Copy endpoint URL" title="Copy endpoint">
              <i data-lucide="copy" class="icon-control"></i>
            </button>
          </div>
        </div>

        <div class="attr-row">
          <span class="attr-label">Current status</span>
          <span class="status-tag ${selectedDelivery.status === 'Failed' ? 'failed' : selectedDelivery.status === 'Success' ? 'success' : 'retrying'}">${selectedDelivery.status}</span>
        </div>

        <div class="attr-row">
          <span class="attr-label">Attempts</span>
          <span class="attr-value num-tabular">${selectedDelivery.attempts} of ${selectedDelivery.maxAttempts}</span>
        </div>

        <div class="attr-row">
          <span class="attr-label">Last attempt</span>
          <span class="attr-value num-tabular">${selectedDelivery.timeAgo}</span>
        </div>

        <div class="attr-row">
          <span class="attr-label">Duration</span>
          <span class="attr-value num-tabular">
            <i data-lucide="timer" class="icon-control" style="color:var(--text-secondary);"></i>
            <span>${selectedDelivery.duration}</span>
          </span>
        </div>

        <div class="attr-row">
          <span class="attr-label">Event type</span>
          <span class="attr-value mono">${selectedDelivery.type}</span>
        </div>

        <div class="attr-row">
          <span class="attr-label">Event ID</span>
          <div class="attr-value mono">
            <span>${selectedDelivery.id}</span>
            <button class="copy-btn" onclick="copyToClipboard('${selectedDelivery.id}')" aria-label="Copy event ID" title="Copy event ID">
              <i data-lucide="copy" class="icon-control"></i>
            </button>
          </div>
        </div>
      </div>
    `;
  } else if (activeDrawerTab === 'attempts') {
    tabContainer.innerHTML = `
      <div style="display:flex; flex-direction:column; gap:10px;">
        <span class="steps-label" style="display:flex; align-items:center; gap:6px;">
          <i data-lucide="history" class="icon-control"></i>
          <span>Attempt history (${selectedDelivery.attemptsDetail.length})</span>
        </span>
        ${selectedDelivery.attemptsDetail.map(a => `
          <div style="padding:10px; border:1px solid var(--border-color); border-radius:8px; background:#F8FAFC; font-size:12px;">
            <div style="display:flex; justify-content:space-between; font-weight:600; margin-bottom:4px;">
              <span>Attempt #${a.attempt}</span>
              <span style="color:${a.code >= 400 ? 'var(--color-failure)' : 'var(--color-success)'}; font-family:var(--font-family-mono);">${a.code} · ${a.latency}</span>
            </div>
            <div style="color:var(--text-secondary); font-size:11px; margin-bottom:4px;">${a.time} UTC</div>
            <div style="color:var(--text-main);">${a.note}</div>
          </div>
        `).join('')}
      </div>
    `;
  } else if (activeDrawerTab === 'request') {
    tabContainer.innerHTML = `
      <div style="display:flex; flex-direction:column; gap:8px;">
        <div style="display:flex; justify-content:space-between; align-items:center;">
          <span class="steps-label" style="display:flex; align-items:center; gap:6px;">
            <i data-lucide="arrow-up-right" class="icon-control"></i>
            <span>Request Payload (JSON)</span>
          </span>
          <button class="copy-btn" onclick="copyToClipboard(JSON.stringify(selectedDelivery.requestPayload, null, 2))" aria-label="Copy JSON" title="Copy JSON">
            <i data-lucide="copy" class="icon-control"></i>
          </button>
        </div>
        <pre style="background:#111827; color:#E5E7EB; padding:12px; border-radius:8px; font-size:12px; font-family:var(--font-family-mono); overflow-x:auto;">${JSON.stringify(selectedDelivery.requestPayload, null, 2)}</pre>
      </div>
    `;
  } else if (activeDrawerTab === 'response') {
    tabContainer.innerHTML = `
      <div style="display:flex; flex-direction:column; gap:8px;">
        <div style="display:flex; justify-content:space-between; align-items:center;">
          <span class="steps-label" style="display:flex; align-items:center; gap:6px;">
            <i data-lucide="arrow-down-left" class="icon-control"></i>
            <span>Observed Response Body</span>
          </span>
          <button class="copy-btn" onclick="copyToClipboard(JSON.stringify(selectedDelivery.responsePayload, null, 2))" aria-label="Copy JSON" title="Copy JSON">
            <i data-lucide="copy" class="icon-control"></i>
          </button>
        </div>
        <pre style="background:#111827; color:#E5E7EB; padding:12px; border-radius:8px; font-size:12px; font-family:var(--font-family-mono); overflow-x:auto;">${selectedDelivery.responsePayload ? JSON.stringify(selectedDelivery.responsePayload, null, 2) : 'No response body returned from host.'}</pre>
      </div>
    `;
  }

  refreshLucideIcons();
}

function switchDrawerTab(tabName) {
  activeDrawerTab = tabName;
  document.querySelectorAll('.tab-btn').forEach(btn => {
    btn.classList.toggle('active', btn.dataset.tab === tabName);
  });
  renderDrawerTabContent();
}

// ========================================================
// 1. ADD ENDPOINT MODAL
// ========================================================
function openAddEndpointModal() {
  closeAllDropdowns();
  const modal = document.getElementById('addEndpointModal');
  if (modal) modal.classList.add('open');
  document.body.classList.add('modal-open');
  const nameInput = document.getElementById('endpointNameInput');
  if (nameInput) setTimeout(() => nameInput.focus(), 80);
}

function submitAddEndpoint(e) {
  e.preventDefault();
  const name = document.getElementById('endpointNameInput').value.trim();
  const url = document.getElementById('endpointUrlInput').value.trim();
  const auth = document.getElementById('endpointAuthInput').value;

  closeModal('addEndpointModal');
  showToast(`✅ Successfully registered endpoint: ${name} (${url})`);
  document.getElementById('addEndpointForm').reset();
}

// ========================================================
// 2. TIME RANGE SELECTOR DROPDOWN
// ========================================================
function toggleTimeRangeDropdown(e) {
  e.stopPropagation();
  const dropdown = document.getElementById('timeRangeDropdown');
  const isOpen = dropdown.classList.contains('open');
  closeAllDropdowns();
  if (!isOpen) {
    dropdown.classList.add('open');
    activePopover = dropdown;
  }
}

function selectTimeRange(rangeText) {
  document.getElementById('selectedTimeRangeLabel').textContent = rangeText;
  
  // Highlight active
  document.querySelectorAll('#timeRangeDropdown .dropdown-popover-item').forEach(item => {
    const isTarget = item.textContent.includes(rangeText);
    item.classList.toggle('selected', isTarget);
    const existingCheck = item.querySelector('svg');
    if (isTarget && !existingCheck) {
      item.innerHTML = `<span>${rangeText}</span><svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5"><polyline points="20 6 9 17 4 12"/></svg>`;
    } else if (!isTarget && existingCheck) {
      item.innerHTML = item.textContent.trim();
    }
  });

  closeAllDropdowns();
  showToast(`Dashboard updated for timeframe: ${rangeText}`);
}

// ========================================================
// 2B. CHART FREQUENCY SELECTOR DROPDOWN (Daily / Hourly / Weekly)
// ========================================================
function toggleChartFrequencyDropdown(e) {
  e.stopPropagation();
  const dropdown = document.getElementById('chartFrequencyDropdown');
  if (!dropdown) return;
  const isOpen = dropdown.classList.contains('open');
  closeAllDropdowns();
  if (!isOpen) {
    dropdown.classList.add('open');
    activePopover = dropdown;
  }
}

function selectChartFrequency(freq) {
  const label = document.getElementById('selectedFrequencyLabel');
  if (label) label.textContent = freq;

  document.querySelectorAll('#chartFrequencyDropdown .dropdown-popover-item').forEach(item => {
    const isTarget = item.textContent.includes(freq);
    item.classList.toggle('selected', isTarget);
    const existingCheck = item.querySelector('svg');
    if (isTarget && !existingCheck) {
      item.innerHTML = `<span>${freq}</span><svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5"><polyline points="20 6 9 17 4 12"/></svg>`;
    } else if (!isTarget && existingCheck) {
      item.innerHTML = item.textContent.trim();
    }
  });

  closeAllDropdowns();
  showToast(`Delivery activity chart switched to: ${freq} aggregation`);
}

// ========================================================
// 3. SEARCH BAR WITH INSTANT RESULTS DROPDOWN
// ========================================================
function bindGlobalSearch() {
  const searchInput = document.getElementById('topSearchInput');
  const searchDropdown = document.getElementById('searchDropdown');
  if (!searchInput || !searchDropdown) return;

  searchInput.addEventListener('focus', () => {
    closeAllDropdowns();
    searchDropdown.classList.add('open');
    activePopover = searchDropdown;
  });

  searchInput.addEventListener('input', (e) => {
    const q = e.target.value.toLowerCase().trim();
    searchDropdown.classList.add('open');

    // Filter table in background
    const rows = document.querySelectorAll('#deliveriesTableBody tr');
    rows.forEach(row => {
      const text = row.textContent.toLowerCase();
      row.style.display = text.includes(q) ? '' : 'none';
    });
  });

  // Shortcut Cmd+K or Ctrl+K
  window.addEventListener('keydown', (e) => {
    if ((e.metaKey || e.ctrlKey) && e.key === 'k') {
      e.preventDefault();
      searchInput.focus();
    }
    if (e.key === 'Escape') {
      closeAllDropdowns();
      closeAllModals();
    }
  });
}

function selectFromSearch(eventId) {
  closeAllDropdowns();
  selectDelivery(eventId);
  showToast(`Selected event: ${eventId}`);
}

function filterByEndpoint(endpoint) {
  closeAllDropdowns();
  const searchInput = document.getElementById('topSearchInput');
  if (searchInput) searchInput.value = endpoint;
  const rows = document.querySelectorAll('#deliveriesTableBody tr');
  rows.forEach(row => {
    row.style.display = row.textContent.includes(endpoint) ? '' : 'none';
  });
  showToast(`Filtered deliveries by ${endpoint}`);
}

function filterByError(errCode) {
  closeAllDropdowns();
  const searchInput = document.getElementById('topSearchInput');
  if (searchInput) searchInput.value = errCode;
  const rows = document.querySelectorAll('#deliveriesTableBody tr');
  rows.forEach(row => {
    row.style.display = row.textContent.includes('Failed') ? '' : 'none';
  });
  showToast(`Showing failure group: ${errCode} errors`);
}

// ========================================================
// 4. NOTIFICATION BELL DROPDOWN
// ========================================================
function toggleNotificationDropdown(e) {
  e.stopPropagation();
  const dropdown = document.getElementById('notificationsDropdown');
  const isOpen = dropdown.classList.contains('open');
  closeAllDropdowns();
  if (!isOpen) {
    dropdown.classList.add('open');
    activePopover = dropdown;
  }
}

function markAllNotificationsRead() {
  document.querySelectorAll('.notif-item.unread').forEach(item => {
    item.classList.remove('unread');
  });
  const unreadDot = document.getElementById('unreadNotifDot');
  if (unreadDot) unreadDot.style.display = 'none';
  showToast('All notifications marked as read');
}

// ========================================================
// 5. USER AVATAR MENU
// ========================================================
function toggleUserDropdown(e) {
  e.stopPropagation();
  const dropdown = document.getElementById('userDropdown');
  const isOpen = dropdown.classList.contains('open');
  closeAllDropdowns();
  if (!isOpen) {
    dropdown.classList.add('open');
    activePopover = dropdown;
  }
}

// ========================================================
// 7. RETRY DELIVERY CONFIRMATION MODAL
// ========================================================
function openRetryModal() {
  closeAllDropdowns();
  const modal = document.getElementById('retryConfirmModal');
  if (modal) modal.classList.add('open');
  document.body.classList.add('modal-open');
}

function confirmExecuteRetry() {
  closeModal('retryConfirmModal');
  if (!selectedDelivery) return;

  const btn = document.querySelector('.btn-retry-primary');
  if (btn) {
    btn.disabled = true;
    btn.innerHTML = `
      <i data-lucide="loader-circle" class="icon-control" style="animation: spin 1s linear infinite;"></i>
      <span>Retrying...</span>
    `;
    refreshLucideIcons();
  }

  showToast(`⚡ Dispatched retry to ${selectedDelivery.endpoint}...`);

  setTimeout(() => {
    selectedDelivery.status = "Success";
    selectedDelivery.duration = "384ms";
    selectedDelivery.attempts += 1;
    selectedDelivery.timeAgo = "Just now";
    selectedDelivery.diagnosis = {
      observedFact: "HTTP 200 OK returned on retry attempt in 384ms.",
      hypothesis: "Manual retry succeeded. Destination server acknowledged payload.",
      confidence: "Verified delivery",
      confidenceType: "success",
      suggestedActions: ["Delivery recovered. Audit record persisted."]
    };
    selectedDelivery.attemptsDetail.push({
      attempt: selectedDelivery.attempts,
      time: "10:26:04 UTC",
      code: 200,
      latency: "384ms",
      note: "Manual retry succeeded with 200 OK"
    });

    renderTable();
    renderDrawer();
    showToast(`✅ Delivery ${selectedDelivery.id} successfully delivered!`);
  }, 1100);
}

// ========================================================
// 8. REPLAY AS NEW EVENT WARNING MODAL
// ========================================================
function openReplayModal() {
  closeAllDropdowns();
  const modal = document.getElementById('replayConfirmModal');
  if (modal) modal.classList.add('open');
  document.body.classList.add('modal-open');
}

function confirmExecuteReplay() {
  closeModal('replayConfirmModal');
  if (!selectedDelivery) return;

  const newId = 'evt_' + Math.random().toString(36).substr(2, 8);
  showToast(`🔄 Replaying as new event ${newId}...`);

  setTimeout(() => {
    deliveriesData.unshift({
      id: newId,
      type: selectedDelivery.type,
      endpoint: selectedDelivery.endpoint,
      status: "Success",
      attempts: 1,
      maxAttempts: 5,
      duration: "310ms",
      timeAgo: "Just now",
      timestamp: "Oct 21, 2026 10:28:01",
      diagnosis: {
        observedFact: "HTTP 200 OK acknowledged in 310ms.",
        hypothesis: "Replayed event accepted with freshly generated idempotency key.",
        confidence: "Verified delivery",
        confidenceType: "success",
        suggestedActions: ["Audit record updated."]
      },
      attemptsDetail: [
        { attempt: 1, time: "10:28:01 UTC", code: 200, latency: "310ms", note: "Replay dispatched and acknowledged" }
      ],
      requestPayload: selectedDelivery.requestPayload,
      responsePayload: { status: "received", replay: true, event_id: newId }
    });
    selectDelivery(newId);
    showToast(`✨ Replay ${newId} dispatched successfully!`);
  }, 900);
}

// ========================================================
// 9. MORE ACTIONS DROPDOWN IN DRAWER
// ========================================================
function toggleDrawerMoreDropdown(e) {
  e.stopPropagation();
  const dropdown = document.getElementById('drawerMoreDropdown');
  const isOpen = dropdown.classList.contains('open');
  closeAllDropdowns();
  if (!isOpen) {
    dropdown.classList.add('open');
    activePopover = dropdown;
  }
}

function actionViewInNewTab() {
  closeAllDropdowns();
  if (selectedDelivery) {
    window.open(selectedDelivery.endpoint, '_blank');
  }
}

function actionCopyEventId() {
  closeAllDropdowns();
  if (selectedDelivery) {
    copyToClipboard(selectedDelivery.id);
  }
}

function actionCopyEndpointUrl() {
  closeAllDropdowns();
  if (selectedDelivery) {
    copyToClipboard(selectedDelivery.endpoint);
  }
}

function actionViewRawPayload() {
  closeAllDropdowns();
  switchDrawerTab('request');
}

function actionCancelPendingRetries() {
  closeAllDropdowns();
  if (selectedDelivery) {
    selectedDelivery.status = "Failed";
    selectedDelivery.diagnosis.hypothesis = "Pending retries were manually cancelled by operator.";
    renderTable();
    renderDrawer();
    showToast(`Cancelled pending retries for ${selectedDelivery.id}`);
  }
}

// ========================================================
// GENERAL UTILITIES: Popovers, Modals & Toast
// ========================================================
let activePortalInfo = null;

function closeAllDropdowns() {
  if (activePortalInfo) {
    const { menu, placeholder, trigger } = activePortalInfo;
    menu.classList.remove('open', 'portal-active', 'open-upward');
    menu.style.top = '';
    menu.style.left = '';
    menu.style.right = '';
    menu.style.bottom = '';
    if (placeholder && placeholder.parentNode) {
      placeholder.parentNode.insertBefore(menu, placeholder);
      placeholder.remove();
    }
    if (window._portalScrollHandler) {
      window.removeEventListener('scroll', window._portalScrollHandler, true);
      window.removeEventListener('resize', window._portalScrollHandler, true);
      window._portalScrollHandler = null;
    }
    if (trigger && document.activeElement && menu.contains(document.activeElement)) {
      trigger.focus();
    }
    activePortalInfo = null;
  }

  document.querySelectorAll('.dropdown-popover-menu').forEach(el => {
    el.classList.remove('open');
  });
  const searchDropdown = document.getElementById('searchDropdown');
  if (searchDropdown) searchDropdown.classList.remove('open');
  activePopover = null;
}

function openDropdownInPortal(triggerBtn, menu) {
  closeAllDropdowns();
  if (!triggerBtn || !menu) return;

  // Insert placeholder in DOM so we can put menu back when closed
  const placeholder = document.createComment(`portal-placeholder-${menu.id}`);
  menu.parentNode.insertBefore(placeholder, menu);

  // Move menu directly to document.body
  document.body.appendChild(menu);
  menu.classList.add('portal-active', 'open');

  function updatePosition() {
    if (!menu.classList.contains('portal-active')) return;
    const triggerRect = triggerBtn.getBoundingClientRect();
    const menuWidth = menu.offsetWidth || 190;
    const menuHeight = menu.offsetHeight || 135;
    const gap = 6;

    // Check vertical space
    const spaceBelow = window.innerHeight - triggerRect.bottom;
    const openUpward = spaceBelow < menuHeight + gap && triggerRect.top > menuHeight + gap;

    let topPos;
    if (openUpward) {
      topPos = Math.max(8, triggerRect.top - menuHeight - gap);
      menu.classList.add('open-upward');
    } else {
      topPos = Math.min(window.innerHeight - menuHeight - 8, triggerRect.bottom + gap);
      menu.classList.remove('open-upward');
    }

    // Align right edge of menu with right edge of trigger button
    let leftPos = triggerRect.right - menuWidth;
    if (leftPos < 8) leftPos = 8;
    if (leftPos + menuWidth > window.innerWidth - 8) {
      leftPos = window.innerWidth - menuWidth - 8;
    }

    menu.style.top = `${topPos}px`;
    menu.style.left = `${leftPos}px`;
    menu.style.right = 'auto';
    menu.style.bottom = 'auto';
  }

  updatePosition();

  // Listen to scrolling and resizing
  window._portalScrollHandler = () => {
    // If trigger element has scrolled out of view or is no longer connected, close it
    if (!triggerBtn.isConnected) {
      closeAllDropdowns();
      return;
    }
    updatePosition();
  };
  window.addEventListener('scroll', window._portalScrollHandler, true);
  window.addEventListener('resize', window._portalScrollHandler, true);

  activePopover = menu;
  activePortalInfo = { menu, placeholder, trigger: triggerBtn };
}

function bindGlobalClickDismiss() {
  document.addEventListener('click', (e) => {
    if (activePopover && !activePopover.contains(e.target)) {
      if (activePortalInfo && activePortalInfo.trigger && activePortalInfo.trigger.contains(e.target)) {
        return;
      }
      closeAllDropdowns();
    }
  });

  document.addEventListener('keydown', (e) => {
    if (e.key === 'Escape') {
      if (activePopover) {
        const trigger = activePortalInfo ? activePortalInfo.trigger : null;
        closeAllDropdowns();
        if (trigger) trigger.focus();
      }
    }
  });
}

function closeModal(modalId) {
  const modal = document.getElementById(modalId);
  if (modal) modal.classList.remove('open');
  // Check if any other modal is still open
  const anyOpen = document.querySelector('.modal-overlay.open');
  if (!anyOpen) {
    document.body.classList.remove('modal-open');
  }
}

function closeAllModals() {
  document.querySelectorAll('.modal-overlay').forEach(m => m.classList.remove('open'));
  document.body.classList.remove('modal-open');
}

function handleModalOverlayClick(e, modalId) {
  if (e.target.id === modalId) {
    closeModal(modalId);
  }
}

function bindDrawerEvents() {
  document.querySelectorAll('.tab-btn').forEach(btn => {
    btn.addEventListener('click', () => {
      switchDrawerTab(btn.dataset.tab);
    });
  });
}

function bindSidebar() {
  document.querySelectorAll('.nav-item').forEach(link => {
    link.addEventListener('click', (e) => {
      e.preventDefault();
      const tabName = link.dataset.nav;
      navigateToTab(tabName);
      
      const sidebar = document.getElementById('appSidebar');
      if (sidebar && sidebar.classList.contains('mobile-open')) {
        toggleMobileSidebar();
      }
    });
  });
}

function navigateToTab(tabName) {
  // Update sidebar active state
  document.querySelectorAll('.nav-item').forEach(l => {
    if (l.dataset.nav === tabName) {
      l.classList.add('active');
    } else {
      l.classList.remove('active');
    }
  });

  // Map tabName to panel ID
  const tabMap = {
    overview: 'viewOverview',
    deliveries: 'viewDeliveries',
    failures: 'viewFailures',
    endpoints: 'viewEndpoints',
    replays: 'viewReplays',
    alerts: 'viewAlerts',
    settings: 'viewSettings'
  };

  const targetId = tabMap[tabName] || 'viewOverview';
  document.querySelectorAll('.app-view-panel').forEach(panel => {
    if (panel.id === targetId) {
      panel.style.display = 'flex';
      panel.classList.add('active');
    } else {
      panel.style.display = 'none';
      panel.classList.remove('active');
    }
  });

  if (tabName === 'deliveries') {
    renderDeliveriesPageViewTable();
  } else if (tabName === 'failures') {
    renderFailuresView();
  }

  refreshLucideIcons();
  showToast(`Switched view to ${tabName.charAt(0).toUpperCase() + tabName.slice(1)}`);
}

// Deliveries Page Filter & Sort State
let deliveriesFilterState = {
  status: 'All statuses',
  type: 'All event types',
  endpoint: 'All endpoints',
  date: 'Last 7 days',
  sort: 'newest'
};

function toggleDeliveriesStatusDropdown(e) {
  e.stopPropagation();
  const dropdown = document.getElementById('deliveriesStatusDropdown');
  const isOpen = dropdown && dropdown.classList.contains('open');
  closeAllDropdowns();
  if (dropdown && !isOpen) {
    dropdown.classList.add('open');
    activePopover = dropdown;
  }
}

function toggleDeliveriesTypeDropdown(e) {
  e.stopPropagation();
  const dropdown = document.getElementById('deliveriesTypeDropdown');
  const isOpen = dropdown && dropdown.classList.contains('open');
  closeAllDropdowns();
  if (dropdown && !isOpen) {
    dropdown.classList.add('open');
    activePopover = dropdown;
  }
}

function toggleDeliveriesEndpointDropdown(e) {
  e.stopPropagation();
  const dropdown = document.getElementById('deliveriesEndpointDropdown');
  const isOpen = dropdown && dropdown.classList.contains('open');
  closeAllDropdowns();
  if (dropdown && !isOpen) {
    dropdown.classList.add('open');
    activePopover = dropdown;
  }
}

function toggleDeliveriesDateDropdown(e) {
  e.stopPropagation();
  const dropdown = document.getElementById('deliveriesDateDropdown');
  const isOpen = dropdown && dropdown.classList.contains('open');
  closeAllDropdowns();
  if (dropdown && !isOpen) {
    dropdown.classList.add('open');
    activePopover = dropdown;
  }
}

function toggleDeliveriesAdvancedFilter(e) {
  e.stopPropagation();
  const menu = document.getElementById('deliveriesFilterMenu');
  const isOpen = menu && menu.classList.contains('open');
  closeAllDropdowns();
  if (menu && !isOpen) {
    menu.classList.add('open');
    activePopover = menu;
  }
}

function toggleDeliveriesSortMenu(e) {
  e.stopPropagation();
  const menu = document.getElementById('deliveriesSortMenu');
  const isOpen = menu && menu.classList.contains('open');
  closeAllDropdowns();
  if (menu && !isOpen) {
    menu.classList.add('open');
    activePopover = menu;
  }
}

function setDeliveriesFilter(filterKey, value) {
  deliveriesFilterState[filterKey] = value;
  
  if (filterKey === 'status') {
    const lbl = document.getElementById('filterStatusLabel');
    if (lbl) lbl.textContent = value;
    const btn = document.getElementById('filterStatusBtn');
    if (btn) btn.classList.toggle('active-filter', value !== 'All statuses');
    updatePopoverItemCheck('deliveriesStatusDropdown', value);
  } else if (filterKey === 'type') {
    const lbl = document.getElementById('filterEventTypeLabel');
    if (lbl) lbl.textContent = value;
    const btn = document.getElementById('filterEventTypeBtn');
    if (btn) btn.classList.toggle('active-filter', value !== 'All event types');
    updatePopoverItemCheck('deliveriesTypeDropdown', value);
  } else if (filterKey === 'endpoint') {
    const lbl = document.getElementById('filterEndpointLabel');
    if (lbl) lbl.textContent = value;
    const btn = document.getElementById('filterEndpointBtn');
    if (btn) btn.classList.toggle('active-filter', value !== 'All endpoints');
    updatePopoverItemCheck('deliveriesEndpointDropdown', value);
  } else if (filterKey === 'date') {
    const lbl = document.getElementById('filterDateLabel');
    if (lbl) lbl.textContent = value;
    const btn = document.getElementById('deliveriesDateTrigger');
    if (btn) btn.classList.toggle('active-filter', value !== 'Last 7 days');
    updatePopoverItemCheck('deliveriesDateDropdown', value);
  }

  closeAllDropdowns();
  renderDeliveriesPageViewTable();
  showToast(`Filtered by ${filterKey}: ${value}`);
}

function updatePopoverItemCheck(containerId, value) {
  const container = document.getElementById(containerId);
  if (!container) return;
  container.querySelectorAll('.dropdown-popover-item').forEach(item => {
    const isTarget = item.textContent.trim().startsWith(value);
    item.classList.toggle('selected', isTarget);
    const existingCheck = item.querySelector('svg');
    if (isTarget && !existingCheck) {
      item.innerHTML = `<span>${value}</span><svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5"><polyline points="20 6 9 17 4 12"/></svg>`;
    } else if (!isTarget && existingCheck) {
      item.innerHTML = `<span>${item.textContent.trim()}</span>`;
    }
  });
}

function applyDeliveryPreset(preset) {
  closeAllDropdowns();
  const filterBtn = document.getElementById('deliveriesFilterBtn');
  if (preset === 'failures_only') {
    deliveriesFilterState.status = 'Failed';
    setDeliveriesFilter('status', 'Failed');
    if (filterBtn) filterBtn.classList.add('active-filter');
    showToast('Applied filter: Failed deliveries only');
  } else if (preset === 'retries_active') {
    deliveriesFilterState.status = 'Retrying';
    setDeliveriesFilter('status', 'Retrying');
    if (filterBtn) filterBtn.classList.add('active-filter');
    showToast('Applied filter: Active retries only');
  } else if (preset === 'high_latency') {
    deliveriesFilterState.status = 'All statuses';
    deliveriesFilterState.sort = 'latency';
    setDeliveriesSort('latency');
    if (filterBtn) filterBtn.classList.add('active-filter');
    showToast('Applied preset: Highest latency deliveries');
  }
}

function resetDeliveriesFilters() {
  closeAllDropdowns();
  deliveriesFilterState = {
    status: 'All statuses',
    type: 'All event types',
    endpoint: 'All endpoints',
    date: 'Last 7 days',
    sort: 'newest'
  };

  const statusLbl = document.getElementById('filterStatusLabel');
  if (statusLbl) statusLbl.textContent = 'All statuses';
  const statusBtn = document.getElementById('filterStatusBtn');
  if (statusBtn) statusBtn.classList.remove('active-filter');

  const typeLbl = document.getElementById('filterEventTypeLabel');
  if (typeLbl) typeLbl.textContent = 'All event types';
  const typeBtn = document.getElementById('filterEventTypeBtn');
  if (typeBtn) typeBtn.classList.remove('active-filter');

  const epLbl = document.getElementById('filterEndpointLabel');
  if (epLbl) epLbl.textContent = 'All endpoints';
  const epBtn = document.getElementById('filterEndpointBtn');
  if (epBtn) epBtn.classList.remove('active-filter');

  const dateLbl = document.getElementById('filterDateLabel');
  if (dateLbl) dateLbl.textContent = 'Last 7 days';
  const dateBtn = document.getElementById('deliveriesDateTrigger');
  if (dateBtn) dateBtn.classList.remove('active-filter');

  const filterBtn = document.getElementById('deliveriesFilterBtn');
  if (filterBtn) filterBtn.classList.remove('active-filter');

  updatePopoverItemCheck('deliveriesStatusDropdown', 'All statuses');
  updatePopoverItemCheck('deliveriesTypeDropdown', 'All event types');
  updatePopoverItemCheck('deliveriesEndpointDropdown', 'All endpoints');
  updatePopoverItemCheck('deliveriesDateDropdown', 'Last 7 days');

  renderDeliveriesPageViewTable();
  showToast('Reset all filters');
}

function setDeliveriesSort(sortMode) {
  deliveriesFilterState.sort = sortMode;
  closeAllDropdowns();

  const sortBtn = document.getElementById('deliveriesSortBtn');
  if (sortBtn) sortBtn.classList.toggle('active-filter', sortMode !== 'newest');

  const sortContainer = document.getElementById('deliveriesSortMenu');
  if (sortContainer) {
    sortContainer.querySelectorAll('.dropdown-popover-item').forEach(item => {
      item.classList.remove('selected');
      const existingCheck = item.querySelector('svg');
      if (existingCheck) existingCheck.remove();
    });
    const activeItem = document.getElementById(`sortOption${sortMode.charAt(0).toUpperCase() + sortMode.slice(1)}`);
    if (activeItem) {
      activeItem.classList.add('selected');
      activeItem.innerHTML = `<span>${activeItem.textContent.trim()}</span><svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5"><polyline points="20 6 9 17 4 12"/></svg>`;
    }
  }

  renderDeliveriesPageViewTable();
  showToast(`Sorted deliveries by: ${sortMode}`);
}

function renderDeliveriesPageViewTable() {
  const container = document.getElementById('deliveriesPageViewTableBody');
  if (!container) return;

  // Filter list according to deliveriesFilterState
  let filtered = deliveriesData.filter(item => {
    if (deliveriesFilterState.status !== 'All statuses' && item.status !== deliveriesFilterState.status) {
      return false;
    }
    if (deliveriesFilterState.type !== 'All event types' && item.type !== deliveriesFilterState.type) {
      return false;
    }
    if (deliveriesFilterState.endpoint !== 'All endpoints') {
      const plainEp = item.endpoint.replace('https://', '');
      if (!plainEp.includes(deliveriesFilterState.endpoint)) return false;
    }
    return true;
  });

  // Sort list
  if (deliveriesFilterState.sort === 'oldest') {
    filtered = [...filtered].reverse();
  } else if (deliveriesFilterState.sort === 'attempts') {
    filtered = [...filtered].sort((a, b) => b.attempts - a.attempts);
  } else if (deliveriesFilterState.sort === 'latency') {
    filtered = [...filtered].sort((a, b) => {
      const getMs = (s) => s.includes('s') && !s.includes('ms') ? parseFloat(s) * 1000 : parseFloat(s);
      return getMs(b.duration || '0') - getMs(a.duration || '0');
    });
  }

  if (filtered.length === 0) {
    container.innerHTML = `
      <tr>
        <td colspan="7" style="text-align: center; padding: 36px 16px; color: var(--text-secondary);">
          <div style="display:flex; flex-direction:column; align-items:center; gap:8px;">
            <i data-lucide="inbox" style="width:32px; height:32px; color:#94A3B8;"></i>
            <span style="font-size:14px; font-weight:500;">No deliveries match the selected filters</span>
            <button class="btn-table-action" onclick="resetDeliveriesFilters()" style="margin-top:4px;">Reset filters</button>
          </div>
        </td>
      </tr>
    `;
    refreshLucideIcons();
    return;
  }
  
  container.innerHTML = filtered.map(item => `
    <tr class="table-row-clickable ${selectedDelivery && selectedDelivery.id === item.id ? 'selected' : ''}" onclick="openDrawerWithDelivery('${item.id}')">
      <td class="id-mono"><span class="id-token">${item.id}</span></td>
      <td><span class="event-type-badge">${item.type}</span></td>
      <td class="endpoint-cell"><span class="endpoint-name">${item.endpoint.replace('https://', '')}</span></td>
      <td>
        <span class="status-tag ${item.status === 'Failed' ? 'failed' : item.status === 'Success' ? 'success' : 'retrying'}">
          <i data-lucide="${item.status === 'Success' ? 'circle-check' : item.status === 'Failed' ? 'circle-x' : 'loader-circle'}" class="icon-control"></i>
          <span>${item.status}</span>
        </span>
      </td>
      <td class="num-tabular font-medium">${item.attempts}/${item.maxAttempts}</td>
      <td class="num-tabular text-muted">${item.timeAgo}</td>
      <td>
        <i data-lucide="chevron-right" class="row-arrow icon-control"></i>
      </td>
    </tr>
  `).join('');

  refreshLucideIcons();
}

function toggleSidebarCollapse() {
  const sidebar = document.getElementById('appSidebar');
  const toggleBtn = document.getElementById('sidebarToggleBtn');
  if (!sidebar) return;

  const isCollapsed = sidebar.classList.toggle('collapsed');
  
  if (toggleBtn) {
    toggleBtn.innerHTML = `<i data-lucide="${isCollapsed ? 'panel-left-open' : 'panel-left-close'}" class="icon-control"></i>`;
    toggleBtn.setAttribute('title', isCollapsed ? 'Expand sidebar' : 'Collapse sidebar');
    toggleBtn.setAttribute('aria-label', isCollapsed ? 'Expand sidebar' : 'Collapse sidebar');
  }

  // Persist preference
  try {
    localStorage.setItem('relayguard_sidebar_collapsed', isCollapsed ? 'true' : 'false');
  } catch (e) {}

  refreshLucideIcons();
}

// Restore sidebar preference on load
function initSidebarPreference() {
  try {
    const saved = localStorage.getItem('relayguard_sidebar_collapsed');
    if (saved === 'true') {
      const sidebar = document.getElementById('appSidebar');
      const toggleBtn = document.getElementById('sidebarToggleBtn');
      if (sidebar) sidebar.classList.add('collapsed');
      if (toggleBtn) {
        toggleBtn.innerHTML = `<i data-lucide="panel-left-open" class="icon-control"></i>`;
        toggleBtn.setAttribute('title', 'Expand sidebar');
        toggleBtn.setAttribute('aria-label', 'Expand sidebar');
      }
    }
  } catch (e) {}
}

function toggleProjectDropdown(e) {
  if (e) e.stopPropagation();
  const menu = document.getElementById('projectDropdownMenu');
  if (!menu) return;

  const isVisible = menu.classList.contains('visible');
  closeAllDropdowns();
  if (!isVisible) {
    menu.classList.add('visible');
  }
}

function switchProject(projectName, region) {
  const titleEl = document.getElementById('sidebarProjectName');
  if (titleEl) titleEl.textContent = projectName;
  
  const selectorBtn = document.getElementById('projectSelectorBtn');
  if (selectorBtn) selectorBtn.setAttribute('data-tooltip', projectName);

  const settingsNameInput = document.getElementById('settingsProjectName');
  if (settingsNameInput) settingsNameInput.value = projectName;

  // Update checkmarks in project dropdown
  document.querySelectorAll('#projectDropdownMenu .project-menu-item').forEach(item => {
    const nameSpan = item.querySelector('div > div:first-child');
    const existingCheck = item.querySelector('.check-icon');
    if (existingCheck) existingCheck.remove();

    if (nameSpan && nameSpan.textContent.trim() === projectName) {
      item.classList.add('selected');
      const checkEl = document.createElement('i');
      checkEl.setAttribute('data-lucide', 'check');
      checkEl.className = 'icon-control check-icon';
      item.appendChild(checkEl);
    } else {
      item.classList.remove('selected');
    }
  });

  closeAllDropdowns();
  refreshLucideIcons();
  showToast(`Switched active workspace to "${projectName}" (${region})`);
}

// ========================================================
// FAILURES PAGE: FAILURE GROUPS & RECENT FAILURES DATA
// ========================================================
const failureGroupsData = [
  {
    errorType: "401 Unauthorized",
    code: "401",
    codeClass: "code-4xx",
    affectedCount: 120,
    lastSeen: "Oct 21, 10:24 AM",
    status: "Active",
    statusClass: "status-danger",
    statusIcon: "circle-alert",
    associatedDeliveryId: "evt_8f31a2c9",
    actionLabel: "Investigate"
  },
  {
    errorType: "500 Server Error",
    code: "500",
    codeClass: "code-5xx",
    affectedCount: 66,
    lastSeen: "Oct 21, 09:12 AM",
    status: "Active",
    statusClass: "status-danger",
    statusIcon: "circle-alert",
    associatedDeliveryId: "evt_d9f7c2a1",
    actionLabel: "Investigate"
  },
  {
    errorType: "Timeout (10000ms)",
    code: "0",
    codeClass: "code-warning",
    affectedCount: 54,
    lastSeen: "Oct 21, 08:45 AM",
    status: "Active",
    statusClass: "status-warning",
    statusIcon: "triangle-alert",
    associatedDeliveryId: "evt_d9f7c2a1",
    actionLabel: "Investigate"
  },
  {
    errorType: "404 Not Found",
    code: "404",
    codeClass: "code-4xx",
    affectedCount: 28,
    lastSeen: "Oct 20, 11:02 PM",
    status: "Resolved",
    statusClass: "status-success",
    statusIcon: "circle-check",
    associatedDeliveryId: "evt_8f31a2c9",
    actionLabel: "View"
  },
  {
    errorType: "429 Rate Limited",
    code: "429",
    codeClass: "code-warning",
    affectedCount: 18,
    lastSeen: "Oct 20, 10:18 PM",
    status: "Active",
    statusClass: "status-warning",
    statusIcon: "triangle-alert",
    associatedDeliveryId: "evt_9c1e7d4f",
    actionLabel: "Investigate"
  }
];

let activeFailureSubtab = 'groups';

function renderFailuresView() {
  const thead = document.getElementById('failuresTableHead');
  const tbody = document.getElementById('failuresTableBody');
  if (!thead || !tbody) return;

  if (activeFailureSubtab === 'groups') {
    thead.innerHTML = `
      <tr>
        <th>Error type</th>
        <th>HTTP code</th>
        <th>Affected deliveries</th>
        <th>Last seen</th>
        <th>Status</th>
        <th style="width: 100px; text-align: right;">Action</th>
      </tr>
    `;

    tbody.innerHTML = failureGroupsData.map(group => `
      <tr class="table-row-clickable" onclick="openDrawerWithDelivery('${group.associatedDeliveryId}')">
        <td class="font-semibold ${group.status === 'Resolved' ? 'text-muted' : group.code === '500' || group.code === '401' ? 'text-danger' : 'text-warning'}">
          ${group.errorType}
        </td>
        <td><span class="badge-status-code ${group.codeClass}">${group.code}</span></td>
        <td class="num-tabular font-medium">${group.affectedCount}</td>
        <td class="num-tabular text-muted">${group.lastSeen}</td>
        <td>
          <span class="status-pill ${group.statusClass}">
            <i data-lucide="${group.statusIcon}" class="icon-control"></i>
            <span>${group.status}</span>
          </span>
        </td>
        <td style="text-align: right;">
          <button class="btn-table-action ${group.actionLabel === 'View' ? 'secondary' : ''}" onclick="event.stopPropagation(); openDrawerWithDelivery('${group.associatedDeliveryId}')">
            ${group.actionLabel}
          </button>
        </td>
      </tr>
    `).join('');
  } else {
    // Recent failures subtab: real failure event logs
    const failedDeliveries = deliveriesData.filter(d => d.status === 'Failed' || d.status === 'Retrying');
    
    thead.innerHTML = `
      <tr>
        <th>Event ID</th>
        <th>Event type</th>
        <th>Endpoint</th>
        <th>Failure Reason</th>
        <th>Attempts</th>
        <th>Last Attempt</th>
        <th style="width: 100px; text-align: right;">Action</th>
      </tr>
    `;

    tbody.innerHTML = failedDeliveries.map(item => `
      <tr class="table-row-clickable" onclick="openDrawerWithDelivery('${item.id}')">
        <td class="id-mono"><span class="id-token">${item.id}</span></td>
        <td><span class="event-type-badge">${item.type}</span></td>
        <td class="endpoint-cell"><span class="endpoint-name">${item.endpoint.replace('https://', '')}</span></td>
        <td>
          <span class="status-tag ${item.status.toLowerCase()}">
            <i data-lucide="${item.status === 'Failed' ? 'circle-x' : 'loader-circle'}" class="icon-control"></i>
            <span>${item.status === 'Failed' ? 'Delivery Failed' : 'Retrying (429)'}</span>
          </span>
        </td>
        <td class="num-tabular font-medium">${item.attempts}/${item.maxAttempts}</td>
        <td class="num-tabular text-muted">${item.timeAgo}</td>
        <td style="text-align: right;">
          <button class="btn-table-action" onclick="event.stopPropagation(); openDrawerWithDelivery('${item.id}')">
            Investigate
          </button>
        </td>
      </tr>
    `).join('');
  }

  refreshLucideIcons();
}

function switchFailureSubtab(btn, tab) {
  if (btn && btn.parentElement) {
    btn.parentElement.querySelectorAll('.view-subtab').forEach(b => b.classList.remove('active'));
    btn.classList.add('active');
  }
  activeFailureSubtab = tab;
  renderFailuresView();
  showToast(`Switched to: ${tab === 'groups' ? 'Failure Groups' : 'Recent Failures'}`);
}

function switchSettingsSection(btn, section) {
  // Update nav item active state
  document.querySelectorAll('.settings-nav-item').forEach(b => b.classList.remove('active'));
  if (btn) btn.classList.add('active');

  // Hide all settings subpanels
  document.querySelectorAll('.settings-subpanel').forEach(p => p.classList.remove('active'));

  // Show target section
  const sectionMap = {
    'general': 'settingsSecGeneral',
    'team': 'settingsSecTeam',
    'apikeys': 'settingsSecApikeys',
    'notifications': 'settingsSecNotifications',
    'delivery': 'settingsSecDelivery',
    'security': 'settingsSecSecurity',
    'billing': 'settingsSecBilling'
  };

  const targetId = sectionMap[section];
  if (targetId) {
    const targetEl = document.getElementById(targetId);
    if (targetEl) targetEl.classList.add('active');
  }

  refreshLucideIcons();
  showToast(`Settings: ${section === 'delivery' ? 'Delivery & retry' : section === 'apikeys' ? 'API keys' : section.charAt(0).toUpperCase() + section.slice(1)}`);
}

// Backward compatibility alias if any old triggers exist
function switchSettingsSubtab(btn, tab) {
  switchSettingsSection(btn, tab);
}

function confirmDestructiveAction(actionTitle, message) {
  const confirmed = window.confirm(`${actionTitle}\n\n${message}`);
  if (confirmed) {
    showToast(`Confirmed: ${actionTitle} executed successfully.`);
  } else {
    showToast(`Cancelled: ${actionTitle}`);
  }
}

function toggleMobileSidebar() {
  const sidebar = document.getElementById('appSidebar');
  const backdrop = document.getElementById('drawerBackdrop');
  if (!sidebar) return;

  const isOpen = sidebar.classList.toggle('mobile-open');
  if (backdrop) {
    if (isOpen) {
      backdrop.classList.add('active');
    } else if (!selectedDelivery || window.innerWidth >= 1280) {
      backdrop.classList.remove('active');
    }
  }
}

function copyToClipboard(text, btnElement) {
  if (navigator.clipboard) {
    navigator.clipboard.writeText(text);
  }
  
  if (btnElement) {
    const originalHtml = btnElement.innerHTML;
    btnElement.classList.add('copied');
    btnElement.innerHTML = `<i data-lucide="check" class="icon-control"></i>`;
    refreshLucideIcons();
    
    setTimeout(() => {
      btnElement.classList.remove('copied');
      btnElement.innerHTML = originalHtml;
      refreshLucideIcons();
    }, 1800);
  }

  showToast(`Copied to clipboard: ${text}`);
}

// Endpoint row actions
function toggleEndpointActionMenu(e, menuId) {
  e.stopPropagation();
  const triggerBtn = e.currentTarget;
  const menu = document.getElementById(menuId);
  const isOpen = menu && (menu.classList.contains('open') || (activePortalInfo && activePortalInfo.menu === menu));
  if (isOpen) {
    closeAllDropdowns();
  } else {
    openDropdownInPortal(triggerBtn, menu);
  }
}

function testEndpointPing(name, url) {
  closeAllDropdowns();
  showToast(`⚡ Sending test ping to ${name} (${url})...`);
  setTimeout(() => {
    showToast(`✅ Ping successful: 200 OK received from ${name} in 184ms`);
  }, 900);
}

function editEndpointSettings(name, url) {
  closeAllDropdowns();
  const modal = document.getElementById('addEndpointModal');
  const title = modal ? modal.querySelector('.modal-title') : null;
  const nameInput = document.getElementById('endpointNameInput');
  const urlInput = document.getElementById('endpointUrlInput');
  
  if (title) title.textContent = `Edit Endpoint: ${name}`;
  if (nameInput) nameInput.value = name;
  if (urlInput) urlInput.value = url;
  
  openModal('addEndpointModal');
}

function toggleEndpointState(name) {
  closeAllDropdowns();
  showToast(`Toggled status for ${name}. Configuration updated.`);
}

function toggleAlertState(btn, alertName) {
  const isEnabled = btn.classList.contains('status-success');
  if (isEnabled) {
    btn.classList.remove('status-success');
    btn.classList.add('status-danger');
    btn.innerHTML = `<i data-lucide="bell-off" class="icon-control"></i><span>Disabled</span>`;
    showToast(`Alert "${alertName}" has been disabled`);
  } else {
    btn.classList.remove('status-danger');
    btn.classList.add('status-success');
    btn.innerHTML = `<i data-lucide="bell" class="icon-control"></i><span>Enabled</span>`;
    showToast(`Alert "${alertName}" has been enabled`);
  }
  refreshLucideIcons();
}

// Alert Row Action Menus
function toggleAlertActionMenu(e, menuId) {
  e.stopPropagation();
  const triggerBtn = e.currentTarget;
  const menu = document.getElementById(menuId);
  const isOpen = menu && (menu.classList.contains('open') || (activePortalInfo && activePortalInfo.menu === menu));
  if (isOpen) {
    closeAllDropdowns();
  } else {
    openDropdownInPortal(triggerBtn, menu);
  }
}

function editAlertCondition(alertName, currentCondition) {
  closeAllDropdowns();
  showToast(`Editing trigger condition for "${alertName}": ${currentCondition}`);
}

function testAlertNotification(alertName) {
  closeAllDropdowns();
  showToast(`🔔 Dispatched test notification for "${alertName}"`);
}

function deleteAlertRule(btn, alertName) {
  closeAllDropdowns();
  const row = btn.closest('tr');
  if (row) {
    row.style.transition = 'all 200ms ease';
    row.style.opacity = '0';
    row.style.transform = 'translateX(20px)';
    setTimeout(() => {
      row.remove();
      showToast(`Deleted alert rule: "${alertName}"`);
    }, 200);
  } else {
    showToast(`Deleted alert rule: "${alertName}"`);
  }
}

function showToast(msg) {
  let toast = document.getElementById('toastNotice');
  if (!toast) {
    toast = document.createElement('div');
    toast.id = 'toastNotice';
    toast.className = 'toast-bar';
    document.body.appendChild(toast);
  }
  toast.textContent = msg;
  toast.classList.add('visible');
  clearTimeout(window.__toastTimer);
  window.__toastTimer = setTimeout(() => {
    toast.classList.remove('visible');
  }, 2800);
}

// ========================================================
// API KEYS MANAGEMENT FLOWS (Supabase-style Presentation)
// ========================================================
function openCreateApiKeyModal() {
  closeAllDropdowns();
  const formView = document.getElementById('createKeyFormView');
  const revealView = document.getElementById('createKeyRevealView');
  const form = document.getElementById('createApiKeyForm');
  if (formView) formView.style.display = 'block';
  if (revealView) revealView.style.display = 'none';
  if (form) form.reset();

  const modal = document.getElementById('createApiKeyModal');
  if (modal) modal.classList.add('open');
  document.body.classList.add('modal-open');
  refreshLucideIcons();
}

function handleCreateApiKeySubmit(e) {
  e.preventDefault();
  const nameInput = document.getElementById('apiKeyNameInput');
  const scopeSelect = document.getElementById('apiKeyScopeSelect');
  const keyName = nameInput ? nameInput.value.trim() : 'Service Token';
  const isReadOnly = scopeSelect && scopeSelect.value === 'readonly';

  // Generate cryptographically shaped mock secret for secure one-time reveal
  const randomHex = Array.from({ length: 24 }, () => Math.floor(Math.random() * 16).toString(16)).join('');
  const newSecret = isReadOnly ? `rg_ro_${randomHex}` : `rg_live_${randomHex}`;

  const formView = document.getElementById('createKeyFormView');
  const revealView = document.getElementById('createKeyRevealView');
  const secretDisplay = document.getElementById('revealedSecretValue');

  if (secretDisplay) secretDisplay.textContent = newSecret;
  if (formView) formView.style.display = 'none';
  if (revealView) revealView.style.display = 'block';

  showToast(`Generated API key: "${keyName}"`);
  refreshLucideIcons();
}

function copyRevealedSecret(btn) {
  const secretDisplay = document.getElementById('revealedSecretValue');
  if (secretDisplay && secretDisplay.textContent) {
    copyToClipboard(secretDisplay.textContent, btn);
  }
}

function toggleApiKeyMenu(e, menuId) {
  e.stopPropagation();
  const triggerBtn = e.currentTarget;
  const menu = document.getElementById(menuId);
  const isOpen = menu && (menu.classList.contains('open') || (activePortalInfo && activePortalInfo.menu === menu));
  if (isOpen) {
    closeAllDropdowns();
  } else {
    openDropdownInPortal(triggerBtn, menu);
  }
}

function rotateApiKey(keyName) {
  closeAllDropdowns();
  const confirmed = window.confirm(`Rotate credential "${keyName}"?\n\nA new key will be generated. The previous key will remain valid for a 24-hour overlap grace period so you can roll deployments without downtime.`);
  if (confirmed) {
    showToast(`Key rotated for "${keyName}". Grace period active.`);
  }
}

function viewApiKeyMeta(keyName, keyRef, scope, createdDate) {
  closeAllDropdowns();
  const metaName = document.getElementById('metaKeyName');
  const metaRef = document.getElementById('metaKeyRef');
  const metaScope = document.getElementById('metaKeyScope');
  const metaCreated = document.getElementById('metaKeyCreated');

  if (metaName) metaName.textContent = keyName;
  if (metaRef) metaRef.textContent = keyRef;
  if (metaScope) metaScope.textContent = scope;
  if (metaCreated) metaCreated.textContent = createdDate;

  const modal = document.getElementById('apiKeyMetaModal');
  if (modal) modal.classList.add('open');
  document.body.classList.add('modal-open');
}

function revokeApiKey(keyName) {
  closeAllDropdowns();
  const confirmed = window.confirm(`WARNING: Revoke credential "${keyName}"?\n\nThis action cannot be undone. Any webhook integrations using this key will immediately be rejected with HTTP 401 Unauthorized.`);
  if (confirmed) {
    showToast(`Revoked credential: "${keyName}"`);
  }
}

// ========================================================
// SKELETON SIMULATION UTILITIES (For demonstration & data refreshes)
// ========================================================
function showSkeletonDashboardLoading(durationMs = 800) {
  const squaresGroup = document.querySelector('.metrics-squares-group');
  if (!squaresGroup) return;

  const originalContent = squaresGroup.innerHTML;
  squaresGroup.innerHTML = `
    <div class="skeleton skeleton-metric-card"></div>
    <div class="skeleton skeleton-metric-card"></div>
    <div class="skeleton skeleton-metric-card"></div>
    <div class="skeleton skeleton-metric-card"></div>
  `;

  setTimeout(() => {
    squaresGroup.innerHTML = originalContent;
    refreshLucideIcons();
  }, durationMs);
}

function showSkeletonTableLoading(tbodyId, rowCount = 5, colCount = 6, durationMs = 600) {
  const tbody = document.getElementById(tbodyId);
  if (!tbody) return;

  const originalContent = tbody.innerHTML;
  tbody.innerHTML = Array.from({ length: rowCount }).map(() => `
    <tr>
      ${Array.from({ length: colCount }).map((_, i) => `
        <td><div class="skeleton skeleton-text ${i === 0 ? 'short' : i === 1 ? 'medium' : i === 2 ? 'long' : 'medium'}"></div></td>
      `).join('')}
    </tr>
  `).join('');

  setTimeout(() => {
    tbody.innerHTML = originalContent;
    refreshLucideIcons();
  }, durationMs);
}

// ========================================================
// LUCIDE ICON INITIALIZER / REFRESH HELPER
// ========================================================
function refreshLucideIcons() {
  if (window.lucide && typeof window.lucide.createIcons === 'function') {
    try {
      window.lucide.createIcons();
    } catch (err) {
      console.warn('Lucide icon render error:', err);
    }
  } else {
    // If CDN library is still loading, retry after brief delay
    setTimeout(() => {
      if (window.lucide && typeof window.lucide.createIcons === 'function') {
        window.lucide.createIcons();
      }
    }, 150);
  }
}

// ========================================================
// AUTHENTICATION & FIRST-TIME ONBOARDING INITIALIZATION
// ========================================================
function initUserSessionAndOnboarding() {
  // If auth helper is available, check current user
  if (typeof getCurrentUser === 'function') {
    const user = getCurrentUser();
    if (user) {
      // Update sidebar/header avatar and details
      const initial = (user.name || user.email || 'U').charAt(0).toUpperCase();
      const userAvatarBtn = document.getElementById('userAvatarBtn');
      const userMenuAvatar = document.getElementById('userMenuAvatar');
      const userMenuFullName = document.getElementById('userMenuFullName');
      const userMenuEmail = document.getElementById('userMenuEmail');

      if (userAvatarBtn) {
        userAvatarBtn.textContent = initial;
        userAvatarBtn.title = `${user.name || 'User'} (${user.role || 'Member'})`;
      }
      if (userMenuAvatar) userMenuAvatar.textContent = initial;
      if (userMenuFullName) userMenuFullName.textContent = user.name || 'Engineer';
      if (userMenuEmail) userMenuEmail.textContent = user.email || '';
    }
  }

  // Check first-time user onboarding flag
  try {
    const isFirstTime = sessionStorage.getItem('relayguard_first_time_user');
    if (isFirstTime === 'true') {
      sessionStorage.removeItem('relayguard_first_time_user');
      setTimeout(() => {
        showToast('Welcome to RelayGuard! Create your first endpoint to start tracking webhooks.');
        if (typeof openAddEndpointModal === 'function') {
          openAddEndpointModal();
        }
      }, 550);
    }
  } catch (e) {}
}

// Run session & onboarding initialization when DOM is ready
if (document.readyState === 'loading') {
  document.addEventListener('DOMContentLoaded', initUserSessionAndOnboarding);
} else {
  initUserSessionAndOnboarding();
}

