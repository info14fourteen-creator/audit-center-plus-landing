const CHAT_ENDPOINT = window.ACP_CHAT_ENDPOINT || "";
const LEAD_EMAIL = "levchenkovairina@gmail.com";
const operatorNames = ["Анна", "Мария", "Екатерина", "Ольга", "Наталья", "Светлана"];

const chatState = {
  operator: operatorNames[Math.floor(Math.random() * operatorNames.length)],
  topic: "",
  name: "",
  phone: "",
  email: "",
  messages: 0,
  history: [],
  pendingUserTexts: [],
  responseTimer: null,
  responseSeq: 0,
  abortController: null,
  lockedScrollY: 0,
};

const knowledgeBase = [
  {
    title: "Аудит и внутренний контроль",
    tags: ["аудит", "контроль", "процесс", "проверка", "учет", "отчетность", "фсбу", "пбу"],
    answer:
      "По аудиту смотрим не только отчетность, но и то, как операция проходит через бизнес: договор, платеж, учет, контроль и управленческий вывод. На выходе обычно получается реестр находок, оценка критичности, корректировки и понятная дорожная карта.",
  },
  {
    title: "Матрица рисков",
    tags: ["риски", "матрица", "риск", "heat", "kri", "coso", "iso", "свк"],
    answer:
      "Матрица рисков помогает отделить действительно опасные зоны от фонового шума. Риски оцениваются по вероятности и последствиям, собираются в heat map, затем по ключевым угрозам назначаются меры, владельцы, сроки и индикаторы KRI.",
  },
  {
    title: "Финансовое моделирование",
    tags: ["модель", "финмодель", "excel", "npv", "irr", "wacc", "dcf", "инвестор", "банк", "capex", "кредит"],
    answer:
      "Для банка или инвестора нужна не просто таблица прогноза, а модель, которую можно защитить вопросами. Обычно собираем three-statement model на 3-5 лет, драйверы выручки и затрат, сценарии, DCF, NPV, IRR, WACC, долг, ковенанты и потребность в финансировании.",
  },
  {
    title: "Финансовый анализ",
    tags: ["анализ", "ликвидность", "долг", "маржа", "затраты", "денежный", "ebitda", "оборотный"],
    answer:
      "Финансовый анализ отвечает на управленческие вопросы: где зарабатываем, где теряем маржу, почему растет долг и выдержит ли компания стресс. Смотрим ликвидность, устойчивость, рентабельность, оборачиваемость, денежный поток и качество прибыли.",
  },
  {
    title: "Оптимизация затрат",
    tags: ["экономия", "оптимизация", "затраты", "закупки", "dso", "dpo", "dio", "ccc", "налоги"],
    answer:
      "Оптимизация должна заканчиваться не красивым отчетом, а планом с эффектом в рублях. Обычно смотрим структуру затрат, закупки, оборотный капитал, DSO/DPO/DIO, платежный календарь, долговую нагрузку и законные налоговые возможности.",
  },
  {
    title: "Форматы работы",
    tags: ["формат", "срок", "стоимость", "проект", "абонент", "сопровождение", "этапы", "nda"],
    answer:
      "Начать можно с разового проекта, абонентского сопровождения или роли внешнего эксперта в проектной команде. Стандартно сначала уточняем задачу, затем фиксируем КП, договор и NDA, собираем данные, проводим диагностику и презентуем выводы.",
  },
  {
    title: "Контакты",
    tags: ["контакт", "телефон", "почта", "telegram", "телеграм", "ирина"],
    answer:
      "Для консультации можно связаться с Ириной Левченковой: телефон +7 968 353-65-70, e-mail levchenkovairina@gmail.com, Telegram @LevchenkovaIrina.",
  },
];

function initIcons() {
  if (window.lucide) {
    window.lucide.createIcons();
  }
}

function setHeaderState() {
  const header = document.querySelector("[data-header]");
  if (!header) return;
  header.classList.toggle("is-scrolled", window.scrollY > 12);
}

function initMenu() {
  const toggle = document.querySelector("[data-menu-toggle]");
  const header = document.querySelector("[data-header]");
  const menu = document.querySelector("[data-mobile-menu]");
  if (!toggle || !menu || !header) return;

  toggle.addEventListener("click", () => {
    document.body.classList.toggle("menu-open");
    header.classList.toggle("is-open", document.body.classList.contains("menu-open"));
  });

  menu.querySelectorAll("a").forEach((link) => {
    link.addEventListener("click", () => {
      document.body.classList.remove("menu-open");
      header.classList.remove("is-open");
    });
  });
}

function initLeadForm() {
  const form = document.querySelector("[data-lead-form]");
  const status = document.querySelector("[data-form-status]");
  if (!form || !status) return;

  form.addEventListener("submit", (event) => {
    event.preventDefault();
    const formData = new FormData(form);
    const name = String(formData.get("name") || "").trim();
    const contact = String(formData.get("contact") || "").trim();
    const message = String(formData.get("message") || "").trim();
    const subject = encodeURIComponent(`Заявка с лендинга: ${name}`);
    const body = encodeURIComponent(`Имя: ${name}\nКонтакт: ${contact}\n\nЗадача:\n${message}`);
    status.textContent = "Заявка подготовлена в почтовом клиенте.";
    window.location.href = `mailto:${LEAD_EMAIL}?subject=${subject}&body=${body}`;
  });
}

function setCookie(name, value, days = 180) {
  const expires = new Date(Date.now() + days * 864e5).toUTCString();
  document.cookie = `${name}=${encodeURIComponent(value)}; expires=${expires}; path=/; SameSite=Lax`;
}

function getCookie(name) {
  return document.cookie
    .split("; ")
    .find((row) => row.startsWith(`${name}=`))
    ?.split("=")[1];
}

function hasCookieConsent() {
  return getCookie("acp_cookie_consent") === "accepted";
}

function initCookieBanner() {
  const banner = document.querySelector("[data-cookie-banner]");
  const accept = document.querySelector("[data-cookie-accept]");
  const decline = document.querySelector("[data-cookie-decline]");
  if (!banner || !accept || !decline) return;

  if (!getCookie("acp_cookie_consent")) {
    banner.classList.add("is-visible");
  }

  accept.addEventListener("click", () => {
    setCookie("acp_cookie_consent", "accepted");
    setCookie("acp_session", crypto.randomUUID ? crypto.randomUUID() : String(Date.now()));
    setCookie("acp_referrer", document.referrer || "direct");
    setCookie("acp_landing", location.pathname);
    banner.classList.remove("is-visible");
    persistLeadState();
  });

  decline.addEventListener("click", () => {
    setCookie("acp_cookie_consent", "necessary", 30);
    banner.classList.remove("is-visible");
  });
}

function randomDelay(min = 900, max = 2600) {
  return Math.round(min + Math.random() * (max - min));
}

function isSmallScreen() {
  return window.matchMedia("(max-width: 700px)").matches;
}

function updateChatViewport() {
  const viewport = window.visualViewport;
  const height = viewport?.height || window.innerHeight;
  const top = viewport?.offsetTop || 0;
  document.documentElement.style.setProperty("--chat-viewport-height", `${Math.round(height)}px`);
  document.documentElement.style.setProperty("--chat-viewport-top", `${Math.round(top)}px`);
}

function scrollChatToBottom(messages) {
  requestAnimationFrame(() => {
    messages.scrollTop = messages.scrollHeight;
  });
}

function lockPageScroll() {
  if (!isSmallScreen()) return;
  chatState.lockedScrollY = window.scrollY;
  document.body.style.position = "fixed";
  document.body.style.top = `-${chatState.lockedScrollY}px`;
  document.body.style.left = "0";
  document.body.style.right = "0";
  document.body.style.width = "100%";
}

function unlockPageScroll() {
  if (!document.body.style.position) return;
  const scrollY = chatState.lockedScrollY || Math.abs(parseInt(document.body.style.top || "0", 10)) || 0;
  document.body.style.position = "";
  document.body.style.top = "";
  document.body.style.left = "";
  document.body.style.right = "";
  document.body.style.width = "";
  window.scrollTo(0, scrollY);
}

function openChat(form, messages) {
  updateChatViewport();
  lockPageScroll();
  document.body.classList.add("chat-open");
  scrollChatToBottom(messages);
  if (!isSmallScreen()) {
    form.elements.question.focus();
  }
}

function closeChat() {
  document.body.classList.remove("chat-open");
  unlockPageScroll();
}

function scoreQuestion(question, item) {
  const normalized = question.toLowerCase();
  return item.tags.reduce((score, tag) => {
    return normalized.includes(tag) ? score + 1 : score;
  }, 0);
}

function collectLeadFields(text) {
  const email = text.match(/[A-Z0-9._%+-]+@[A-Z0-9.-]+\.[A-Z]{2,}/i)?.[0];
  const phone = text.match(/(?:\+?\d[\s\-()]*){10,}/)?.[0];
  const telegram = text.match(/@[A-Z0-9_]{4,}/i)?.[0];
  const nameMatch = text.match(/(?:меня зовут|имя|я)\s+([А-ЯA-Z][а-яa-zё-]{2,})/i);

  if (email) chatState.email = email;
  if (phone) chatState.phone = phone.replace(/[^\d+]/g, "");
  if (telegram && !chatState.phone) chatState.phone = telegram;
  if (nameMatch && !chatState.name) chatState.name = nameMatch[1];
  persistLeadState();
}

function persistLeadState() {
  if (!hasCookieConsent()) return;
  localStorage.setItem(
    "acp_chat_lead",
    JSON.stringify({
      operator: chatState.operator,
      topic: chatState.topic,
      name: chatState.name,
      phone: chatState.phone,
      email: chatState.email,
      messages: chatState.messages,
    })
  );
}

function localChatAnswer(question) {
  chatState.messages += 1;
  collectLeadFields(question);

  const ranked = knowledgeBase
    .map((item) => ({ ...item, score: scoreQuestion(question, item) }))
    .sort((a, b) => b.score - a.score);
  const best = ranked[0];
  if (best && best.score > 0) {
    chatState.topic = best.title;
  }

  if (!best || best.score === 0) {
    return withSalesStep(
      "Смотрите, здесь важно сначала понять цель: снизить риск перед проверкой, подготовить отчетность для банка/инвестора или найти, где проседают деньги. От этого зависит, начинать с аудита, финмодели или финансовой диагностики."
    );
  }

  return withSalesStep(best.answer);
}

function withSalesStep(answer) {
  if (!chatState.email) {
    return `${answer}\n\nЧтобы я не советовала вслепую: какая сейчас ситуация и срок? И могу отправить на e-mail короткую заготовку списка документов для первичной диагностики. На какую почту удобно?`;
  }

  if (!chatState.phone) {
    return `${answer}\n\nПочту записала: ${chatState.email}. Для такой задачи обычно быстрее один короткий созвон, чем длинная переписка. Оставьте, пожалуйста, телефон или Telegram, чтобы Ирина могла уточнить контекст.`;
  }

  return `${answer}\n\nОтлично, контакты есть. Я бы передала Ирине такую заявку: тема — ${chatState.topic || "диагностика бизнеса"}, e-mail — ${chatState.email}, контакт — ${chatState.phone}. Она сможет написать и отправить заготовку списка документов для старта.`;
}

function appendMessage(container, text, type = "bot") {
  const message = document.createElement("div");
  message.className = `message ${type}`;
  message.textContent = text;
  container.append(message);
  scrollChatToBottom(container);
  return message;
}

function showTyping(container) {
  removeTyping(container);
  const typing = document.createElement("div");
  typing.className = "message typing";
  typing.dataset.typing = "true";
  typing.innerHTML = "<span></span><span></span><span></span>";
  container.append(typing);
  scrollChatToBottom(container);
}

function removeTyping(container) {
  container.querySelectorAll("[data-typing]").forEach((item) => item.remove());
}

async function getChatAnswer(question, signal) {
  if (!CHAT_ENDPOINT) {
    return localChatAnswer(question);
  }

  const response = await fetch(CHAT_ENDPOINT, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    signal,
    body: JSON.stringify({
      question,
      history: chatState.history.slice(-12),
      lead: {
        name: chatState.name,
        phone: chatState.phone,
        email: chatState.email,
        topic: chatState.topic,
      },
    }),
  });

  if (!response.ok) {
    throw new Error("Chat endpoint failed");
  }

  const data = await response.json();
  if (data.lead) {
    chatState.name = data.lead.name || chatState.name;
    chatState.phone = data.lead.phone || chatState.phone;
    chatState.email = data.lead.email || chatState.email;
    chatState.topic = data.lead.topic || chatState.topic;
    persistLeadState();
  }
  return data.answer || localChatAnswer(question);
}

function scheduleAssistantReply(messages) {
  clearTimeout(chatState.responseTimer);
  if (chatState.abortController) {
    chatState.abortController.abort();
  }

  const container = messages;
  const seq = chatState.responseSeq + 1;
  chatState.responseSeq = seq;
  chatState.abortController = new AbortController();
  showTyping(container);

  chatState.responseTimer = setTimeout(async () => {
    const combinedQuestion = chatState.pendingUserTexts.join("\n");
    chatState.pendingUserTexts = [];

    try {
      const answer = await getChatAnswer(combinedQuestion, chatState.abortController.signal);
      if (seq !== chatState.responseSeq) return;
      removeTyping(container);
      appendMessage(container, answer);
      chatState.history.push({ role: "assistant", content: answer });
      persistLeadState();
    } catch (error) {
      if (error.name === "AbortError") return;
      if (seq !== chatState.responseSeq) return;
      removeTyping(container);
      const fallback = localChatAnswer(combinedQuestion);
      appendMessage(container, fallback);
      chatState.history.push({ role: "assistant", content: fallback });
    }
  }, randomDelay());
}

function initChat() {
  const launcher = document.querySelector("[data-chat-launcher]");
  const close = document.querySelector("[data-chat-close]");
  const form = document.querySelector("[data-chat-form]");
  const messages = document.querySelector("[data-chat-messages]");
  const operatorName = document.querySelector("[data-operator-name]");
  if (!launcher || !close || !form || !messages) return;
  if (operatorName) operatorName.textContent = chatState.operator;

  const greeting = `Здравствуйте, меня зовут ${chatState.operator}. Помогу понять, что подойдет: аудит, матрица рисков, финмодель или финансовый анализ. Расскажите, что сейчас нужно бизнесу?`;
  appendMessage(messages, greeting);
  chatState.history.push({ role: "assistant", content: greeting });

  launcher.addEventListener("click", () => {
    openChat(form, messages);
  });

  close.addEventListener("click", () => {
    closeChat();
  });

  form.elements.question.addEventListener("focus", () => {
    updateChatViewport();
    scrollChatToBottom(messages);
  });

  form.elements.question.addEventListener("input", () => {
    updateChatViewport();
    scrollChatToBottom(messages);
  });

  form.addEventListener("submit", (event) => {
    event.preventDefault();
    const input = form.elements.question;
    const question = input.value.trim();
    if (!question) return;

    appendMessage(messages, question, "user");
    chatState.history.push({ role: "user", content: question });
    chatState.pendingUserTexts.push(question);
    collectLeadFields(question);
    input.value = "";
    scheduleAssistantReply(messages);
  });
}

document.addEventListener("DOMContentLoaded", () => {
  initIcons();
  initMenu();
  initLeadForm();
  initCookieBanner();
  initChat();
  setHeaderState();
});

window.addEventListener("scroll", setHeaderState, { passive: true });
window.addEventListener("resize", updateChatViewport, { passive: true });
if (window.visualViewport) {
  window.visualViewport.addEventListener("resize", () => {
    if (document.body.classList.contains("chat-open")) {
      updateChatViewport();
      const messages = document.querySelector("[data-chat-messages]");
      if (messages) scrollChatToBottom(messages);
    }
  });
  window.visualViewport.addEventListener("scroll", () => {
    if (document.body.classList.contains("chat-open")) {
      updateChatViewport();
    }
  });
}
