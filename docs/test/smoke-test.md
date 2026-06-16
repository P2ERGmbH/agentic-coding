# Application Smoke Test & Verification Manual

This document provides a project-agnostic, standardized procedure for running a local smoke test and performing quality validation on a Next.js 16 + Tailwind CSS application.

---

## 🚀 1. Local Server Environment Setup

To ensure no port or resource conflicts with other concurrent agent sessions or manual development, you must run the local development server on an isolated port (default is `6767`).

### 1.1 Start the Development Server
Run the Next.js development server with Turbopack enabled:
```bash
npx next dev -p 6767 --turbopack
```

### 1.2 Clear Cache & Logs (If Needed)
Before testing, you may optionally clear local build caches and old logs to ensure you are testing fresh code execution:
```bash
npm run log:clear
```

---

## 🔑 2. Test Accounts and Credentials

For automated and manual verification, use the following standardized project-agnostic placeholders. Replace these with actual environment-specific secrets if required.

| Role | Username / Email | Password | Purpose |
|------|------------------|----------|---------|
| **Standard User** | `test@your-domain.com` | `password123` | General user dashboard, settings, and profile verification. |
| **Admin User** | `admin@your-domain.com` | `adminSecurePass!` | Full system settings, administrative control panels. |

---

## 🔍 3. Smoke Test Procedure

The smoke test is designed to verify that the application compiles, serves pages correctly, renders layout faithfully, and is free of server-side exceptions.

### Step 3.1: Open the Home Page
Navigate the browser (or the automated Chrome DevTools MCP instance) to the application root:
- **Local URL**: `http://localhost:6767/`
- Verify that the page loads completely and returns a `200 OK` status with no 500 error layouts.

### Step 3.2: Capture High-Resolution Screenshot
Capture a high-resolution screenshot of the initial fold to serve as a visual baseline:
- Save path: `public/example/storybook_smoke_test.png`

### Step 3.3: Request a Lighthouse Performance Audit
Run a Lighthouse audit on the home page to gather core performance metrics:
```bash
npx lighthouse http://localhost:6767/ --chrome-flags="--headless" --output=json --output-path=.tmp/lighthouse-report.json
```

---

## 📈 4. Metrics Comparison and Validation

Once the smoke test completes, compare the current run results against established baselines to detect regressions.

### 4.1 Log Analysis
Always view and inspect application logs after navigating pages:
```bash
npm run log:view
```
**Verification Checklist**:
- [ ] No React hydration mismatch errors.
- [ ] No uncaught server-side render (SSR) exceptions.
- [ ] No missing translation locale warnings.

### 4.2 Core Performance Baselines
Ensure that the metrics extracted from `.tmp/lighthouse-report.json` meet or exceed these standard thresholds:

| Metric | Target | Action If Exceeded |
|--------|--------|--------------------|
| **Largest Contentful Paint (LCP)** | `< 2.5s` | Optimize main hero images, apply fetch priority, or optimize dynamic imports. |
| **First Contentful Paint (FCP)** | `< 1.8s` | Reduce blocking CSS/JS in the document head. |
| **Cumulative Layout Shift (CLS)** | `< 0.1` | Set explicit width and height on dynamic elements and images. |
| **First Input Delay / INP** | `< 200ms` | Break up long main-thread JS tasks. |

---

## 🧹 5. Test Completion & Cleanup

Once you have verified the correctness of the application run, and **ONLY AFTER** seeking explicit written confirmation of task completion from the user:

1. Close any active headless browser instances.
2. Stop the local server process running on port `6767`.
3. Safely delete temporary files (such as `.tmp/lighthouse-report.json`).
