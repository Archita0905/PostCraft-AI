# PostCraft AI 

Full source of PostCraft AI: React frontend, FastAPI backend, MongoDB drafts and the
Gemini AI integration. Secret keys are NOT included; add your own in `backend/.env`.

## Folder map
- `frontend/` — React 19 + Vite + Tailwind app (main UI in `src/pages/Home.tsx`)
- `backend/` — FastAPI API (`server.py`, routers in `routers/`, Gemini adapter in `services/llm.py`)
- `html-version/` — standalone index.html / styles.css / script.js copy of the UI
- (saved drafts are not included in this repository)
- `memory/SPEC.md` — product spec (features, data model, flows)

## Requirements
Python 3.11+, Node 20+ with Yarn, MongoDB (local, or a free MongoDB Atlas cluster),
and a Google Gemini API key (https://aistudio.google.com/apikey).

## 1. Backend
```bash
cd backend
python -m venv .venv && source .venv/bin/activate      # Windows: .venv\Scripts\activate
pip install -r requirements.txt --extra-index-url https://d33sy5i8bnduwe.cloudfront.net/simple/
cp .env.example .env        # then edit .env: MONGO_URL, DB_NAME, LLM_API_KEY (your Gemini key)
uvicorn server:app --host 0.0.0.0 --port 8001 --reload
```
Check: http://localhost:8001/api/ should return `{"message": "PostCraft AI API", ...}`.

## 2. Frontend
```bash
cd frontend
yarn install
yarn dev            # http://localhost:3000 (calls /api, proxied to :8001)
```
Production build: `yarn build`, then serve `frontend/dist/` behind the same origin as the API.

## 3. Push to your own GitHub (free)
```bash
git init && git add . && git commit -m "PostCraft AI source"
git branch -M main
git remote add origin https://github.com/<your-username>/postcraft-ai.git
git push -u origin main
```
Or on github.com: create a new repository, then "uploading an existing file" and drag the
unzipped folder in. `.env` is not included and is listed in `.gitignore`; never commit real keys.

## Switching AI provider
The model is read from `LLM_MODEL`, the key from `LLM_API_KEY` (falls back to `EMERGENT_LLM_KEY`).
To use another provider, add a class implementing `TextProvider.complete()` in
`backend/services/llm.py` and return it from `get_text_provider()`; routes do not change.
