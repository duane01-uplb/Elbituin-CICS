# ⛽ FuelBridge

> **Fuel Smarter. Drive Further.**
> An AI-powered fuel cost reduction and community energy platform for Filipino tricycle drivers, jeepney operators, and small vehicle owners.

---

## 🎯 What It Does

FuelBridge is a hackathon prototype that helps Filipino drivers:

1. **Find cheap fuel nearby** — Interactive map with color-coded station markers (green = cheap, red = expensive)
2. **Optimize routes** — Calculate fuel-efficient paths with estimated cost and recommended refueling stops
3. **Track savings** — Mock cooperative wallet showing monthly spending, savings rate, and co-op pool
4. **Get AI guidance** — Rule-based chatbot with advice on fuel savings, EV transition, government programs

---

## 🖼️ Screenshots

```
[Fuel Map]   → Interactive Leaflet map with 12 stations across Metro Manila & Laguna
[Route]      → Click map to set start/end, get distance + fuel cost estimate
[Wallet]     → Dashboard with savings chart, leaderboard, badges
[AI Guide]   → Chat interface with quick prompts and contextual responses
```

---

## 🛠️ Tech Stack

| Layer | Technology |
|-------|-----------|
| Frontend | Next.js 14 (React) + CSS Modules |
| Maps | Leaflet.js + OpenStreetMap + MapLibre GL |
| Backend | Node.js + Express |
| Database | Supabase (PostgreSQL) |
| AI | Rule-based keyword matching |

---

## 📁 Project Structure

```
fuelbridge/
├── frontend/                    # Next.js PWA
│   ├── src/
│   │   ├── pages/
│   │   │   ├── index.js         # Main app with tab routing
│   │   │   ├── index.module.css
│   │   │   ├── _app.js          # Global CSS + Leaflet CSS
│   │   │   └── _document.js     # PWA meta, fonts
│   │   ├── components/
│   │   │   ├── Navbar.js        # Top nav + mobile bottom nav
│   │   │   ├── FuelMap.js       # Leaflet map with station markers
│   │   │   ├── RouteOptimizer.js # Route input + map + result panel
│   │   │   ├── FuelWallet.js    # Savings dashboard + leaderboard
│   │   │   └── AIChat.js        # Chatbot UI
│   │   ├── lib/
│   │   │   └── api.js           # All API calls + utility functions
│   │   └── styles/
│   │       └── globals.css      # Design system, CSS variables
│   ├── public/
│   │   └── manifest.json        # PWA manifest
│   ├── next.config.js
│   ├── package.json
│   └── .env.example
│
├── backend/                     # Express API
│   ├── src/
│   │   ├── index.js             # Server entry point
│   │   ├── routes/
│   │   │   ├── fuelPrices.js    # GET /api/fuel-prices
│   │   │   ├── route.js         # POST /api/route
│   │   │   ├── chat.js          # POST /api/chat
│   │   │   └── wallet.js        # GET /api/wallet
│   │   └── data/
│   │       ├── stations.js      # 12 mock fuel stations
│   │       └── aiResponses.js   # Rule-based AI responses
│   ├── package.json
│   └── .env.example
│
├── supabase/
│   └── schema.sql               # DB schema + seed data
│
└── README.md
```

---

## 🚀 Quick Start (Local Development)

### Prerequisites

- Node.js 18+ ([download](https://nodejs.org))
- npm or yarn
- Git

### 1. Clone the repository

```bash
git clone https://github.com/yourusername/fuelbridge.git
cd fuelbridge
```

### 2. Set up the Backend

```bash
cd backend

# Install dependencies
npm install

# Copy environment variables
cp .env.example .env
# Edit .env if needed (defaults work out of the box)

# Start the backend server
npm run dev
```

The backend will start at **http://localhost:4000**

Test it: `curl http://localhost:4000/api/health`

### 3. Set up the Frontend

Open a **new terminal**:

```bash
cd frontend

# Install dependencies
npm install

# Copy environment variables
cp .env.example .env.local
# Edit .env.local if needed (defaults point to localhost:4000)

# Start the frontend
npm run dev
```

The frontend will start at **http://localhost:3000**

Open your browser at [http://localhost:3000](http://localhost:3000) 🎉

---

## 🌐 API Endpoints

### Backend (http://localhost:4000)

| Method | Endpoint | Description |
|--------|----------|-------------|
| GET | `/api/health` | Health check |
| GET | `/api/fuel-prices` | All fuel stations with prices |
| GET | `/api/fuel-prices?fuelType=gas91&city=Makati` | Filtered stations |
| POST | `/api/route` | Calculate route + fuel cost |
| POST | `/api/chat` | AI assistant response |
| GET | `/api/wallet` | Mock wallet/savings data |
| GET | `/api/wallet/leaderboard` | Co-op savings leaderboard |

### Example: Get fuel prices

```bash
curl "http://localhost:4000/api/fuel-prices?fuelType=gas95"
```

### Example: Calculate route

```bash
curl -X POST http://localhost:4000/api/route \
  -H "Content-Type: application/json" \
  -d '{
    "startLat": 14.5547,
    "startLng": 121.0244,
    "endLat": 14.2717,
    "endLng": 121.4115,
    "vehicleType": "tricycle",
    "fuelType": "gas91"
  }'
```

### Example: Chat

```bash
curl -X POST http://localhost:4000/api/chat \
  -H "Content-Type: application/json" \
  -d '{"message": "Where is the cheapest fuel?"}'
```

---

## 🗄️ Database Setup (Supabase — Optional)

The prototype works without a database (uses mock data). To enable Supabase persistence:

1. Create a free account at [supabase.com](https://supabase.com)
2. Create a new project
3. Open the SQL Editor and paste the contents of `supabase/schema.sql`
4. Click "Run" — this creates tables and inserts seed data
5. Copy your project URL and anon key from **Settings > API**
6. Add to both `.env` files:

```env
# backend/.env
SUPABASE_URL=https://your-project.supabase.co
SUPABASE_ANON_KEY=your-anon-key

# frontend/.env.local
NEXT_PUBLIC_SUPABASE_URL=https://your-project.supabase.co
NEXT_PUBLIC_SUPABASE_ANON_KEY=your-anon-key
```

---

## ☁️ Deployment

### Frontend → Vercel

```bash
# Install Vercel CLI
npm i -g vercel

cd frontend
vercel

# Set environment variable in Vercel dashboard:
# NEXT_PUBLIC_API_URL = https://your-backend.railway.app
```

### Backend → Railway

1. Push to GitHub
2. Go to [railway.app](https://railway.app) → New Project → Deploy from GitHub
3. Select the `backend` folder
4. Add environment variable: `FRONTEND_URL = https://your-app.vercel.app`

---

## 🧪 Running Without Backend

The frontend has built-in fallback mock data. If the backend is unreachable:
- The fuel map will display 5 default stations
- The wallet will show static mock data
- The AI chat will show a connection error message
- Route optimization will show an error

This makes it demo-safe even without the backend running.

---

## 🔮 Future Improvements

### Short-term (Post-hackathon)
- [ ] Real DOE API integration (weekly price bulletin scraper)
- [ ] User authentication via Supabase Auth
- [ ] Persistent fuel log tracking
- [ ] OSRM integration for actual road routing
- [ ] Push notifications for fuel price drops

### Medium-term
- [ ] Bulk purchasing module with SMS notifications
- [ ] OBD-II Bluetooth dongle integration (real consumption data)
- [ ] Offline mode with service worker caching
- [ ] Tagalog + Cebuano language support
- [ ] GCash/Maya wallet integration

### Long-term
- [ ] ML-based fuel price forecasting (3–7 days ahead)
- [ ] EV charging station mapping
- [ ] Carbon credit tracking and marketplace
- [ ] Cooperative governance dashboard
- [ ] Multi-country expansion (Indonesia, Vietnam, Nigeria)

---

## 🤝 Contributing

This is a hackathon prototype. Issues and PRs welcome!

1. Fork the repo
2. Create a feature branch: `git checkout -b feature/my-feature`
3. Commit: `git commit -m 'Add some feature'`
4. Push: `git push origin feature/my-feature`
5. Open a Pull Request

---

## 📄 License

MIT License — free to use, modify, and distribute.

---

## 🙏 Acknowledgments

- **OpenStreetMap** contributors for free map tiles
- **Leaflet.js** for the mapping library
- **DOE Philippines** for public fuel price data
- All Filipino tricycle and jeepney drivers who inspired this project

---
