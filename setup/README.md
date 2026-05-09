# 🛠️ Database Setup Guide

This guide walks you through setting up the database for the University Management System Portal from scratch. **No coding experience required** — you'll just be copying and pasting SQL into Supabase.

---

## Step 1: Create a Supabase Project

1. Go to [supabase.com](https://supabase.com) and sign up / log in
2. Click **"New Project"**
3. Choose an organization (or create one)
4. Enter a project name (e.g., `university-portal`)
5. Set a strong **database password** (save this somewhere safe!)
6. Choose your preferred region
7. Click **"Create new project"** and wait for it to provision (~2 minutes)

---

## Step 2: Run the Schema

This creates all the tables, security policies, and functions the app needs.

1. In your Supabase project, go to **SQL Editor** (left sidebar)
2. Click **"New query"**
3. Open the file `schema.sql` from this folder
4. **Copy the entire contents** and paste into the SQL Editor
5. Click **"Run"** (or press Ctrl+Enter / Cmd+Enter)
6. You should see `Success. No rows returned` — that's correct!

> 💡 The schema is idempotent — you can run it again safely without breaking anything.

---

## Step 3: Seed Reference Data

This inserts the departments, batches, rooms, and default feature visibility settings.

1. Still in **SQL Editor**, click **"New query"**
2. Open the file `seed.sql` from this folder
3. **Copy the entire contents** and paste into the SQL Editor
4. Click **"Run"**
5. You should see `Success` messages

---

## Step 4: Create the Admin User

Follow the instructions in [`create-admin.md`](./create-admin.md) to create your first super admin account.

---

## Step 5: Deploy Edge Functions

The app uses one Edge Function for creating user accounts from the admin panel.

```bash
# Install Supabase CLI (if not already installed)
npm install -g supabase

# Log in
supabase login

# Link to your project
supabase link --project-ref YOUR_PROJECT_ID

# Deploy the function
supabase functions deploy create-user --no-verify-jwt
```

> 💡 Replace `YOUR_PROJECT_ID` with the ID from your Supabase project URL.

---

## Step 6: Verify Everything

1. In **SQL Editor**, click **"New query"**
2. Open the file `verify.sql` from this folder
3. **Copy the entire contents** and paste into the SQL Editor
4. Click **"Run"**
5. You'll see a table showing each component and whether it's ✅ PASS or ❌ FAIL

If everything shows PASS, your database is ready!

---

## Step 7: Configure the App

1. Go to **Settings → API** in your Supabase dashboard
2. Note down:
   - **Project URL** (e.g., `https://abcdefgh.supabase.co`)
   - **anon/public key** (starts with `eyJ...`)
   - **Project ID** (the `abcdefgh` part from the URL)
3. In the app's root directory, copy the example env file:

```bash
cp .env.example .env
```

4. Edit the `.env` file with your values:

```env
VITE_SUPABASE_URL="https://YOUR_PROJECT_ID.supabase.co"
VITE_SUPABASE_PUBLISHABLE_KEY="your-anon-key-here"
VITE_SUPABASE_PROJECT_ID="YOUR_PROJECT_ID"
```

5. Start the app:

```bash
npm install
npm run dev
```

6. Open `http://localhost:5173` and log in with your admin account!

---

## Troubleshooting

| Problem | Solution |
|---------|----------|
| "relation already exists" | Safe to ignore — the schema uses `IF NOT EXISTS` |
| "permission denied" | Make sure you're running SQL as the project owner |
| verify.sql shows FAIL | Re-run `schema.sql`, then `seed.sql` |
| Can't log in | Check that you followed `create-admin.md` correctly |
| Edge function errors | Make sure you linked the correct project with `supabase link` |
