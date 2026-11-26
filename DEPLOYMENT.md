# Deployment

SkillBridge has two parts to deploy: the **database and file storage on Supabase**, and the **React frontend on Vercel**. There is no separate API server.

## 1. Supabase (database, sign-in, file storage)

1. Create a project at [supabase.com](https://supabase.com) (a new project is cleanest; the free plan is enough).
2. Open **SQL Editor**, then run these files, one after the other, by pasting each and pressing Run:
   1. `supabase/schema.sql` (tables, security policies, functions, the private `evidence` bucket)
   2. `supabase/seed.sql` (assessments, questions, bridging steps)
   3. `supabase/demo.sql` (optional: four fictional demo profiles, so the talent directory is not empty)

   Each file is safe to run again.
3. **Authentication, Providers, Email:** for a demo, switch **Confirm email** off so people can sign in right after registering. If you leave it on, the app shows a "Check your email" screen and the confirmation link goes to your Site URL (next step).
4. **Authentication, URL Configuration:** set **Site URL** to your Vercel address once you have it, and add it under **Redirect URLs**.
5. Copy two values from **Project Settings, API**: the **Project URL** and the **anon public key**. Do not use the `service_role` key anywhere in this project.
6. Make yourself a reviewer. Register in the app, then run this in the SQL editor (change the email):

```sql
update public.profiles set role = 'reviewer'
 where id = (select id from auth.users where email = 'you@example.com');
```

You can only do this from the SQL editor. The app and the database both refuse to let anyone promote themselves.

## 2. Vercel (frontend)

1. Push the repository to GitHub.
2. In [vercel.com](https://vercel.com), choose **Add New, Project**, and import the repository.
3. Settings: Framework Preset **Vite**. Build Command `npm run build`. Output Directory `dist`. Root Directory is the repository root.
4. Under **Environment Variables**, add both of these for Production (and Preview):

| Name | Value |
| --- | --- |
| `VITE_SUPABASE_URL` | the Project URL from Supabase |
| `VITE_SUPABASE_ANON_KEY` | the anon public key from Supabase |

5. Deploy. `vercel.json` already rewrites every path to `index.html`, so refreshing a deep link such as `/p/amani-otieno-3f2a1` works.
6. Copy the live address back into **Supabase, Authentication, URL Configuration** (step 1.4), and into `README.md` and `docs/SUBMISSION.md`.

Vite reads the two variables **when it builds**. If you add or change them, redeploy.

## 3. After deploying: a quick regression pass

Do these in the live app, in this order. The whole pass takes about ten minutes.

1. Open the home page. The four numbers load (they come from the database).
2. Register a new account. You land on the dashboard.
3. Profile: fill it in and publish. The public link appears.
4. My claims: add a claim, attach a PDF, send it for review.
5. Log in as the reviewer: Review queue, open the file, approve with a method.
6. Log back in as the candidate: the claim shows Verified and how.
7. Assessments: take one, fail it, take it again and pass.
8. Bridging: request a fee waiver; decide it as the reviewer.
9. Log out and open the public profile and the talent directory. Send an introduction request.
10. Log in as the candidate: the request is in the dashboard inbox.
11. Refresh a deep link (`/p/...`, `/credentials`). It must not show a 404.

## 4. Common problems and fixes

| Symptom | Cause | Fix |
| --- | --- | --- |
| The page says "connect Supabase" | The two environment variables were missing at build time | Add them in Vercel (Production), then redeploy |
| "Cannot reach the server" everywhere | Wrong project URL, or a typo in the anon key | Re-copy both values from Supabase, Project Settings, API; redeploy |
| Register works but the profile page errors | `schema.sql` was not run, or only partly | Run `schema.sql` again; it is safe to repeat |
| Assessments list is empty | `seed.sql` was not run | Run `seed.sql` |
| "You do not have permission to do that" | A row-level security policy refused it, usually a missing schema step | Run `schema.sql` again and check there were no errors |
| Evidence upload fails | The `evidence` bucket is missing | Run `schema.sql` (it creates the bucket), or create a private bucket named `evidence` |
| Refreshing `/credentials` or `/p/...` shows 404 | `vercel.json` not deployed | Make sure `vercel.json` is committed at the repository root |
| New users never get past "Check your email" | Email confirmation is on | Turn off **Confirm email** for the demo, or confirm from the email |
| The Review queue link does not appear | The account is not a reviewer yet | Run the `update public.profiles ...` statement, then log out and in |
| "Too many attempts" at sign-in | Supabase rate limit on repeated sign-ins | Wait a minute |

## 5. Keeping the deployed app and the repository in step

Vercel redeploys on every push to `main`. For the submission, make sure the last commit on `main` is the one that is live (Vercel, Deployments, shows the commit), and that `schema.sql` in the repository is the one you ran in Supabase.
