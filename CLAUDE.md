# United Accountants Portal — working conventions

Full architecture/data-model reference: `PROJECT_DOCUMENTATION.md` (read it
first on a new session). This file is about *how to work in this repo*, not
what it contains.

## Before calling anything done

1. `npx tsc --noEmit` — must be clean.
2. `npx next build --webpack` (see Windows quirk below for why `--webpack`).
3. Live-verify in the dev server, not just types/build. For UI changes, use
   Playwright against `npx next dev --webpack` and prefer a screenshot over
   a text assertion when the two disagree — assertions lie more easily.
4. After `git push`, confirm the deploy actually landed on **both**
   production domains before reporting the task finished:
   ```
   curl -s -D - -o /dev/null --max-time 10 https://clients.uniacc.net  | grep -i x-vercel-id
   curl -s -D - -o /dev/null --max-time 10 https://internal.uniacc.net | grep -i x-vercel-id
   ```
   Give Vercel ~60-90s after push before checking. A changed `X-Vercel-Id`
   on both confirms the new build is live on both.

## Git

- Stage only the specific files a change actually touched
  (`git add <file> <file>`) — never `git add -A` or `git add .`.
- New commits, not `--amend`, unless explicitly asked otherwise.
- `.env.local` is gitignored on purpose and must never be committed - real
  Supabase/GHL secrets live only in it locally and in Vercel's project env
  vars.

## Known environment quirks (not code bugs - don't "fix" these in the app)

- **Turbopack sometimes fails locally** with `An Application Control policy
  has blocked this file` on `@next/swc-win32-x64-msvc`. Not a code issue -
  use `next dev --webpack` / `next build --webpack` instead. Vercel's own
  build environment is unaffected either way.
- **`git push` can fail with 403** from a stale cached GitHub credential for
  an account without push access. Fix: `git credential-manager github
  logout <stale-account>`, then retry. If the retry hangs with no output,
  it's waiting on an interactive sign-in dialog that a sandboxed/non-TTY
  shell can't render - ask the human to run `git push` themselves from a
  real terminal to complete it once; it should stay unblocked after that.
- **GHL API returns 429** under moderate burst load (confirmed live, not
  hypothetical) - `ghlFetch` in `lib/ghl/client.ts` retries with backoff,
  but a page that fans out into many GHL calls (e.g. a contacts list doing
  one call per row) can still hit it. Prefer fetching once and deriving,
  over N+1 calls in a loop, when adding anything that lists many
  contacts/companies.

## Supabase query gotcha that already caused a real bug

`companies` has **5 different foreign keys** into `team_members` (the
company-level `assigned_team_member_id` plus 4 per-service assignee
columns). Any `.select()` that embeds one of these tables from the other
**must** name the constraint explicitly:

```ts
.select("id, full_name, companies!companies_assigned_team_member_id_fkey(id)")
```

An unqualified embed (`companies(id)`) is ambiguous to PostgREST and errors
the *entire* query out. This already happened once in production
(`app/owner/team/page.tsx` silently showed zero team members for months)
because the code destructured `{ data }` without checking `error`. Always
check the `error` from a Supabase query that might fail silently like this,
especially on an embed.

## GHL conversations pagination

`getConversationMessages` in `lib/ghl/client.ts` walks every page via
`lastMessageId`/`nextPage` - GHL only returns ~20-100 messages per call. If
you add a new GHL list-type call, check its response for the same
`nextPage`/cursor shape before assuming one fetch is "all of it."

## Supabase Auth invites

Client and team-member invites both go through
`admin.auth.admin.inviteUserByEmail`. Calling it again on an email that's
already **confirmed** errors (used deliberately in the "resend invite"
actions to detect "already accepted" vs. "actually needs a resend").
Outbound mail now goes through Resend as custom SMTP, configured in the
Supabase Dashboard (Authentication → Emails → SMTP Settings) - not visible
anywhere in this codebase's env vars, so don't go looking for it in code.
Supabase's own per-hour send-rate limit (Authentication → Rate Limits) is a
*separate* dashboard setting that applies regardless of SMTP provider.

## Commit messages

End commit messages with the attribution line your current system
instructions specify (check the session's own guidance for the exact
wording/model name in use at the time, rather than hardcoding one here).
