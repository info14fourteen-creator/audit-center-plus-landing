# Подключение AI-чата

Лендинг уже содержит виджет чата и локальную базу ответов по услугам компании. На GitHub Pages нельзя безопасно хранить OpenAI API key: любой ключ в `index.html` или `script.js` станет публичным.

Созданный OpenAI Assistant:

```text
assistant_id=asst_7Jbm61vLl63GVnOhQwZw6G8J
model=gpt-4o-mini
name=Аудит Центр Плюс - AI-консультант
vector_store_id=vs_6a16fb230e308191bd40684f014145e0
knowledge_file_id=file-VyoojaooBD1vEiiSkbQHoS
```

К ассистенту подключен `file_search`: база знаний загружена из файла `Информация о компании и услугах.docx` и включает услуги, результаты, этапы, принципы работы и контакты.

Безопасная схема:

1. Развернуть маленький backend/proxy на Vercel, Cloudflare Workers, Render или собственном сервере.
2. Хранить `OPENAI_API_KEY` только в переменных окружения backend.
3. В backend передавать в OpenAI подготовленную базу знаний: услуги, этапы, результаты, контакты, ограничения.
4. Backend должен использовать `assistant_id` выше и хранить `OPENAI_API_KEY` только в переменных окружения.
5. На сайте указать адрес backend:

```html
<script>
  window.ACP_CHAT_ENDPOINT = "https://your-domain.example/chat";
</script>
```

Сейчас, пока endpoint не задан, чат работает в статическом режиме: отвечает по встроенной базе сайта и направляет на консультацию.

В репозитории есть готовый Vercel-compatible endpoint:

```text
api/chat.js
```

Для реального подключения нужно развернуть этот проект на Vercel или другом Node-хостинге и задать переменные окружения:

```text
OPENAI_API_KEY=...
OPENAI_ASSISTANT_ID=asst_7Jbm61vLl63GVnOhQwZw6G8J
ALLOWED_ORIGIN=https://info14fourteen-creator.github.io
```

После деплоя endpoint вида `https://<project>.vercel.app/api/chat` нужно прописать на странице:

```html
<script>
  window.ACP_CHAT_ENDPOINT = "https://<project>.vercel.app/api/chat";
</script>
```

Фронт уже умеет:

- показывать случайную задержку и индикатор набора;
- объединять несколько сообщений клиента, если они пришли до ответа;
- отменять устаревший запрос и готовить новый ответ по полному контексту;
- передавать историю диалога в backend;
- передавать `sessionId`, страницу, контакты и флаг уже отправленной заявки.

## Передача лида менеджеру

Backend считает диалог готовым к передаче, когда в переписке есть e-mail и телефон/Telegram, а также понятен бизнес-контекст или клиент явно просит связаться. После этого backend собирает краткое summary:

- тема обращения;
- имя, e-mail, телефон или Telegram;
- session id, страница и источник;
- последние сообщения клиента;
- последний ответ консультанта.

В продакшене сейчас используется Cloudflare Worker:

```text
https://audit-center-plus-chat.stan-at.workers.dev
```

Чтобы summary реально уходило в Telegram, нужно добавить два секрета Cloudflare Worker:

```bash
wrangler secret put TELEGRAM_BOT_TOKEN --name audit-center-plus-chat
wrangler secret put TELEGRAM_CHAT_ID --name audit-center-plus-chat
wrangler deploy
```

Если секреты не заданы, чат продолжит работать, а backend вернет:

```json
{
  "handoff": {
    "ready": true,
    "configured": false,
    "sent": false,
    "reason": "telegram_not_configured"
  }
}
```

Это сделано специально: клиент не должен видеть ошибку только потому, что канал уведомлений еще не подключен.

Пример контракта endpoint:

```http
POST /chat
Content-Type: application/json

{
  "sessionId": "chat-session-id",
  "question": "Нужна финмодель для банка, почта client@example.com, телефон +79991234567",
  "history": [],
  "lead": {
    "name": "",
    "phone": "",
    "email": "",
    "topic": ""
  },
  "notificationSent": false,
  "page": {
    "url": "https://info14fourteen-creator.github.io/audit-center-plus-landing/",
    "referrer": ""
  }
}
```

Ответ:

```json
{
  "answer": "Для банка обычно нужна трехсторонняя модель...",
  "lead": {
    "email": "client@example.com",
    "phone": "+79991234567",
    "topic": "Финансовое моделирование"
  },
  "handoff": {
    "ready": true,
    "configured": true,
    "sent": true,
    "channel": "telegram"
  }
}
```

Системный промпт ассистента:

```text
Ты AI-консультант компании "Аудит Центр Плюс". Отвечай кратко, по-деловому и только на основе базы знаний. Главная цель: квалифицировать запрос и предложить консультацию с Ириной Левченковой. Не давай юридических или налоговых гарантий. Если данных недостаточно, задай 1-2 уточняющих вопроса.
```
