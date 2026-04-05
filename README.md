# SplitMint

SplitMint is a full-stack group expense tracker that helps teams split bills, manage group spending, and settle balances.

## Features

- Email/password authentication
- Group creation and membership management
- Expense tracking with equal, custom, and percentage splits
- Balance summaries and settlement suggestions
- AI-assisted natural language expense parsing

## Tech Stack

- Frontend: Next.js, React, Tailwind CSS
- Backend: FastAPI, SQLAlchemy, Pydantic
- Database: PostgreSQL
- AI: Google Gemini (optional)

## Repository Structure

- `backend/` — FastAPI server, API routes, models, schemas, auth
- `frontend/` — Next.js app, dashboard pages, forms, charts
- `.gitignore` — Ignored files for Node, Python, and editor artifacts
- `README.md` — Project overview and deployment guide

## Local Development

### Backend

1. Open a terminal and navigate to `backend`
2. Install Python dependencies:
   ```bash
   pip install -r requirements.txt
   ```
3. Add environment variables in `backend/.env`:
   ```env
   DATABASE_URL=postgresql://user:password@localhost:5432/splitmint
   SECRET_KEY=your_secret_key
   ALGORITHM=HS256
   ACCESS_TOKEN_EXPIRE_MINUTES=30
   GEMINI_API_KEY=your_gemini_api_key
   SUPABASE_URL=your_supabase_url
   SUPABASE_KEY=your_supabase_key
   ```
4. Start the backend:
   ```bash
   uvicorn app.main:app --reload --host 0.0.0.0 --port 8000
   ```

### Frontend

1. Open another terminal and navigate to `frontend`
2. Install Node dependencies:
   ```bash
   npm install
   ```
3. Add frontend env vars in `frontend/.env.local`:
   ```env
   NEXT_PUBLIC_API_URL=http://localhost:8000
   NEXT_PUBLIC_SUPABASE_URL=your_supabase_url
   NEXT_PUBLIC_SUPABASE_ANON_KEY=your_supabase_anon_key
   ```
4. Start the frontend:
   ```bash
   npm run dev
   ```
5. Open the app at `http://localhost:3000`

## Render Deployment (Backend)

To deploy the FastAPI backend on Render:

1. Create a new Web Service on Render.
2. Connect your GitHub repository.
3. Set the publish directory to `backend`.
4. Use these commands:
   - Build command: `pip install -r requirements.txt`
   - Start command: `uvicorn app.main:app --host 0.0.0.0 --port $PORT`
5. Add required environment variables in Render:
   - `DATABASE_URL`
   - `SECRET_KEY`
   - `ALGORITHM=HS256`
   - `ACCESS_TOKEN_EXPIRE_MINUTES=30`
   - `GEMINI_API_KEY`
   - `SUPABASE_URL`
   - `SUPABASE_KEY`
6. Ensure your PostgreSQL database is accessible from Render.

> If you plan to host the frontend separately, set `NEXT_PUBLIC_API_URL` to the deployed backend URL.

## Rendering Frontend

For frontend deployment you can use Vercel or Render's static site hosting.

- Build command: `npm run build`
- Publish directory: `frontend/.next`
- Set `NEXT_PUBLIC_API_URL` to your deployed backend URL

## Environment Variables Summary

### Backend

- `DATABASE_URL`
- `SECRET_KEY`
- `ALGORITHM`
- `ACCESS_TOKEN_EXPIRE_MINUTES`
- `GEMINI_API_KEY`
- `SUPABASE_URL`
- `SUPABASE_KEY`

### Frontend

- `NEXT_PUBLIC_API_URL`
- `NEXT_PUBLIC_SUPABASE_URL`
- `NEXT_PUBLIC_SUPABASE_ANON_KEY`

## API Docs

When the backend is running, visit:

- `http://localhost:8000/docs`

## Notes

- Keep `.env` and `.env.local` out of version control.
- Use the Render dashboard to configure secrets and environment variables.
- If your backend is live at a different address, update `NEXT_PUBLIC_API_URL` before deploying the frontend.
