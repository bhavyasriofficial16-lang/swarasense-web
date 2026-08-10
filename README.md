# SwaraSense — Web / PWA

Installable as a home-screen app on any phone (including iPhone, via Safari's
"Add to Home Screen") — no App Store, no Xcode, no CocoaPods, no developer
account needed.

## How audio capture works here

The **browser itself** captures the mic (via `getUserMedia` + Web Audio API)
and streams it to the backend over WebSocket — the same approach used by the
React Native mobile app, just running in a browser tab instead of a native
shell. This means:

- Whoever opens the page on their phone uses **their own phone's mic** —
  not your laptop's.
- The backend can be deployed anywhere (a cloud server has no physical mic,
  which is fine, since it's not the one listening).

## Local development

**Terminal 1 — backend:**
```bash
cd backend
python3 -m venv venv && source venv/bin/activate
pip install -r requirements.txt
uvicorn main:app --reload --host 0.0.0.0 --port 8000
```

**Terminal 2 — frontend:**
```bash
cd frontend
npm install
npm run dev
```

Open `http://localhost:5173`, click "Start listening," allow mic access,
and play a note.

## Deploying so your professor (or anyone) can open it on their phone

### 1. Deploy the backend (Render — free tier)

1. Push this project to a GitHub repo
2. Go to https://render.com, sign up/log in
3. **New → Web Service** → connect your repo
4. Render should auto-detect `backend/render.yaml` — if not, set manually:
   - Root directory: `backend`
   - Build command: `pip install -r requirements.txt`
   - Start command: `uvicorn main:app --host 0.0.0.0 --port $PORT`
5. Deploy. You'll get a URL like `https://swarasense-backend.onrender.com`

### 2. Deploy the frontend (Netlify — free tier)

1. Go to https://netlify.com, sign up/log in
2. **Add new site → Import from GitHub** → same repo
3. It should auto-detect `netlify.toml` — if not, set manually:
   - Base directory: `frontend`
   - Build command: `npm install && npm run build`
   - Publish directory: `frontend/dist`
4. Before deploying, add environment variables (Site settings → Environment variables):
   ```
   VITE_WS_URL = wss://swarasense-backend.onrender.com/ws/mobile-audio
   VITE_API_URL = https://swarasense-backend.onrender.com
   ```
   (Use your actual Render URL from step 1 — note `wss://` not `ws://`, since
   Render serves HTTPS, and browsers require secure WebSockets on HTTPS pages.)
5. Deploy. You'll get a URL like `https://swarasense.netlify.app`

### 3. Install it on a phone

1. Open that Netlify URL in **Safari** (iPhone) or **Chrome** (Android)
2. Tap the Share/menu button → **"Add to Home Screen"**
3. It appears as an app icon, opens full-screen, works like an installed app
4. Tap "Start listening," allow mic access when prompted, play a note

## Notes

- **Render's free tier sleeps after inactivity** — the first request after
  a period of no traffic can take 30-60 seconds to wake up. If your
  professor opens the app and nothing happens immediately, that's likely
  why — give it a moment, or open the Render URL directly first to "wake"
  it before the demo.
- Sa calibration ("🎵 Play Sa to set it") works exactly the same as in the
  mobile app — tap it, then play your Sa note, no manual frequency typing.
