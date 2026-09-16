# Running Ipapo Broadcast

This guide explains how to run the website locally, test the news workflow, and prepare it for deployment.

## Requirements

Install Node.js 18 or newer:

https://nodejs.org/

Verify the installation in PowerShell:

```powershell
node -v
npm -v
```

## Start the Local Website

Open PowerShell and move into the project folder:

```powershell
cd C:\Users\Cp9-30\Desktop\ipapo
```

Install dependencies the first time:

```powershell
npm install
```

Start the local website and API server:

```powershell
npm start
```

Keep this terminal open while using the website.

Open the website at:

- http://localhost:3000/index.html
- http://localhost:3000/home.html
- http://localhost:3000/news.html
- http://localhost:3000/live.html

Do not use the VS Code Live Server extension for this project. It serves static files but does not run the `/api` routes.

## Test Fresh News

The homepage and news page request stories from:

```text
http://localhost:3000/api/fetch-news
```

Force a fresh RSS fetch with:

```text
http://localhost:3000/api/fetch-news?force=1
```

Then refresh the homepage or news page with `Ctrl + F5`.

The fetch process collects local and regional stories, checks them for scam patterns, saves them locally during development, and places them in the admin review queue.

## Admin Review

Open:

```text
http://localhost:3000/admin/admin-login.html
```

After signing in, open:

```text
http://localhost:3000/admin/admin-dashboard.html
```

In the **Fetched News Review Queue**:

1. Read the story title and source.
2. Click **Approve** to publish it.
3. Click **Reject** to keep it out of the published queue.

The intended publishing workflow is:

```text
RSS fetch -> Admin review -> Approve -> Public news -> User notification
```

## Test the Live Radio

Open:

```text
http://localhost:3000/live.html
```

Click **Listen Live**. The player is connected to the Oke-Ogun FM 96.3 regional stream.

Your browser and computer must have audio enabled. The stream also requires permission to rebroadcast it before public launch.

## Check Backend Health

Open:

```text
http://localhost:3000/api/health
```

A local setup without Supabase and push variables may return HTTP 503. This is expected until production services are configured.

## Stop the Website

Return to the PowerShell window running the server and press:

```text
Ctrl + C
```

## Production Setup

Before deploying publicly:

1. Create a Supabase project.
2. Run `supabase/schema.sql` in the Supabase SQL Editor.
3. Run `supabase/auth-schema.sql` in the Supabase SQL Editor.
4. Add the Supabase URL and public anon key to `js/supabase-config.js`.
5. Deploy the repository to GitHub and import it into Vercel.
6. Add the server variables listed in `.env.example` to Vercel.
7. Generate VAPID keys for push notifications:

```powershell
npx web-push generate-vapid-keys
```

8. Redeploy Vercel.
9. Verify the production health endpoint:

```text
https://YOUR-DOMAIN.vercel.app/api/health
```

Production is ready when that endpoint returns HTTP 200 and `"success": true`.

## Common Problems

### The page is blank or the API returns 404

You probably opened the files with VS Code Live Server. Stop it and run:

```powershell
npm start
```

Then use `http://localhost:3000`.

### Fresh news is not visible

Run:

```text
http://localhost:3000/api/fetch-news?force=1
```

Then refresh with `Ctrl + F5`.

### The admin review queue is empty

Make sure the Node server is running and that news has been fetched. Production approval also requires Supabase configuration.

### Push notifications do not work

Users must sign in, grant browser notification permission, and subscribe their device. Production also requires VAPID keys, HTTPS, and Supabase push-subscription storage.
