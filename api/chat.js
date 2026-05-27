const ASSISTANT_ID = process.env.OPENAI_ASSISTANT_ID || "asst_7Jbm61vLl63GVnOhQwZw6G8J";
const OPENAI_API_KEY = process.env.OPENAI_API_KEY;

function setCors(res) {
  res.setHeader("Access-Control-Allow-Origin", process.env.ALLOWED_ORIGIN || "*");
  res.setHeader("Access-Control-Allow-Methods", "POST, OPTIONS");
  res.setHeader("Access-Control-Allow-Headers", "Content-Type");
}

async function readJson(response, label) {
  const text = await response.text();
  const data = text ? JSON.parse(text) : {};
  if (!response.ok) {
    throw new Error(`${label}: ${data.error?.message || data.message || text}`);
  }
  return data;
}

async function openai(path, options = {}) {
  return readJson(
    await fetch(`https://api.openai.com/v1${path}`, {
      ...options,
      headers: {
        Authorization: `Bearer ${OPENAI_API_KEY}`,
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

module.exports = async function handler(req, res) {
  setCors(res);
  if (req.method === "OPTIONS") {
    res.status(204).end();
    return;
  }
  if (req.method !== "POST") {
    res.status(405).json({ error: "Method not allowed" });
    return;
  }
  if (!OPENAI_API_KEY) {
    res.status(500).json({ error: "OPENAI_API_KEY is not configured" });
    return;
  }

  try {
    const body = typeof req.body === "string" ? JSON.parse(req.body) : req.body || {};
    const messages = normalizeMessages(body.history, body.question);
    const lead = extractLead(messages, body.lead || {});

    const thread = await openai("/threads", {
      method: "POST",
      body: JSON.stringify({ messages }),
    });

    let run = await openai(`/threads/${thread.id}/runs`, {
      method: "POST",
      body: JSON.stringify({
        assistant_id: ASSISTANT_ID,
        additional_instructions:
          "Отвечай только по-русски. Если клиент написал несколько сообщений подряд, рассмотри их как один общий контекст и не отвечай на каждое отдельно. Не называй себя ИИ.",
      }),
    });

    for (let attempt = 0; attempt < 28 && ["queued", "in_progress", "cancelling"].includes(run.status); attempt += 1) {
      await new Promise((resolve) => setTimeout(resolve, 900));
      run = await openai(`/threads/${thread.id}/runs/${run.id}`);
    }

    if (run.status !== "completed") {
      throw new Error(`Assistant run status: ${run.status}`);
    }

    const list = await openai(`/threads/${thread.id}/messages?limit=1&order=desc`);
    const answer = list.data?.[0]?.content?.[0]?.text?.value || "";
    res.status(200).json({ answer, lead });
  } catch (error) {
    res.status(500).json({ error: error.message || "Chat failed" });
  }
};
