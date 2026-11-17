# Alexandra @18 & Althea @14 — Invitation + Album (Vue 3 + Vuetify + Tailwind)

## Storage
Photos/videos upload directly from the browser to Cloudflare R2 (presigned URLs). Copy `.env.example` to `.env` and fill it in before `npm run dev`.

## Run locally
    npm install
    npm run dev          # Vite on http://localhost:5173 (API on :3000)
    # or the production way:
    npm run build && npm start   # http://localhost:3000

## Deploy (Railway)
1. Push this folder to a GitHub repo.
2. railway.com → New Project → Deploy from GitHub repo.
   Build: `npm run build`   Start: `npm start`
3. Variables:  DATA_DIR=/data   ADMIN_KEY=<your secret>
   plus the five R2 variables from `.env.example`.
4. Add a Volume to the service, mount path `/data` (it now only holds the small db.json list; photos live in R2).
5. Settings → Networking → Generate Domain.
6. `npm run qr -- https://YOUR-DOMAIN`  → qr.png

## Admin delete
Open https://YOUR-DOMAIN/album?admin=YOUR_ADMIN_KEY, open a photo, press Delete.

## Edit details
Date/time: EVENT in src/views/HomeView.vue. Text: same file.
Colors: src/plugins/vuetify.js and tailwind.config.js.

## Windows "Application Control policy has blocked this file"
`package.json` already swaps Rollup/esbuild for WebAssembly versions (no native .node/.exe files).
Delete `node_modules` and `package-lock.json`, then run `npm install` again.
