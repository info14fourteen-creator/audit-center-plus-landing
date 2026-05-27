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
  const textWithoutEmails = text.replace(/[A-Z0-9._%+-]+@[A-Z0-9.-]+\.[A-Z]{2,}/gi, " ");
  const phone = text.match(/(?:\+?\d[\s\-()]*){10,}/)?.[0];
  const telegram = textWithoutEmails.match(/(^|\s)(@[A-Z0-9_]{4,})/i)?.[2];
  return {
    ...currentLead,
    email: email || currentLead.email || "",
    phone: phone || telegram || currentLead.phone || "",
  };
}

function inferTopic(messages, lead = {}) {
  if (lead.topic) return lead.topic;
  const text = messages.map((item) => item.content).join(" ").toLowerCase();
  if (/финмод|модель|банк|инвест|npv|irr|wacc|кредит/.test(text)) return "Финансовое моделирование";
  if (/риск|матриц|свк|контрол|coso|iso/.test(text)) return "Матрица рисков и внутренний контроль";
  if (/аудит|провер|отчет|учет|фсбу|фнс|налог/.test(text)) return "Аудит и проверка отчетности";
  if (/затрат|марж|денеж|ликвид|долг|оборот/.test(text)) return "Финансовый анализ и оптимизация";
  return "Первичная консультация";
}

function shouldNotifyLead(messages, lead = {}, notificationSent = false) {
  if (notificationSent) return false;
  const hasContact = Boolean(lead.email && lead.phone);
  if (!hasContact) return false;
  const userMessages = messages.filter((item) => item.role === "user");
  const text = userMessages.map((item) => item.content).join(" ").toLowerCase();
  const explicitReady = /спасибо|жду|готово|свяжитесь|перезвон|отправьте|можно.*созвон|давайте|оставляю|пишите|звоните/.test(text);
  const hasBusinessContext =
    (Boolean(lead.topic) && lead.topic !== "Первичная консультация") ||
    /аудит|финмод|модель|банк|инвест|риск|свк|контрол|затрат|анализ|налог|отчет/.test(text);
  return explicitReady || (hasBusinessContext && userMessages.length >= 2);
}

function buildLeadSummary(messages, lead, body, answer) {
  const topic = inferTopic(messages, lead);
  const userMessages = messages.filter((item) => item.role === "user").map((item) => item.content);
  const lastUserText = userMessages.slice(-4).join("\n");
  return [
    "Новая заявка с лендинга Аудит Центр Плюс",
    "",
    `Тема: ${topic}`,
    `Имя: ${lead.name || "не указано"}`,
    `E-mail: ${lead.email || "не указан"}`,
    `Телефон/Telegram: ${lead.phone || "не указан"}`,
    `Session: ${body.sessionId || "нет"}`,
    `Страница: ${body.page?.url || "нет"}`,
    body.page?.referrer ? `Источник: ${body.page.referrer}` : "",
    "",
    "Последние сообщения клиента:",
    lastUserText || "нет",
    "",
    "Последний ответ консультанта:",
    answer || "нет",
  ]
    .filter(Boolean)
    .join("\n");
}

async function sendTelegram(env, text) {
  if (!env.TELEGRAM_BOT_TOKEN || !env.TELEGRAM_CHAT_ID) {
    return { configured: false, sent: false, reason: "telegram_not_configured" };
  }

  const response = await fetch(`https://api.telegram.org/bot${env.TELEGRAM_BOT_TOKEN}/sendMessage`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      chat_id: env.TELEGRAM_CHAT_ID,
      text: text.slice(0, 3900),
      disable_web_page_preview: true,
    }),
  });
  const data = await response.json();
  if (!response.ok || !data.ok) {
    throw new Error(`Telegram send failed: ${data.description || response.status}`);
  }
  return { configured: true, sent: true, channel: "telegram" };
}

async function notifyLead(env, messages, lead, body, answer) {
  const ready = shouldNotifyLead(messages, lead, body.notificationSent);
  if (!ready) {
    return {
      ready: false,
      sent: false,
      configured: Boolean(env.TELEGRAM_BOT_TOKEN && env.TELEGRAM_CHAT_ID),
    };
  }

  try {
    const summary = buildLeadSummary(messages, lead, body, answer);
    const result = await sendTelegram(env, summary);
    return { ready: true, ...result };
  } catch (error) {
    return {
      ready: true,
      configured: true,
      sent: false,
      reason: error.message || "telegram_send_failed",
    };
  }
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
      lead.topic = inferTopic(messages, lead);

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
      const handoff = await notifyLead(env, messages, lead, body, answer);
      return json({ answer, lead, handoff, notification: handoff }, 200, headers);
    } catch (error) {
      return json({ error: error.message || "Chat failed" }, 500, headers);
    }
  },
};
