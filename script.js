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
};

const knowledgeBase = [
  {
    title: "Аудит и внутренний контроль",
    tags: ["аудит", "контроль", "процесс", "проверка", "учет", "отчетность", "фсбу", "пбу"],
    answer:
      "По аудиту команда проверяет бизнес-процессы, финансовые потоки, учет и отчетность. В результате клиент получает AS-IS/TO-BE описание процессов, реестр находок, критичность, причины, последствия, корректировки и дорожную карту улучшений.",
  },
  {
    title: "Матрица рисков",
    tags: ["риски", "матрица", "риск", "heat", "kri", "coso", "iso", "свк"],
    answer:
      "Матрица рисков строится по вероятности и тяжести последствий. Обычно формируется risk register, heat map, Top-10 или Top-20 угроз, риск-аппетит, меры митигации, владельцы, KPI, сроки и индикаторы раннего предупреждения KRI.",
  },
  {
    title: "Финансовое моделирование",
    tags: ["модель", "финмодель", "excel", "npv", "irr", "wacc", "dcf", "инвестор", "банк", "capex"],
    answer:
      "Финансовые модели строятся на 3-5 лет в Excel: three-statement model, драйверы выручки и расходов, сценарии Base/Optimistic/Pessimistic/Stress, DCF, NPV, IRR, WACC, долг, ковенанты и funding gap.",
  },
  {
    title: "Финансовый анализ",
    tags: ["анализ", "ликвидность", "долг", "маржа", "затраты", "денежный", "ebitda", "оборотный"],
    answer:
      "Финансовый анализ показывает, где компания зарабатывает, где теряет маржу и насколько устойчива к шокам. В работу входят коэффициенты, DuPont, quality of earnings, FCF, стресс-тесты и dashboard финансового здоровья.",
  },
  {
    title: "Оптимизация затрат",
    tags: ["экономия", "оптимизация", "затраты", "закупки", "dso", "dpo", "dio", "ccc", "налоги"],
    answer:
      "Оптимизация переводит диагностику в денежный эффект: анализ затрат, ABC, закупки, оборотный капитал, DSO/DPO/DIO, платежный календарь, долговой портфель и законная налоговая оптимизация. На выходе план с рублями, сроками и ответственными.",
  },
  {
    title: "Форматы работы",
    tags: ["формат", "срок", "стоимость", "проект", "абонент", "сопровождение", "этапы", "nda"],
    answer:
      "Есть три формата: разовый проект, абонентское сопровождение и роль внешнего эксперта в проектной команде. Стандартный цикл: встреча, КП, договор и NDA, сбор информации, работа, промежуточные обсуждения, финальная презентация и поддержка внедрения.",
  },
  {
    title: "Контакты",
    tags: ["контакт", "телефон", "почта", "telegram", "телеграм", "ирина"],
    answer:
      "Для консультации: Ирина Левченкова, телефон +7 968 353-65-70, e-mail levchenkovairina@gmail.com, Telegram @LevchenkovaIrina.",
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
  });

  decline.addEventListener("click", () => {
    setCookie("acp_cookie_consent", "necessary", 30);
    banner.classList.remove("is-visible");
  });
}

function scoreQuestion(question, item) {
  const normalized = question.toLowerCase();
  return item.tags.reduce((score, tag) => {
    return normalized.includes(tag) ? score + 1 : score;
  }, 0);
}

function localChatAnswer(question) {
  chatState.messages += 1;
  collectLeadFields(question);

  const ranked = knowledgeBase
    .map((item) => ({ ...item, score: scoreQuestion(question, item) }))
    .sort((a, b) => b.score - a.score);
  const best = ranked[0];
  if (best && best.score > 0 && !chatState.topic) {
    chatState.topic = best.title;
  }

  if (!best || best.score === 0) {
    return withSalesStep(
      "Могу сориентировать по аудиту, рискам, финмоделям, финансовому анализу и формату работы. Чтобы не гадать, напишите, что сейчас важнее: проверка отчетности, подготовка к банку/инвестору, налоговые риски или денежные потоки."
    );
  }

  return withSalesStep(best.answer);
}

function collectLeadFields(text) {
  const email = text.match(/[A-Z0-9._%+-]+@[A-Z0-9.-]+\.[A-Z]{2,}/i)?.[0];
  const phone = text.match(/(?:\+?\d[\s\-()]*){10,}/)?.[0];
  const nameMatch = text.match(/(?:меня зовут|имя|я)\s+([А-ЯA-Z][а-яa-zё-]{2,})/i);

  if (email) chatState.email = email;
  if (phone) chatState.phone = phone.replace(/[^\d+]/g, "");
  if (nameMatch && !chatState.name) chatState.name = nameMatch[1];

  if (hasCookieConsent()) {
    localStorage.setItem("acp_chat_lead", JSON.stringify(chatState));
  }
}

function withSalesStep(answer) {
  if (!chatState.email) {
    return `${answer} Я могу отправить на почту короткую заготовку списка документов для первичной диагностики. На какой e-mail удобнее прислать?`;
  }

  if (!chatState.phone) {
    return `${answer} Почту записала: ${chatState.email}. Чтобы Ирина могла быстро созвониться и уточнить контекст без долгой переписки, оставьте, пожалуйста, телефон или Telegram.`;
  }

  const subject = encodeURIComponent("Лид из AI-чата Аудит Центр Плюс");
  const body = encodeURIComponent(
    `Оператор: ${chatState.operator}\nТема: ${chatState.topic || "Не уточнена"}\nИмя: ${chatState.name || "Не указано"}\nТелефон/Telegram: ${chatState.phone}\nE-mail: ${chatState.email}\n\nКомментарий: клиент просит консультацию и шаблон списка документов.`
  );

  return `${answer} Спасибо, контакты есть. Я подготовила заявку для Ирины и шаблон письма со списком документов: mailto:${LEAD_EMAIL}?subject=${subject}&body=${body} Если удобно, откройте эту ссылку или напишите напрямую в Telegram @LevchenkovaIrina.`;
}

function appendMessage(container, text, type = "bot") {
  const message = document.createElement("div");
  message.className = `message ${type}`;
  message.textContent = text;
  container.append(message);
  container.scrollTop = container.scrollHeight;
}

async function getChatAnswer(question) {
  if (!CHAT_ENDPOINT) {
    return localChatAnswer(question);
  }

  const response = await fetch(CHAT_ENDPOINT, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      question,
      context: knowledgeBase.map(({ title, answer }) => ({ title, answer })),
    }),
  });

  if (!response.ok) {
    throw new Error("Chat endpoint failed");
  }

  const data = await response.json();
  return data.answer || localChatAnswer(question);
}

function initChat() {
  const launcher = document.querySelector("[data-chat-launcher]");
  const close = document.querySelector("[data-chat-close]");
  const form = document.querySelector("[data-chat-form]");
  const messages = document.querySelector("[data-chat-messages]");
  const operatorName = document.querySelector("[data-operator-name]");
  if (!launcher || !close || !form || !messages) return;
  if (operatorName) operatorName.textContent = `${chatState.operator}, AI-консультант`;

  appendMessage(
    messages,
    `Здравствуйте, меня зовут ${chatState.operator}. Я помогу понять, что подойдет: аудит, матрица рисков, финмодель или финансовый анализ. Немного расскажу по задаче и задам пару вопросов, чтобы Ирина могла быстро выйти с предложением. Что сейчас нужно бизнесу?`
  );

  launcher.addEventListener("click", () => {
    document.body.classList.add("chat-open");
    form.elements.question.focus();
  });

  close.addEventListener("click", () => {
    document.body.classList.remove("chat-open");
  });

  form.addEventListener("submit", async (event) => {
    event.preventDefault();
    const input = form.elements.question;
    const question = input.value.trim();
    if (!question) return;

    appendMessage(messages, question, "user");
    input.value = "";

    try {
      const answer = await getChatAnswer(question);
      appendMessage(messages, answer);
    } catch {
      appendMessage(messages, localChatAnswer(question));
    }
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
