# Roll Story

Restaurant website for Roll Story — Premium Shawarma & Crepes, Soroca, Moldova.

## Tech Stack

- **Frontend:** HTML5, CSS3, Vanilla JS (no framework — zero build step)
- **Backend:** Node.js + Express 4
- **Database & Storage:** Supabase (PostgreSQL + Storage)
- **Auth:** JWT (admin panel only)

## Local Development

1. **Install dependencies**
   ```bash
   npm install
   ```

2. **Configure environment**
   Create a `.env` file in the project root:
   ```
   SUPABASE_URL=https://your-project.supabase.co
   SUPABASE_SERVICE_ROLE_KEY=your-service-role-key
   JWT_SECRET=generate-a-long-random-string
   PORT=3000
   ```

3. **Start the server**
   ```bash
   npm start
   ```

   The site is available at `http://localhost:3000`.

## Supabase Setup

All data lives in Supabase. The required tables are:
- `admins` — admin users with `username` and `password_hash` columns
- `menu_items` — restaurant menu
- `settings` — key/value site settings
- `gallery` — gallery images
- `about_sections` — about page content
- `social_links` — social media links
- `promo_popup` — promotional popup config
- `static_pages` — custom nav pages

A `images` Storage bucket is required for all media uploads.

## Admin Panel

- **URL:** `/admin/login.html`
- The first admin account must be created directly in the `admins` Supabase table.
- Passwords are stored as bcrypt hashes — use the change-password form after first login.

## Deploying to Render

1. Create a new **Web Service** pointing to this repository.
2. Set **Build Command:** `npm install`
3. Set **Start Command:** `npm start`
4. Add the following **Environment Variables** in Render dashboard:
   - `SUPABASE_URL`
   - `SUPABASE_SERVICE_ROLE_KEY`
   - `JWT_SECRET` — generate with: `node -e "console.log(require('crypto').randomBytes(64).toString('hex'))"`
   - `ALLOWED_ORIGIN` — your Render service URL (e.g. `https://roll-story.onrender.com`)
5. Set **Node Version** to `20` in Render settings.

## Project Structure

```
public/          Static frontend assets (HTML, CSS, JS, images)
  admin/         Admin panel (login + dashboard)
  css/           Stylesheets
  js/            Frontend scripts
src/             Backend (Node.js / Express)
  middleware/    auth.js, upload.js
  routes/        api.routes.js, admin.routes.js
  server.js      Express entry point
  supabase.js    Supabase client
```
