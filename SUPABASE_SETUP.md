# Supabase Setup

## 1. Create the project

Create a Supabase project, then open **SQL Editor**.

Run these scripts in order:

1. `supabase/schema.sql`
2. `supabase/auth-schema.sql`

The scripts create the news, scam alert, read-state, push notification, activity, and user profile tables. The auth script also creates the profile trigger for new accounts.

## 2. Configure authentication

In **Authentication > Providers**, enable Email.

In **Authentication > URL Configuration**, set the production Site URL:

```text
https://YOUR-VERCEL-DOMAIN.vercel.app
```

Add this redirect pattern:

```text
https://YOUR-VERCEL-DOMAIN.vercel.app/**
```

Use a custom domain instead when available.

## 3. Configure the browser

Put only the public project values in `js/supabase-config.js`:

```js
window.IPAPO_SUPABASE_CONFIG = {
    url: 'https://YOUR-PROJECT.supabase.co',
    anonKey: 'YOUR-ANON-PUBLIC-KEY'
};
```

The anon key is designed for browser use. Never put the service-role key here.

## 4. Configure Vercel secrets

Add these environment variables to the Vercel project, preferably for Production and Preview separately:

```text
SUPABASE_URL
SUPABASE_SERVICE_ROLE_KEY
VAPID_PUBLIC_KEY
VAPID_PRIVATE_KEY
VAPID_SUBJECT
CRON_SECRET
```

Generate VAPID keys locally with:

```powershell
npm install
npx web-push generate-vapid-keys
```

## 5. Create the first administrator

Register the account through the site. Then in Supabase SQL Editor, promote that user's profile after confirming the account email:

```sql
update public.profiles
set role = 'superadmin', status = 'active'
where email = 'YOUR-ADMIN-EMAIL';
```

Do not promote users by editing browser storage.

## 6. Verify after deployment

Open:

```text
https://YOUR-VERCEL-DOMAIN.vercel.app/api/health
```

The response should report `success: true` after the Supabase and VAPID environment variables are configured. Then test registration, email confirmation, admin login, daily fetch, moderation, push opt-in, and the admin notification ring.