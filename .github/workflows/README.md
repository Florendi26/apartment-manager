# Keep Supabase Alive

Pings the Supabase database every day at **10:00 UTC** (three small reads). A free Supabase project pauses when it gets too little database activity over 7 days.

Each run messages you that the ping happened. When **5 days or fewer** remain before GitHub turns the schedule off, that message also tells you to enable the workflow and run it again. GitHub does this after 60 days with no repository activity.

## Messages

Add either WhatsApp or email as repository secrets: **Settings → Secrets and variables → Actions**.

### WhatsApp

1. On [CallMeBot’s WhatsApp page](https://www.callmebot.com/blog/free-api-whatsapp-messages/), add the bot number shown there to your contacts. The number changes.
2. Send this WhatsApp message to that contact: `I allow callmebot to send me messages`
3. The bot replies with an API key.
4. Add these secrets:

| Secret | Value |
| --- | --- |
| `WHATSAPP_PHONE` | Your number with country code, such as `+383XXXXXXXX` |
| `CALLMEBOT_APIKEY` | The API key from the bot |

### Email

| Secret | Value |
| --- | --- |
| `NOTIFY_EMAIL` | The address that should receive the message |
| `RESEND_API_KEY` | Resend API key. The sender `onboarding@resend.dev` can only deliver to the email on that Resend account until a domain is verified. |

## Supabase secrets

| Secret | Value |
| --- | --- |
| `SUPABASE_URL` | `https://krrhgslhvdfyvxayefqh.supabase.co` |
| `SUPABASE_ANON_KEY` | Supabase anon key (Dashboard → Settings → API) |

## One-time enable

If Actions says the workflow is disabled, sign in as a repository admin, open **Actions → Keep Supabase Alive**, click **Enable workflow**, then **Run workflow**.
