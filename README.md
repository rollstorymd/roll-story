# Roll Story

Restaurant website for Roll Story — Premium Shawarma & Crepes, Soroca, Moldova.

## Architecture

- **Frontend:** static HTML/CSS/Vanilla JS in `public/`, hosted on Vercel
- **Backend:** none — the browser talks directly to Supabase
- **Auth:** Supabase Auth (admin only)
- **Database:** Supabase PostgreSQL
- **Storage:** Supabase Storage (`images` bucket)

## Project Structure

```
public/
  admin/            Admin panel (login + dashboard)
  css/              Stylesheets (unchanged)
  js/
    app.js          Public site logic (Supabase reads)
    admin.js        Admin CRUD logic (Supabase writes/uploads)
    lang.js         Translations
    supabase-client.js   Browser client + helpers
    env.js          Generated at build from env vars (gitignored)
    env.example.js  Template
  *.html            Pages
build.js            Generates public/js/env.js from env vars
vercel.json         Vercel build/headers
package.json        No runtime deps; build/dev scripts only
```

## Environment Variables

Two values are required, both safe to expose to the browser:

| Name | Description |
|------|-------------|
| `SUPABASE_URL` | `https://<project>.supabase.co` |
| `SUPABASE_ANON_KEY` | The anon public key from Supabase API settings |

In Vercel set them under **Project Settings → Environment Variables**. The build step (`node build.js`) writes them into `public/js/env.js`.

## Supabase Setup

### 1. Tables

Existing tables stay as-is: `menu_items`, `settings`, `gallery`, `about_sections`, `social_links`, `promo_popup`, `static_pages`. The legacy `admins` table is no longer used and can be dropped.

Add the admin profile table that maps Supabase Auth users to the admin role:

```sql
create table if not exists admin_profiles (
    user_id uuid primary key references auth.users(id) on delete cascade,
    created_at timestamptz default now()
);

create or replace function is_admin()
returns boolean
language sql
stable
as $$
    select exists (select 1 from admin_profiles where user_id = auth.uid());
$$;
```

Required uniqueness constraints (verify they exist):

```sql
alter table settings      add constraint settings_key_unique      unique (key);
alter table social_links  add constraint social_links_type_unique unique (type);
alter table static_pages  add constraint static_pages_slug_unique unique (slug);
```

### 2. Row Level Security

```sql
alter table menu_items      enable row level security;
alter table settings        enable row level security;
alter table gallery         enable row level security;
alter table about_sections  enable row level security;
alter table social_links    enable row level security;
alter table promo_popup     enable row level security;
alter table static_pages    enable row level security;
alter table admin_profiles  enable row level security;

create policy "menu_public_read"     on menu_items     for select using (active = 1);
create policy "settings_public_read" on settings       for select using (true);
create policy "gallery_public_read"  on gallery        for select using (true);
create policy "about_public_read"    on about_sections for select using (active = 1);
create policy "social_public_read"   on social_links   for select using (active = 1);
create policy "promo_public_read"    on promo_popup    for select using (active = 1);
create policy "pages_public_read"    on static_pages   for select using (active = 1);

create policy "menu_admin_all"     on menu_items     for all using (is_admin()) with check (is_admin());
create policy "settings_admin_all" on settings       for all using (is_admin()) with check (is_admin());
create policy "gallery_admin_all"  on gallery        for all using (is_admin()) with check (is_admin());
create policy "about_admin_all"    on about_sections for all using (is_admin()) with check (is_admin());
create policy "social_admin_all"   on social_links   for all using (is_admin()) with check (is_admin());
create policy "promo_admin_all"    on promo_popup    for all using (is_admin()) with check (is_admin());
create policy "pages_admin_all"    on static_pages   for all using (is_admin()) with check (is_admin());

create policy "admin_profiles_self_read" on admin_profiles for select using (user_id = auth.uid());
```

### 3. Storage

Create a public bucket called `images` (Storage → New bucket → Public).

```sql
create policy "images_public_read"   on storage.objects for select  using (bucket_id = 'images');
create policy "images_admin_insert"  on storage.objects for insert  with check (bucket_id = 'images' and is_admin());
create policy "images_admin_update"  on storage.objects for update  using (bucket_id = 'images' and is_admin());
create policy "images_admin_delete"  on storage.objects for delete  using (bucket_id = 'images' and is_admin());
```

### 4. First Admin

1. In Supabase **Authentication → Users** click **Add user** and create an account with email + password.
2. Copy that user's UUID and run:

```sql
insert into admin_profiles (user_id) values ('<auth-user-uuid>');
```

That email/password is what you log in with at `/admin/login.html`.

## Local Development

1. Copy the template and fill in your values:

```bash
cp public/js/env.example.js public/js/env.js
```

Edit `public/js/env.js` so both globals are set to your Supabase project values.

2. Serve `public/` statically:

```bash
npm run dev
```

The site is available at the URL printed by `serve` (typically `http://localhost:3000`).

## Deploying to Vercel

1. Import the repo in Vercel.
2. Set `SUPABASE_URL` and `SUPABASE_ANON_KEY` in **Project Settings → Environment Variables**.
3. The build command `node build.js` is already configured in `vercel.json` and writes the env values into `public/js/env.js`. The output directory is `public`.
4. Deploy.

## Admin Panel

- URL: `/admin/login.html`
- Authentication: Supabase Auth (email + password). The login form's "Username" field accepts your admin email.
- Authorization: the user must have a row in `admin_profiles`.
- Password change: handled inside the admin dashboard via Supabase Auth (`updateUser`).
