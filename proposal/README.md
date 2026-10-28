# RelayGuard — Webhook Reliability & Failure Diagnosis Workspace

This folder contains the complete proposal demo dashboard for **RelayGuard**, updated to match the crisp light-mode UI specification.

## How to View
Open [index.html](file:///c:/Users/sushm/Desktop/webhook_failure_diagnosis_and_recovery_platform/proposal/index.html) directly in any web browser.

## Features & UI Components Included:
1. **Left Operations Sidebar**:
   - Brand logo with hexagon shield icon & `RelayGuard` title.
   - Operations & navigation links: `Overview`, `Deliveries`, `Failures` (with badge counter: `12`), `Endpoints`, `Replays`, `Alerts`, and `Settings`.
   - Bottom project switcher: `Acme App` production environment selector.

2. **Top Header & Search Bar**:
   - Universal search box (`Search events, endpoints, or errors...` with `⌘ K` keyboard shortcut).
   - Time range dropdown (`Last 7 days`), notification bell with unread indicator dot, and user profile avatar (`S`).

3. **Greeting & Action Hero**:
   - Personalized greeting: *"Good morning, Sam"* & subtitle *"Here's what's happening with your webhooks."*
   - Primary action button: `+ Add endpoint`.

4. **KPI Metric Cards (with smooth sparkline curves)**:
   - **Total deliveries**: `12,480` (`↑ 12%`, blue sparkline)
   - **Successful**: `11,902` (`95.4%`, emerald green sparkline)
   - **Failed**: `312` (`2.5%`, coral red sparkline)
   - **Retrying**: `48` (`0.4%`, sky blue sparkline)

5. **Analytics & Diagnostics Visualizations**:
   - **Delivery activity**: Stacked bar chart (Successful, Failed, Retrying) across dates (Oct 15 - Oct 21) with timeframe selector (`Daily ▾`).
   - **Failure breakdown**: Multi-segment Donut Chart with central counter (`312 failures`) and legend breakdown (`40% Timeouts`, `30% 5xx errors`, `20% 4xx errors`, `10% Network errors`).

6. **Recent Deliveries Table**:
   - Columns: Checkbox, `Event ID`, `Event type`, `Endpoint`, `Status`, `Attempts`, `Duration`, `Time`, and row chevron.
   - Interactive row selection updates the right inspection drawer in real time.

7. **Right Inspection Drawer (Active Delivery Diagnosis)**:
   - Header with Event ID (`evt_8f31a2c9`), status pill, and timestamp.
   - Tab switcher: `Overview`, `Attempts`, `Request`, `Response`.
   - **AI-assisted Failure Diagnosis card**:
     - Status description (`The endpoint returned 401 Unauthorized...`).
     - High confidence verification indicator.
     - Actionable recovery recommendations.
     - Split retry action button (`↻ Retry delivery ▾`) with simulated dispatch.
     - `▶ Replay as new event` button.
   - **Delivery details key-values**:
     - Endpoint copy button, current status, attempts, latency, event type, and event ID.
