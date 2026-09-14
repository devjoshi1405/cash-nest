# CashNest — Supabase Setup & Configuration Guide

This guide walks you through setting up Supabase as the backend for **CashNest (Phase 2)**.

---

## 1. Create a Supabase Project

1. Go to [supabase.com](https://supabase.com) and log in.
2. Click **"New Project"**.
3. Set your project details:
   - **Name**: `CashNest`
   - **Database Password**: Choose a strong password and save it securely.
   - **Region**: Choose the region closest to you (e.g., `ap-south-1` (Mumbai) for India).
4. Click **"Create new project"** and wait for the provisioning to finish.

---

## 2. Retrieve Project URL & API Keys

1. In your Supabase project dashboard, navigate to **Project Settings** (gear icon) ➔ **API**.
2. Copy the following keys:
   - **Project URL**: `https://<your-project-id>.supabase.co`
   - **anon / publishable key**: `eyJhbGciOi...`
3. ⚠️ **Security Warning**: NEVER copy or expose the `service_role` secret key to frontend code or commit it to GitHub.

---

## 3. Configure Local Environment Variables

Create or update `.env.local` at the root of your project:

```env
NEXT_PUBLIC_SUPABASE_URL=https://your-project-id.supabase.co
NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY=your-supabase-publishable-key
```

*(You can also use `.env.example` as a template).*

---

## 4. Configure Supabase Authentication Settings

1. In the Supabase Dashboard, go to **Authentication** ➔ **URL Configuration**.
2. **Site URL**:
   - For local development: `http://localhost:3000`
   - For production: `https://your-cashnest-domain.com`
3. **Redirect URLs**:
   - Add: `http://localhost:3000/auth/callback`
   - Add: `http://localhost:3000/reset-password`
   - Add: `http://localhost:3000/home/dashboard`
4. (Optional) In **Authentication** ➔ **Providers** ➔ **Email**:
   - For quick development testing without verifying real email addresses, you can toggle **"Confirm email"** off. For production, keep it enabled.

---

## 5. Run Database Migrations

You can run the schema migrations in either of two ways:

### Option A: One-Click SQL Editor Setup (Recommended)

1. In your Supabase dashboard, go to the **SQL Editor** tab.
2. Open the file [`supabase/migrations/000_full_schema.sql`](file:///d:/projects/cashnest/supabase/migrations/000_full_schema.sql).
3. Copy its entire content, paste it into the SQL Editor, and click **"Run"**.
4. This will create:
   - All 15 database tables (`profiles`, `workspaces`, `categories`, `transactions`, `debts`, `debt_payments`, `budgets`, `daily_sales`, `suppliers`, `purchases`, `supplier_payments`, `products`, `inventory_movements`, `customer_credits`, `customer_credit_payments`)
   - All foreign keys and constraints
   - All triggers (`updated_at`, `handle_new_user`, `provision_user_defaults`)
   - Complete Row Level Security (RLS) policies and indexes

### Option B: Supabase CLI Migrations

If you use the Supabase CLI:
```bash
npx supabase db push
```

---

## 6. How the Database Architecture Works

### Automatic Profile & Workspace Provisioning
When a user signs up via `/signup`:
1. Supabase Auth creates the record in `auth.users`.
2. The trigger `on_auth_user_created` fires automatically.
3. A row is inserted into `public.profiles` with the user's full name.
4. `provision_user_defaults()` runs and creates:
   - **Home Workspace** (`slug: 'home'`, `name: 'Home Finance'`)
   - **Pan Shop Workspace** (`slug: 'pan-shop'`, `name: 'Pan Shop Finance'`)
   - 21 default Home categories (Salary, Freelance, Kitchen, Groceries, Electricity, Fuel, EMI, etc.)
   - 12 default Pan Shop categories (Counter Sales, Rent, Transport, Maintenance, Employee, Packaging, etc.)
5. Provisioning is **idempotent** — running it multiple times will never duplicate rows.

### Row Level Security (RLS) & Multi-Tenant Isolation
Every table has Row Level Security enabled:
- **Tenant Isolation**: Users can only query, insert, update, or delete rows where `user_id = auth.uid()`.
- **Cross-Workspace Protection**: Child records (transactions, categories, budgets, sales) verify that the submitted `workspace_id` belongs to the authenticated user's own workspaces:
  ```sql
  workspace_id in (select id from public.workspaces where user_id = (select auth.uid()))
  ```
- **Parent-Child Integrity**: Payment and inventory records check that the referenced parent (`debt_id`, `supplier_id`, `product_id`, `customer_credit_id`) belongs to `auth.uid()`.

---

## 7. Generate or Update Database Types

TypeScript types are pre-generated in `lib/supabase/database.types.ts` and `lib/supabase/types.ts`.

To re-generate them from your live Supabase instance:
```bash
npx supabase gen types typescript --project-id <your-project-id> > lib/supabase/database.types.ts
```

---

## 8. Verifying User Isolation & Testing

To verify security and multi-tenant isolation:

1. **User A**:
   - Sign up with `userA@example.com` / `Password123!`
   - Log in and verify Home and Pan Shop workspaces load.
   - Go to Settings and update Name to "User A Name".
2. **User B**:
   - In a private/incognito window, sign up with `userB@example.com` / `Password123!`
   - Verify that User B only sees their own profile and workspaces.
   - User B cannot read or modify User A's profile or financial data.
3. **Logout & Session Test**:
   - Click "Log out" in the header menu.
   - You will be redirected to `/login`.
   - Attempting to visit `/home/dashboard` directly while logged out will automatically redirect you back to `/login`.

---

## 9. Next Steps (Phase 3)

With authentication, database tables, and RLS established:
- **Phase 3** will connect real Supabase CRUD operations for Home Finance transactions, expenses, salary baseline, budgets, and borrow/lend.
