# Creating the First Admin User

Follow these steps to create a `super_admin` account that can manage the entire portal.

---

## Step 1: Create an Auth User

1. Go to your **Supabase Dashboard**
2. Navigate to **Authentication → Users**
3. Click **"Add user"** → **"Create new user"**
4. Fill in:
   - **Email**: `admin@youruniversity.edu` (use your preferred email)
   - **Password**: Choose a strong password
   - **Auto Confirm User**: ✅ Toggle ON
5. Click **"Create user"**
6. **Copy the user's UUID** (shown in the user list under "UID")

---

## Step 2: Assign the Super Admin Role

1. Go to **SQL Editor** in your Supabase dashboard
2. Paste the following SQL, replacing `USER_UUID_HERE` with the UUID you copied:

```sql
-- Replace USER_UUID_HERE with the actual UUID from Step 1
INSERT INTO public.user_roles (user_id, role)
VALUES ('USER_UUID_HERE', 'super_admin');
```

3. Click **"Run"**

---

## Step 3: Update the Profile (Optional)

```sql
-- Replace USER_UUID_HERE with the actual UUID
UPDATE public.profiles
SET
  full_name = 'System Administrator',
  department = 'Administration'
WHERE id = 'USER_UUID_HERE';
```

---

## Step 4: Verify

1. Open the app in your browser
2. Sign in with the email and password you chose
3. You should be redirected to the **Admin Dashboard**

If you see the admin dashboard with sidebar navigation (Departments, Batches, Courses, etc.), everything is working correctly! 🎉

---

## Troubleshooting

| Problem | Solution |
|---------|----------|
| "Invalid credentials" | Make sure you toggled "Auto Confirm User" when creating the user |
| Redirected to pending page | The role wasn't assigned — re-run the SQL in Step 2 |
| Profile shows empty name | Run the optional SQL in Step 3 |
