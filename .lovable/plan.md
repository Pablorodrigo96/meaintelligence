

# Plan: Fix Everything to Make the Platform 100% Functional

## Issues Found

1. **Missing database trigger**: The `handle_new_user()` function exists but the trigger on `auth.users` was never created -- profiles won't be auto-created on signup
2. **RLS policies are RESTRICTIVE (not PERMISSIVE)**: All policies use `RESTRICTIVE` mode, meaning a user needs to pass ALL policies simultaneously. A regular user trying to SELECT from `companies` must pass BOTH "Users can view own companies" AND "Admins can view all companies" -- which is impossible for non-admins. This blocks all data access.
3. **All 7 module pages are empty placeholders** (Companies, Matching, Due Diligence, Valuation, Strategy, Contracts, Risk)
4. **Admin Users page is a placeholder**
5. **No storage bucket** for document uploads
6. **Auth page doesn't redirect** authenticated users away from /auth

---

## Step 1: Fix Database (Migration)

- **Create the trigger** on `auth.users` to call `handle_new_user()` so profiles are auto-created
- **Fix all RLS policies** from RESTRICTIVE to PERMISSIVE so that users OR admins can access data (not users AND admins)
- **Create storage bucket** `documents` for file uploads with appropriate policies
- **Create additional tables** needed by the modules:
  - `match_criteria` -- buyer acquisition preferences
  - `matches` -- AI-generated match results
  - `due_diligence_reports` -- uploaded docs and AI analysis results
  - `valuations` -- valuation calculations and results
  - `transactions` -- transaction records linking buyer/seller
  - `contracts` -- generated contracts
  - `risk_assessments` -- risk scores and analysis

## Step 2: Fix Auth Flow

- Redirect authenticated users away from `/auth` page
- Ensure role insertion works after signup (currently may fail if user isn't confirmed yet)

## Step 3: Build Company Profiling Module

- Company creation form with fields: name, sector, location, size, description, revenue, EBITDA, cash flow, debt
- Company list with search and filter (by sector, risk level, size)
- Company detail/edit view
- Risk classification badge (low/medium/high)
- Document upload button (for future AI extraction)

## Step 4: Build Matching Module

- Form for buyers to define acquisition criteria (target sector, size range, geography, min/max revenue)
- "Run Matching" button that calls an edge function to score compatibility using AI
- Results displayed as ranked cards with compatibility percentage
- Save/bookmark matches

## Step 5: Build Due Diligence Module

- Document upload interface (PDF, DOCX)
- "Analyze" button that sends documents to an AI edge function
- AI-generated report with flagged risks, compliance issues
- Checklist progress tracker

## Step 6: Build Valuation Module

- Input form pulling financial data from company profile or manual entry
- DCF calculation with adjustable growth rate and discount rate sliders
- EBITDA multiple calculation
- Recharts visualization of valuation scenarios (sensitivity analysis chart)

## Step 7: Build Strategy Module

- Select a match/transaction to analyze
- AI generates success probability prediction
- Strategic recommendations displayed as cards
- Post-merger integration timeline suggestions

## Step 8: Build Contracts Module

- Select contract type (NDA, Purchase Agreement, Shareholder Agreement)
- Fill in transaction parameters (parties, price, terms)
- "Generate Contract" button calling AI edge function
- Preview generated contract
- Download as PDF

## Step 9: Build Risk Module

- Consolidated risk dashboard pulling data from companies and transactions
- Risk matrix visualization (Recharts scatter/heatmap)
- Risk scoring per company with trend charts
- AI-generated mitigation recommendations

## Step 10: Build Admin Users Module

- List all users with their roles and profiles
- Ability to change user roles
- View user activity summary

---

## Technical Details

### New Database Tables (SQL Migration)

```text
match_criteria: id, user_id, target_sector, target_size, target_location, min_revenue, max_revenue, min_ebitda, max_ebitda, notes, created_at
matches: id, buyer_id, seller_company_id, compatibility_score, ai_analysis, status (new/saved/dismissed), created_at
due_diligence_reports: id, company_id, user_id, document_url, ai_report, risk_items (jsonb), status, created_at
valuations: id, company_id, user_id, method (dcf/ebitda_multiple), inputs (jsonb), result (jsonb), created_at
transactions: id, buyer_id, seller_id, company_id, status, deal_value, created_at
contracts: id, transaction_id, user_id, contract_type, content, parameters (jsonb), created_at
risk_assessments: id, company_id, user_id, financial_score, legal_score, operational_score, overall_score, details (jsonb), ai_recommendations, created_at
```

### Edge Functions Needed

- `ai-match` -- Takes buyer criteria + company list, returns scored matches
- `ai-due-diligence` -- Analyzes uploaded document text, returns risk report
- `ai-valuation` -- Calculates DCF/EBITDA with sensitivity analysis
- `ai-strategy` -- Predicts transaction success, generates recommendations
- `ai-contract` -- Generates contract text from template + parameters
- `ai-risk` -- Analyzes company data, generates risk scores and mitigation advice

All edge functions will use the Lovable AI Gateway (no external API key needed).

### New Components

- `CompanyForm` -- reusable form for create/edit
- `CompanyList` -- table with search/filter
- `CompanyCard` -- summary card with risk badge
- `MatchCriteriaForm` -- buyer criteria input
- `MatchResultCard` -- scored match display
- `ValuationChart` -- Recharts sensitivity analysis
- `RiskMatrix` -- Recharts scatter visualization
- `ContractPreview` -- rendered contract with download
- `DocumentUploader` -- file upload component

### Execution Order

The implementation will be done in the order listed above (database fixes first, then auth, then modules one by one). Each module will include its edge function, UI components, and data integration.

