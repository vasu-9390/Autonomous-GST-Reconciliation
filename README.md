# Autonomous GST Reconciliation & Mismatch Copilot

An enterprise fintech web platform for Indian businesses, CFOs, chartered accountants, and tax teams. It reconciles internal purchase registers against supplier-filed GSTR-2B datasets using a **10-stage deterministic calculation engine**, and provides an **AI Copilot (powered by Google Gemini)** to diagnose discrepancies in plain English, protect Input Tax Credit (ITC), and automate supplier follow-up communications.

---

## Key Features

1. **Deterministic 10-Stage Reconciliation Engine**:
   - Stage 1: Exact Match (GSTIN + Normalized Invoice # + Date + Exact Tax and Total)
   - Stage 2: Date-Tolerance Match (Invoice # and amounts match within ±30 day shift)
   - Stage 3: Rounding Tolerance Match (Within configured absolute tolerance, e.g. ₹1.00)
   - Stage 4: Fuzzy Invoice Number Match (Levenshtein distance ≤ 2 with matching total amount)
   - Stage 5: Tax Split Classification Variance (IGST vs CGST+SGST Place of Supply conflict)
   - Stage 6 & 7: Taxable Value and Component Variances
   - Stage 8: Missing in GSTR-2B (Critical ITC blockage under Section 16(2)(aa))
   - Stage 9: Missing in Purchase Register (Unclaimed tax credit opportunity)
   - Stage 10: Duplicate Candidate Detection
2. **Decimal-Safe Financial Arithmetic**:
   - Zero floating-point rounding errors on rupees and paise using `bignumber.js` and integer paise math.
3. **Google Gemini AI Mismatch Copilot**:
   - Structured JSON output validated with Zod.
   - Diagnoses root causes, generates accountant verification checklists, and drafts supplier rectification emails.
   - Strict rule-based fallback when offline or without API key. Never hallucinates tax numbers.
4. **GST Data Import Center**:
   - Ingests CSV and Excel (`.xlsx`, `.xls`) purchase registers and GSTR-2B statements.
   - Header inspection, auto-detected column mappings, row-level validation, and error log reporting.
5. **Investigation Workspace**:
   - Side-by-side comparison of internal books voucher vs GSTR-2B filing.
   - Status transitions (`UNDER_REVIEW`, `RESOLVED`, `REJECTED`), collaboration comments, and accountant assignment.
6. **Role-Based Access Control (RBAC)**:
   - **Super Admin**: Organization settings, members management, system stats.
   - **Finance Manager**: Reconciliation approvals, exports, resolution sign-off.
   - **Accountant**: Data imports, discrepancy investigation, comments.
   - **Auditor**: Read-only verification of reconciliation logs and audit trails.
7. **Reports & Exports**:
   - One-click downloadable Excel (`.xlsx`) and CSV reconciliation registers.
   - Supplier-wise tax exposure ranking report.
8. **Tamper-Evident Audit Trail**:
   - Immutable audit logging on all reconciliation runs, resolution status changes, and settings updates.

---

## Technology Stack

- **Frontend**: React 19, TypeScript, Vite, Tailwind CSS, Lucide React, Recharts, Axios, React Router v7.
- **Backend**: Node.js, Express.js, TypeScript, Mongoose, Zod, JWT, BCrypt, BigNumber.js, Multer, SheetJS (`xlsx`), CSV-Parser.
- **Database**: MongoDB Atlas or local MongoDB (with resilient in-memory fallback for zero-dependency local runs).
- **AI Integration**: Google Gemini API (`@google/generative-ai`) with structured JSON schema enforcement.
- **DevOps**: Docker, Docker Compose, GitHub Actions CI/CD.

---

## Quick Start (Local Development)

### 1. Prerequisites
- Node.js (v18+ or v20+)
- npm (v9+)
- (Optional) MongoDB running on `localhost:27017` (automatic in-memory engine fallback is built-in if MongoDB is not installed!)

### 2. Backend Setup
```bash
cd backend
cp .env.example .env
npm install
npm test            # Run unit and integration tests
npm run seed        # Seed demo company, 4 roles, sample invoices & initial run
npm run dev         # Starts server on http://localhost:5000
```

### 3. Frontend Setup
```bash
cd frontend
npm install
npm run dev         # Starts UI on http://localhost:5173
```

Visit **`http://localhost:5173/login`** in your browser.

---

## Pre-Configured Demo Credentials

Use the **One-Click Demo Login** buttons on the login screen, or sign in manually:

| Role | Email | Password | Primary Permissions |
|---|---|---|---|
| **Finance Manager** | `finance@gstcopilot.io` | `Password123!` | Approvals, resolution sign-off, exports |
| **Accountant** | `accountant@gstcopilot.io` | `Password123!` | File imports, investigation, comments |
| **Super Admin** | `admin@gstcopilot.io` | `Password123!` | Org configuration, team management |
| **Auditor** | `auditor@gstcopilot.io` | `Password123!` | Read-only inspection, audit log verification |

---

## Docker & Container Deployment

To run the entire multi-container stack (MongoDB, Backend, and Frontend SPA):

```bash
# Build and run with Docker Compose
docker compose up --build -d

# View logs
docker compose logs -f
```

- Frontend accessible at: `http://localhost:5173`
- Backend API accessible at: `http://localhost:5000/api/v1`
- Backend Health Check: `http://localhost:5000/api/v1/health`

---

## REST API Reference

Base URL: `/api/v1`

### Authentication
- `POST /auth/register`: Create organization & user
- `POST /auth/login`: Authenticate and receive JWT
- `GET /auth/me`: Get current user & tenant settings

### Organization & Team
- `GET /organizations`: Fetch tenant organization details
- `PATCH /organizations/settings`: Update amount & tax tolerances
- `GET /organizations/members`: List team members
- `POST /organizations/members`: Invite team member (Admin/Finance Mgr)

### Imports
- `POST /imports/preview`: Upload file and receive headers & sample preview
- `POST /imports/execute`: Ingest invoices with column mappings
- `GET /imports/jobs`: List import history & error counts
- `GET /imports/jobs/:jobId`: Get single job with row-level error details

### Reconciliation
- `POST /reconciliations/trigger`: Execute 10-stage matching run
- `GET /reconciliations/runs`: List historical runs
- `GET /reconciliations/cases`: Query mismatch cases with filtering & pagination
- `GET /reconciliations/dashboard-metrics`: Fetch live calculated dashboard metrics

### Mismatch Investigation
- `GET /mismatches/:caseId`: Get case side-by-side details
- `PATCH /mismatches/:caseId/status`: Update status (`RESOLVED`, `UNDER_REVIEW`, etc.)
- `POST /mismatches/:caseId/assign`: Assign case to an accountant
- `POST /mismatches/:caseId/comments`: Post verification comment

### AI Copilot
- `POST /copilot/explain-mismatch`: Generate Gemini AI root cause & draft email
- `POST /copilot/summarize-reconciliation`: Generate executive summary of a run
- `POST /copilot/ask`: Conversational GST advisor Q&A

### Reports & Exports
- `GET /reports/summary`: Aggregate period metrics
- `GET /reports/supplier-variance`: Supplier-wise tax exposure ranking
- `GET /reports/export?format=xlsx`: Download Excel workbook

### Audit & Notifications
- `GET /audit`: Query immutable audit trail logs
- `GET /notifications`: List system notifications
- `PATCH /notifications/:id/read`: Mark notification read

---

## Testing

Run the automated test suite:

```bash
cd backend
npm test
```

Test coverage includes:
- Decimal arithmetic precision & paise conversions (`decimal.test.ts`)
- Indian GSTIN format and checksum validation (`gstin.test.ts`)
- Invoice number normalization & Levenshtein distance (`invoiceNumber.test.ts`)
- Auth, RBAC, tenant isolation, and reconciliation engine integration (`auth_and_reconciliation.test.ts`)

---

## Compliance & Legal Disclaimer

This system is an internal analytical and reconciliation tool. In accordance with Indian tax laws (CGST Act Section 16(2)(aa) & Rule 36(4)), all ITC claims in GSTR-3B must be verified by a qualified tax professional before filing. AI Copilot explanations are advisory.
