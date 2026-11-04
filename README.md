# HA Enterprises - Frontend (Chunk 2)
React 18 + Vite. Deploy on Vercel.

## Local
1. `npm install`  2. copy `.env.example` to `.env` (VITE_API_URL = your backend URL ending in /api)  3. `npm run dev`

## Vercel
- Framework: Vite. Build: `npm run build`. Output: `dist`.
- Environment variable: `VITE_API_URL=https://YOUR-RENDER-APP.onrender.com/api`
- Then put the Vercel URL in the backend's `FRONTEND_URL` on Render (no trailing slash) and redeploy the backend.

## Screens in this chunk
Login, Home (to receive / to pay), Parties (tabs, search, add), Ledger (date filter, transfer, opening balance, corrections), Items, Activity (owner).
