# PostCraft AI living spec

## Product
PostCraft AI is a premium SaaS-style LinkedIn post generator. The workspace accepts a rough idea, category, tone, length, language, keywords, target audience, and CTA; it calls the configured Gemini model to generate an original post and then supports AI refinement, editing, live LinkedIn preview, copy, download, quality audit, and draft persistence.

## Data model
- `PostResult`: `post`, `hashtags`, and `quality` (`hook_score`, `readability`, `scannability`, `feedback`)
- `Draft`: string UUID, title, content, generation preferences, hashtags, optional quality report, created/updated timestamps, and private `session_id`

## Key flows
1. User enters a brief and generates a post through `/api/ai/generate`.
2. User edits the text and uses `/api/ai/transform` for regenerate, rewrite, shorten, expand, hook, grammar, hashtags, or quality actions.
3. User saves, opens, updates, and deletes drafts through `/api/drafts`.
4. The frontend creates one anonymous browser session ID in localStorage and sends it as `X-Session-ID`; every draft query is scoped to it.

## Auth and roles
No login is implemented. Anonymous browser sessions isolate draft access by a server-filtered session header. The LLM API key is server-side only.

## Integration
Gemini uses the modular provider boundary in `backend/services/llm.py`, configured by `LLM_MODEL` and a managed `EMERGENT_LLM_KEY` fallback. No mock or dummy generation path is used.

## Standalone HTML version
`/app/html-version/` (index.html, styles.css, script.js) is a vanilla-JS copy of the same UI, separate from the React app. It calls the same backend with absolute URLs (default `https://postcraft-ai-22.emergent.host/api`; override with `index.html?api=<base>/api`, `?api=reset` to clear). styles.css is the compiled Tailwind build with fonts loaded from Google Fonts. Drafts are scoped by its own localStorage session id, so they are separate from drafts made in the React app.