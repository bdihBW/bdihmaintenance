# BDIH Maintenance Intelligence Platform: setup

Developed by K.Letsweletse · © Botswana Digital and Innovation Hub (BDIH)

## 1. Database (Supabase, about 10 minutes)

1. Open https://supabase.com/dashboard, project `icdlymlfjubdqjxdffcx`.
2. **SQL Editor → New query**: paste all of `supabase/schema.sql` → **Run**. It creates the tables, access rules and the private `evidence` file bucket. Safe to run again.
3. **Edge Functions → Deploy a new function → Via editor**: name it `admin-users`, paste `supabase/functions/admin-users/index.ts`, deploy. (The System Administrator uses it to add users and reset passwords.)
4. **Authentication → Sign In / Providers → Email**: turn **off** "Allow new users to sign up" (only the admin creates accounts). Turn off "Confirm email".
5. **Authentication → Users → Add user**: enter the first administrator's work email and a password, tick *Auto confirm*.
6. Back in the **SQL Editor**, run once (use your details):
   ```sql
   select public.bdih_bootstrap_admin('your.email@bih.co.bw', 'sysadmin', 'Your Full Name');
   ```
7. Sign in to the platform with that username. Add the officers, manager and director under **Users & roles**; each gets a temporary password to change at first sign-in.

## 2. Publish (GitHub Pages)

1. Upload every file in this project to `https://github.com/bdihBW/bdihmaintenance` (root of the `main` branch), including the hidden `.nojekyll` file and the `_ds`, `assets` and `supabase` folders. Do not upload `uploads/` or `scraps/`.
2. Repository **Settings → Pages → Build and deployment**: Source *Deploy from a branch*, branch `main`, folder `/ (root)`.
3. The platform will be at `https://bdihbw.github.io/bdihmaintenance/`.
4. In Supabase **Authentication → URL Configuration**, set *Site URL* to that address.

## How it works

- **Sign-in:** username + password. The username is looked up to the user's email, then Supabase Auth checks the password (stored hashed by Supabase).
- **Roles** are enforced by the database (Row Level Security), not only by the screen:
  - Officers, Manager, Director, Technician: read and write records.
  - System Administrator: read everything; manages users only.
  - Viewer: read only.
  - Audit trail: visible to Manager, Director and System Administrator; nobody can edit or delete entries.
  - Records are never deleted; delete rights are revoked in the database.
- **Offline:** every change is saved on the device first and queued. When the connection returns the queue is pushed, then the latest data from colleagues is pulled. Evidence photos taken offline are uploaded on the next sync. The app also pulls every 60 seconds while online.
- **Conflicts:** if two people edit the same record, the last saved version wins; both edits remain in the audit trail. If two people create a record with the same number while offline, the second gets a suffix (e.g. `WO-2402-K7Q`) and the user is told.
- **Public fault reports** from the sign-in page go straight into Maintenance requests without an account.

## Switching back to the demo

In `bdih-config.js` set `enabled: false`. The demo users (pfo1, pfmanager, pdirector, sysadmin / Bdih@2026) and sample data then run in the browser only.

## Keys

`bdih-config.js` holds the project URL and the **anon** key, which is public by design. Never put the `service_role` key in any file in this repository.


## Evidence files (photos, PDFs) in the database
Run `supabase/storage.sql` once in the Supabase SQL editor. It creates:
- a private storage bucket `evidence` (files up to 10 MB; nothing can be deleted)
- a table `evidence_files` listing every file: path, name, type, size, who uploaded it and when

When online, files go straight to the database as soon as they are attached; large photos are resized to 1600px first. When offline, they are kept on the device and uploaded on the next sync. Each file shows "in database" or "on device, pending upload".
