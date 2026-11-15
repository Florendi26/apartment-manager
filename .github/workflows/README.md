# Keep Supabase Alive

Pings the Supabase database at **06:00, 14:00, and 22:00 UTC**. A free Supabase project pauses when it gets too little database activity over 7 days. Opening this app once a month does not prevent that.

The same run keeps GitHub from turning the schedule off. GitHub disables scheduled workflows after 60 days with no repository activity. Each run re-enables this workflow. If the last commit is older than 25 days, the run adds one empty commit.

## One-time enable

If the Actions page says the workflow is disabled for inactivity, sign in as a repository admin, open **Actions → Keep Supabase Alive**, and click **Enable workflow**. Then click **Run workflow** once. After that, the schedule keeps itself on.

## Secrets

In the repo: **Settings → Secrets and variables → Actions**.

| Secret | Value |
| --- | --- |
| `SUPABASE_URL` | `https://krrhgslhvdfyvxayefqh.supabase.co` |
| `SUPABASE_ANON_KEY` | Supabase anon key (Dashboard → Settings → API) |

Workflow permissions must allow Actions to write. In **Settings → Actions → General → Workflow permissions**, choose **Read and write permissions**.
