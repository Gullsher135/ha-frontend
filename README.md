# HA Enterprises: Frontend

React 18 + Vite. Deploy on Vercel. See `../DEPLOY.md` for the full step-by-step guide.

```
npm install
cp .env.example .env     # set VITE_API_URL to your backend address ending in /api
npm run dev              # http://localhost:5173
npm run build            # output in dist/
```

On Vercel: Framework = Vite, Build = `npm run build`, Output = `dist`, and the environment variable `VITE_API_URL`.
