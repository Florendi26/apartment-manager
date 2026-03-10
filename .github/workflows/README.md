# Keep Supabase Alive - Setup

This workflow pings your Supabase database **daily at 10:00 AM UTC** to prevent it from pausing due to inactivity (Supabase free tier pauses after ~7 days).

## Required: Add GitHub Secrets

1. Go to your repo on GitHub → **Settings** → **Secrets and variables** → **Actions**
2. Click **New repository secret** and add:

| Secret Name         | Value                                                                 |
|---------------------|-----------------------------------------------------------------------|
| `SUPABASE_URL`      | `https://krrhgslhvdfyvxayefqh.supabase.co`                           |
| `SUPABASE_ANON_KEY` | Your Supabase anon key (from Supabase Dashboard → Settings → API)     |

## Manual Run

You can trigger the workflow manually: **Actions** → **Keep Supabase Alive** → **Run workflow**.

## Schedule

- **Automatic**: Every day at 10:00 AM UTC
- **Manual**: Anytime from the Actions tab
