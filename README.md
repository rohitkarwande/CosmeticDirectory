# SalonFinder

SalonFinder is a production-quality, real-time web application to search for salon and beauty businesses in India. It geocodes user search locations, queries OpenStreetMap (OSM) via the Overpass API, queries local Points of Interest (POIs) via the **TomTom Search API**, normalizes results, removes duplicates geographically and contact-wise, validates coordinates, and presents them in a responsive dashboard layout. It also allows exporting filtered lists to Excel and copying phone numbers in bulk.

## Features
- **Zero Database Architecture**: Dynamically queries live public APIs on-demand rather than holding a stale database.
- **Dual-Provider Integration (OSM + TomTom)**:
  - If a `TOMTOM_API_KEY` is provided, the backend queries both OSM and TomTom in parallel, merging and deduplicating results.
  - If the key is absent, the backend falls back to OSM only, keeping the app 100% functional and free out-of-the-box.
- **Resilient Fallback Provider**: Automatically detects rate limits (HTTP 429) or timeouts on public Overpass instances and falls back to alternate servers (`lz4`, `z`, `kumi` instances).
- **Billing-Safe and Absolutely Free Option**: TomTom Search API daily allowance is **2,500 free queries**, requiring **NO credit card or billing registration** to register. If limits are exceeded, it simply returns error code 403 rather than charging you.
- **Aesthetic UI**: Modern, fully-responsive dashboard interface with clean filters, pagination (20/50 per page), and detailed statistics cards.
- **Client-Side Export**: Generates Excel files (`xlsx`) in the browser with SheetJS.
- **Bulk Operations**: Copies all active, formatted phone numbers (`+91XXXXXXXXXX`) to the clipboard with a single click.

---

## Project Structure
```
d:/SalonFinder/
├── package.json               # Frontend React/Vite dependencies
├── tailwind.config.js         # Tailwind v3 layout theme
├── postcss.config.js          # PostCSS processor configuration
├── vite.config.ts             # Vite server options
├── src/                       # Frontend SPA Source
│   ├── main.tsx
│   ├── App.tsx                # Main state container
│   ├── components/            # Visual blocks (SearchBar, StatsCards, FiltersSection, SalonsTable, Disclaimer)
│   ├── types/                 # Shared interfaces
│   └── utils/                 # Exporter helpers (excel.ts)
└── server/                    # Node.js + Express Backend
    ├── package.json           # Backend dependencies (Express, CORS, Axios, Rate Limit)
    ├── .env.example           # Example environmental file
    ├── server.js              # Server entry point
    ├── providers/             # Geocoding, Overpass, and TomTom clients
    └── utils/                 # Normalization & Deduplication scripts
```

---

## 1. Setup & Installation

Ensure you have [Node.js](https://nodejs.org) (v18+) installed.

### Clone and install dependencies
1. **Frontend Dependencies (Root folder)**:
   ```bash
   cd d:/SalonFinder
   npm install
   ```
2. **Backend Dependencies (`server/` folder)**:
   ```bash
   cd d:/SalonFinder/server
   npm install
   ```

---

## 2. Configuration (Environment Variables)

Create a `.env` file in the `server/` directory based on `server/.env.example`:
```bash
cp server/.env.example server/.env
```

Open `server/.env` and specify:
- `PORT`: Port the Express backend runs on (default: `5000`).
- `CORS_ORIGIN`: Allowed origin for cross-origin resource requests. For local development, set to `*` or `http://localhost:5173`. In production, set to your deployed frontend domain.
- `TOMTOM_API_KEY`: **(Optional)** Paste your TomTom API key here to enable high-volume business listings.

### How to get a Free, Charge-Safe TomTom API Key:
1. Go to the [TomTom Developer Portal](https://developer.tomtom.com/).
2. Register for a free account. **No credit card or billing details are required.**
3. Verify your email and log in to your Dashboard.
4. Click on **Keys** in the sidebar, copy your automatically generated API key, and paste it into `server/.env`.
5. You get 2,500 requests per day for free. If you exceed this, the API will fail gracefully with a limit error and you will **never** be charged.

---

## 3. Running Locally

You must start both the backend server and the frontend development server.

### Start Backend Server
In the `server/` directory:
```bash
cd d:/SalonFinder/server
npm run dev
```
The server will start at [http://localhost:5000](http://localhost:5000) with watch reload enabled.

### Start Frontend Dev Server
In the root directory:
```bash
cd d:/SalonFinder
npm run dev
```
Vite will start the client at [http://localhost:5173](http://localhost:5173). Open this URL in your web browser.

---

## 4. Running Backend Tests

We have included test scripts to verify backend integrations:
1. **Fuzzy Search Integration (Live OSM)**:
   ```bash
   cd d:/SalonFinder
   node server/test-search.js
   ```
2. **Mock Dual-Provider Merge Test (OSM + TomTom)**:
   This simulates TomTom responses to test geolocated merging, name similarity checks, and phone formatting:
   ```bash
   cd d:/SalonFinder
   node server/test-tomtom-mock.js
   ```

---

## 5. Deployment Guide

### A. Backend Deployment (Render or Vercel)
You can host the Node.js Express server on Render (Free Web Service tier) or Vercel (using serverless functions).

#### Deploying on Render:
1. Create a free account on [Render](https://render.com).
2. Create a new **Web Service** and connect your GitHub repository.
3. Configure the settings:
   - **Root Directory**: `server`
   - **Build Command**: `npm install`
   - **Start Command**: `node server.js`
4. In **Environment Variables**, add:
   - `PORT` = `10000` (Render's default)
   - `CORS_ORIGIN` = `https://your-frontend-deployment.vercel.app`
   - `TOMTOM_API_KEY` = `your_copied_api_key_from_tomtom`

### B. Frontend Deployment (Vercel or Netlify)
You can deploy the Vite React frontend on Vercel's free tier.

#### Deploying on Vercel:
1. Install Vercel CLI or connect GitHub in the Vercel Dashboard.
2. Configure project:
   - **Framework Preset**: `Vite`
   - **Root Directory**: `./` (Root of the workspace)
   - **Build Command**: `npm run build`
   - **Output Directory**: `dist`
3. Deploy and configure the backend CORS URLs accordingly.
