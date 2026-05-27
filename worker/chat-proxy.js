const ASSISTANT_ID = "asst_7Jbm61vLl63GVnOhQwZw6G8J";

function corsHeaders(origin, env) {
  const allowedOrigin = env.ALLOWED_ORIGIN || "*";
  const responseOrigin = allowedOrigin === "*" || allowedOrigin === origin ? allowedOrigin : allowedOrigin;
  return {
    "Access-Control-Allow-Origin": responseOrigin,
    "Access-Control-Allow-Methods": "POST, OPTIONS",
    "Access-Control-Allow-Headers": "Content-Type",
    "Vary": "Origin",
  };
}

async function readJson(response, label) {
  const text = await response.text();
  const data = text ? JSON.parse(text) : {};
  if (!response.ok) {
    throw new Error(`${label}: ${data.error?.message || data.message || text}`);
  }
  return data;
}

async function openai(env, path, options = {}) {
  return readJson(
    await fetch(`https://api.openai.com/v1${path}`, {
      ...options,
      headers: {
        Authorization: `Bearer ${env.OPENAI_API_KEY}`,
        "Content-Type": "application/json",
        "OpenAI-Beta": "assistants=v2",
        ...(options.headers || {}),
      },
    }),
    path
  );
}

function normalizeMessages(history = [], question = "") {
  const messages = history
    .filter((item) => item && (item.role === "user" || item.role === "assistant") && item.content)
    .slice(-12)
    .map((item) => ({ role: item.role, content: String(item.content).slice(0, 3000) }));
  const latest = String(question || "").trim();
  if (latest && messages[messages.length - 1]?.content !== latest) {
    messages.push({ role: "user", content: latest.slice(0, 3000) });
  }
  return messages;
}

function extractLead(messages, currentLead = {}) {
  const text = messages.map((item) => item.content).join("\n");
  const email = text.match(/[A-Z0-9._%+-]+@[A-Z0-9.-]+\.[A-Z]{2,}/i)?.[0];
  const phone = text.match(/(?:\+?\d[\s\-()]*){10,}/)?.[0];
  const telegram = text.match(/@[A-Z0-9_]{4,}/i)?.[0];
  return {
    ...currentLead,
    email: email || currentLead.email || "",
    phone: telegram || phone || currentLead.phone || "",
  };
}

function json(data, status, headers) {
  return new Response(JSON.stringify(data), {
    status,
    headers: {
      ...headers,
      "Content-Type": "application/json; charset=utf-8",
    },
  });
}

export default {
  async fetch(request, env) {
    const origin = request.headers.get("Origin") || "";
    const headers = corsHeaders(origin, env);

    if (request.method === "OPTIONS") {
      return new Response(null, { status: 204, headers });
    }

    if (request.method !== "POST") {
      return json({ error: "Method not allowed" }, 405, headers);
    }

    if (!env.OPENAI_API_KEY) {
      return json({ error: "OPENAI_API_KEY is not configured" }, 500, headers);
    }

    try {
      const body = await request.json();
      const messages = normalizeMessages(body.history, body.question);
      const lead = extractLead(messages, body.lead || {});

      const thread = await openai(env, "/threads", {
        method: "POST",
        body: JSON.stringify({ messages }),
      });

      let run = await openai(env, `/threads/${thread.id}/runs`, {
        method: "POST",
        body: JSON.stringify({
          assistant_id: env.OPENAI_ASSISTANT_ID || ASSISTANT_ID,
          additional_instructions:
            "Отвечай только по-русски. Если клиент написал несколько сообщений подряд, рассмотри их как один общий контекст и не отвечай на каждое отдельно. Не называй себя ИИ или AI.",
        }),
      });

      for (let attempt = 0; attempt < 30 && ["queued", "in_progress", "cancelling"].includes(run.status); attempt += 1) {
        await new Promise((resolve) => setTimeout(resolve, 800));
        run = await openai(env, `/threads/${thread.id}/runs/${run.id}`);
      }

      if (run.status !== "completed") {
        throw new Error(`Assistant run status: ${run.status}`);
      }

      const list = await openai(env, `/threads/${thread.id}/messages?limit=1&order=desc`);
      const answer = list.data?.[0]?.content?.[0]?.text?.value || "";
      return json({ answer, lead }, 200, headers);
    } catch (error) {
      return json({ error: error.message || "Chat failed" }, 500, headers);
    }
  },
};
