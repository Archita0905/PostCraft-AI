import { Hono } from "hono";
import { GoogleGenAI, Type } from "@google/genai";
import { and, desc, eq } from "drizzle-orm";
import { db } from "../../db/index.ts";
import { drafts, type Quality } from "../../db/schema.ts";

const MODEL = "gemini-3-flash-preview";
const ai = new GoogleGenAI({});

const app = new Hono().basePath("/api");

/* ---------- helpers ---------- */

const str = (v: unknown, max = 5000) => (typeof v === "string" ? v.slice(0, max).trim() : "");

function sessionOf(c: { req: { header: (k: string) => string | undefined } }) {
  const id = c.req.header("X-Session-ID") ?? "";
  return /^[A-Za-z0-9-]{8,64}$/.test(id) ? id : null;
}

const LENGTH_GUIDE: Record<string, string> = {
  Short: "roughly 60-120 words",
  Medium: "roughly 150-250 words",
  Long: "roughly 300-450 words",
};

const RESULT_SCHEMA = {
  type: Type.OBJECT,
  properties: {
    post: { type: Type.STRING, description: "The LinkedIn post body, plain text with line breaks, no hashtags." },
    hashtags: { type: Type.ARRAY, items: { type: Type.STRING }, description: "3-6 relevant hashtags, each starting with #." },
    quality: {
      type: Type.OBJECT,
      properties: {
        hook_score: { type: Type.INTEGER, description: "0-100: how strongly the first line earns attention." },
        readability: { type: Type.STRING, description: "Short label such as 'Easy', 'Grade 7' or 'Dense'." },
        scannability: { type: Type.INTEGER, description: "0-100: how easy the post is to skim on mobile." },
        feedback: { type: Type.STRING, description: "One or two sentences of concrete editorial advice." },
      },
      required: ["hook_score", "readability", "scannability", "feedback"],
    },
  },
  required: ["post", "hashtags", "quality"],
};

const SYSTEM = `You are PostCraft AI, an expert LinkedIn ghostwriter and editor.
Write original, specific, human-sounding posts. Use short paragraphs and line breaks for mobile reading.
No markdown formatting (no **bold**, no headings). Keep hashtags out of the post body; return them separately.
Always also return an honest quality audit of the final post.`;

type Result = { post: string; hashtags: string[]; quality: Quality };

async function runModel(prompt: string): Promise<Result> {
  const response = await ai.models.generateContent({
    model: MODEL,
    contents: prompt,
    config: {
      systemInstruction: SYSTEM,
      responseMimeType: "application/json",
      responseSchema: RESULT_SCHEMA,
    },
  });
  const data = JSON.parse(response.text ?? "{}");
  const clamp = (n: unknown) => Math.max(0, Math.min(100, Math.round(Number(n) || 0)));
  return {
    post: String(data.post ?? "").trim(),
    hashtags: (Array.isArray(data.hashtags) ? data.hashtags : [])
      .map((h: unknown) => String(h).trim().replace(/\s+/g, ""))
      .filter(Boolean)
      .map((h: string) => (h.startsWith("#") ? h : `#${h}`))
      .slice(0, 8),
    quality: {
      hook_score: clamp(data.quality?.hook_score),
      readability: String(data.quality?.readability ?? "—"),
      scannability: clamp(data.quality?.scannability),
      feedback: String(data.quality?.feedback ?? ""),
    },
  };
}

function prefs(b: Record<string, unknown>) {
  const length = str(b.length, 20) || "Medium";
  return [
    `Category: ${str(b.category, 80) || "Personal Branding"}`,
    `Tone: ${str(b.tone, 80) || "Professional"}`,
    `Length: ${length} (${LENGTH_GUIDE[length] ?? LENGTH_GUIDE.Medium})`,
    `Language: write the post in ${str(b.language, 40) || "English"}`,
  ].join("\n");
}

const OPS: Record<string, string> = {
  regenerate: "Write a completely fresh version of this post on the same idea, with a different angle and hook.",
  rewrite: "Rewrite this post to be clearer and more compelling while keeping its core message.",
  shorten: "Make this post noticeably shorter and tighter while keeping the key point.",
  expand: "Expand this post with more depth, a concrete example and a stronger takeaway.",
  hook: "Rewrite only the opening line(s) to create a much stronger hook; keep the rest essentially the same.",
  grammar: "Fix grammar, spelling and punctuation only. Do not change the meaning, tone or structure.",
  hashtags: "Return the post text exactly unchanged. Only generate fresh, relevant hashtags.",
  quality: "Return the post text exactly unchanged. Focus on an honest, specific quality audit.",
};

/* ---------- routes ---------- */

app.get("/", (c) => c.json({ message: "PostCraft AI API", model: MODEL }));

app.post("/ai/generate", async (c) => {
  const b = (await c.req.json().catch(() => ({}))) as Record<string, unknown>;
  const topic = str(b.topic);
  if (topic.length < 3) return c.json({ detail: "Topic is too short" }, 422);
  const extras = [
    str(b.keywords, 500) && `Keywords to include naturally: ${str(b.keywords, 500)}`,
    str(b.target_audience, 300) && `Target audience: ${str(b.target_audience, 300)}`,
    str(b.call_to_action, 300) && `End with this call to action: ${str(b.call_to_action, 300)}`,
  ].filter(Boolean);
  try {
    return c.json(
      await runModel(`Write a LinkedIn post from this rough idea:\n"""${topic}"""\n\n${prefs(b)}\n${extras.join("\n")}`),
    );
  } catch (err) {
    console.error("generate failed", err);
    return c.json({ detail: "AI generation failed" }, 502);
  }
});

app.post("/ai/transform", async (c) => {
  const b = (await c.req.json().catch(() => ({}))) as Record<string, unknown>;
  const post = str(b.post, 10000);
  const op = str(b.operation, 30);
  if (!post) return c.json({ detail: "Post is empty" }, 422);
  if (!OPS[op]) return c.json({ detail: "Unknown operation" }, 422);
  try {
    const result = await runModel(`${OPS[op]}\n\n${prefs(b)}\n\nCurrent post:\n"""${post}"""`);
    if (op === "hashtags" || op === "quality") result.post = post;
    return c.json(result);
  } catch (err) {
    console.error("transform failed", err);
    return c.json({ detail: "AI transform failed" }, 502);
  }
});

const toJson = (d: typeof drafts.$inferSelect) => ({
  id: d.id,
  title: d.title,
  content: d.content,
  category: d.category,
  tone: d.tone,
  length: d.length,
  language: d.language,
  hashtags: d.hashtags,
  quality: d.quality,
  created_at: d.createdAt.toISOString(),
  updated_at: d.updatedAt.toISOString(),
});

function draftFields(b: Record<string, unknown>) {
  return {
    title: str(b.title, 200) || "Untitled post",
    content: str(b.content, 20000),
    category: str(b.category, 80) || "Personal Branding",
    tone: str(b.tone, 80) || "Professional",
    length: str(b.length, 20) || "Medium",
    language: str(b.language, 40) || "English",
    hashtags: Array.isArray(b.hashtags) ? b.hashtags.map((h) => String(h).slice(0, 80)).slice(0, 20) : [],
    quality: b.quality && typeof b.quality === "object" ? (b.quality as Quality) : null,
  };
}

app.get("/drafts", async (c) => {
  const sid = sessionOf(c);
  if (!sid) return c.json({ detail: "Missing session" }, 400);
  const rows = await db.select().from(drafts).where(eq(drafts.sessionId, sid)).orderBy(desc(drafts.updatedAt));
  return c.json(rows.map(toJson));
});

app.post("/drafts", async (c) => {
  const sid = sessionOf(c);
  if (!sid) return c.json({ detail: "Missing session" }, 400);
  const fields = draftFields(await c.req.json().catch(() => ({})));
  if (!fields.content) return c.json({ detail: "Content is empty" }, 422);
  const [row] = await db
    .insert(drafts)
    .values({ id: crypto.randomUUID(), sessionId: sid, ...fields })
    .returning();
  return c.json(toJson(row), 201);
});

app.put("/drafts/:id", async (c) => {
  const sid = sessionOf(c);
  if (!sid) return c.json({ detail: "Missing session" }, 400);
  const fields = draftFields(await c.req.json().catch(() => ({})));
  if (!fields.content) return c.json({ detail: "Content is empty" }, 422);
  const [row] = await db
    .update(drafts)
    .set({ ...fields, updatedAt: new Date() })
    .where(and(eq(drafts.id, c.req.param("id")), eq(drafts.sessionId, sid)))
    .returning();
  return row ? c.json(toJson(row)) : c.json({ detail: "Draft not found" }, 404);
});

app.delete("/drafts/:id", async (c) => {
  const sid = sessionOf(c);
  if (!sid) return c.json({ detail: "Missing session" }, 400);
  const [row] = await db
    .delete(drafts)
    .where(and(eq(drafts.id, c.req.param("id")), eq(drafts.sessionId, sid)))
    .returning({ id: drafts.id });
  return row ? c.body(null, 204) : c.json({ detail: "Draft not found" }, 404);
});

export const config = { path: "/api/*" };

export default app;
