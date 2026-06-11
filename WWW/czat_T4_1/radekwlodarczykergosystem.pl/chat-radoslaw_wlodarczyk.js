(function () {
  const fontLink = document.createElement("link");
  fontLink.rel = "stylesheet";
  fontLink.href =
    "https://fonts.googleapis.com/css2?family=Sora:wght@400;600;700&display=swap";
  document.head.appendChild(fontLink);

  const sessionId =
    window.crypto && crypto.randomUUID
      ? crypto.randomUUID()
      : "sess-" + Date.now() + "-" + Math.random().toString(16).slice(2);

  // Aktualny webhook wystawiony przez nginx -> n8n
  const webhookUrl = "http://localhost:8080/webhook/chat-radoslaw_wlodarczyk";

  const styles = `
    .n8n-chat-widget {
      --chat--color-primary: #ff6bcb;
      --chat--color-secondary: #7367f0;
      --chat--color-glass: rgba(255,255,255,0.7);
      --chat--color-glass-blur: blur(16px);
      --chat--color-font: #232946;
      font-family: 'Sora', -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Oxygen, Ubuntu, Cantarell, 'Open Sans', 'Helvetica Neue', sans-serif;
    }
    .n8n-chat-widget .chat-toggle {
      position: fixed;
      bottom: 32px;
      right: 32px;
      width: 72px;
      height: 72px;
      border-radius: 50%;
      background: linear-gradient(135deg, var(--chat--color-primary) 0%, var(--chat--color-secondary) 100%);
      color: white;
      border: none;
      cursor: pointer;
      box-shadow: 0 8px 32px rgba(115, 103, 240, 0.25);
      z-index: 999999;
      display: flex;
      align-items: center;
      justify-content: center;
      transition: transform 0.3s cubic-bezier(.68,-0.55,.27,1.55);
      outline: none;
    }
    .n8n-chat-widget .chat-toggle:active { transform: scale(0.95); }
    .n8n-chat-widget .chat-toggle svg {
      width: 36px;
      height: 36px;
      fill: currentColor;
    }
    .n8n-chat-widget .chat-container {
      position: fixed;
      bottom: 120px;
      right: 32px;
      width: min(420px, calc(100vw - 24px));
      height: min(620px, calc(100vh - 150px));
      border-radius: 32px;
      background: var(--chat--color-glass);
      backdrop-filter: var(--chat--color-glass-blur);
      box-shadow: 0 12px 48px rgba(115, 103, 240, 0.18);
      border: 2px solid rgba(255,255,255,0.3);
      overflow: hidden;
      display: none;
      flex-direction: column;
      z-index: 1000000;
      animation: popIn 0.5s cubic-bezier(.68,-0.55,.27,1.55);
    }
    .n8n-chat-widget .chat-container.open { display: flex; }
    @keyframes popIn {
      0% { transform: scale(0.7) translateY(60px); opacity: 0; }
      100% { transform: scale(1) translateY(0); opacity: 1; }
    }
    .n8n-chat-widget .brand-header {
      padding: 20px 24px 12px 24px;
      display: flex;
      align-items: center;
      gap: 16px;
      position: relative;
    }
    .n8n-chat-widget .mascot {
      width: 48px;
      height: 48px;
      border-radius: 50%;
      background: linear-gradient(135deg, #ffb86b 0%, #ff6bcb 100%);
      display: flex;
      align-items: center;
      justify-content: center;
      font-size: 32px;
      box-shadow: 0 2px 8px rgba(255,107,203,0.12);
      margin-right: 8px;
    }
    .n8n-chat-widget .brand-header span {
      font-size: 22px;
      font-weight: 700;
      color: var(--chat--color-font);
      letter-spacing: -0.5px;
    }
    .n8n-chat-widget .close-button {
      position: absolute;
      right: 20px;
      top: 50%;
      transform: translateY(-50%);
      background: none;
      border: none;
      color: var(--chat--color-font);
      cursor: pointer;
      font-size: 28px;
      opacity: 0.5;
      transition: opacity 0.2s;
    }
    .n8n-chat-widget .close-button:hover { opacity: 1; }
    .n8n-chat-widget .chat-messages {
      flex: 1;
      overflow-y: auto;
      padding: 32px 24px 16px 24px;
      display: flex;
      flex-direction: column;
      gap: 12px;
    }
    .n8n-chat-widget .chat-message {
      max-width: 75%;
      padding: 16px 22px;
      border-radius: 24px;
      font-size: 16px;
      line-height: 1.6;
      word-break: break-word;
      box-shadow: 0 2px 8px rgba(115, 103, 240, 0.08);
      animation: bubbleIn 0.4s cubic-bezier(.68,-0.55,.27,1.55);
      white-space: pre-wrap;
    }
    .n8n-chat-widget .chat-message.user {
      background: linear-gradient(135deg, #7367f0 0%, #ff6bcb 100%);
      color: #fff;
      align-self: flex-end;
    }
    .n8n-chat-widget .chat-message.bot {
      background: var(--chat--color-glass);
      color: var(--chat--color-font);
      align-self: flex-start;
      border: 1.5px solid #ffb6b6;
    }
    .n8n-chat-widget .chat-message.system {
      background: rgba(255, 230, 230, 0.9);
      color: #8a1f1f;
      align-self: center;
      border: 1px solid rgba(255, 107, 107, 0.3);
      max-width: 90%;
      font-size: 14px;
    }
    @keyframes bubbleIn {
      0% { transform: scale(0.8) translateY(20px); opacity: 0; }
      100% { transform: scale(1) translateY(0); opacity: 1; }
    }
    .n8n-chat-widget .chat-input {
      padding: 18px 24px;
      display: flex;
      gap: 10px;
      align-items: center;
    }
    .n8n-chat-widget .chat-input textarea {
      flex: 1;
      padding: 14px 18px;
      border: 1.5px solid #e0e0e0;
      border-radius: 18px;
      background: var(--chat--color-glass);
      color: var(--chat--color-font);
      resize: none;
      font-family: inherit;
      font-size: 16px;
      outline: none;
      transition: border 0.2s;
    }
    .n8n-chat-widget .chat-input textarea:focus {
      border: 1.5px solid #ff6bcb;
    }
    .n8n-chat-widget .chat-input button {
      background: linear-gradient(135deg, #ff6bcb 0%, #7367f0 100%);
      color: white;
      border: none;
      border-radius: 50%;
      width: 48px;
      height: 48px;
      display: flex;
      align-items: center;
      justify-content: center;
      font-size: 22px;
      cursor: pointer;
      transition: transform 0.2s, opacity 0.2s;
    }
    .n8n-chat-widget .chat-input button:hover { transform: scale(1.08); }
    .n8n-chat-widget .chat-input button:disabled,
    .n8n-chat-widget .chat-input textarea:disabled {
      opacity: 0.6;
      cursor: not-allowed;
    }

    @media (max-width: 640px) {
      .n8n-chat-widget .chat-toggle {
        right: 16px;
        bottom: 16px;
        width: 60px;
        height: 60px;
      }
      .n8n-chat-widget .chat-container {
        right: 12px;
        left: 12px;
        bottom: 88px;
        width: auto;
        height: min(70vh, 620px);
        border-radius: 24px;
      }
    }
  `;

  const styleSheet = document.createElement("style");
  styleSheet.textContent = styles;
  document.head.appendChild(styleSheet);

  const widgetContainer = document.createElement("div");
  widgetContainer.className = "n8n-chat-widget";
  document.body.appendChild(widgetContainer);

  const toggleButton = document.createElement("button");
  toggleButton.className = "chat-toggle";
  toggleButton.type = "button";
  toggleButton.setAttribute("aria-label", "Otwórz czat");
  toggleButton.innerHTML = `
    <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 48 48">
      <circle cx="24" cy="24" r="22" fill="#fff" opacity="0.12"/>
      <path d="M24 12a2 2 0 0 1 2 2v8h8a2 2 0 1 1 0 4h-8v8a2 2 0 1 1-4 0v-8h-8a2 2 0 1 1 0-4h8v-8a2 2 0 0 1 2-2z" fill="currentColor"/>
    </svg>
  `;
  widgetContainer.appendChild(toggleButton);

  const chatContainer = document.createElement("div");
  chatContainer.className = "chat-container";
  widgetContainer.appendChild(chatContainer);

  const brandHeader = document.createElement("div");
  brandHeader.className = "brand-header";
  brandHeader.innerHTML = `
    <div class="mascot" title="Mascot">🤖</div>
    <span>Rada Radosław</span>
    <button class="close-button" aria-label="Close chat" type="button">×</button>
  `;
  chatContainer.appendChild(brandHeader);

  const messagesContainer = document.createElement("div");
  messagesContainer.className = "chat-messages";
  chatContainer.appendChild(messagesContainer);

  const chatInput = document.createElement("div");
  chatInput.className = "chat-input";
  chatInput.innerHTML = `
    <textarea placeholder="Napisz wiadomość..." rows="1"></textarea>
    <button type="button" aria-label="Send message">➤</button>
  `;
  chatContainer.appendChild(chatInput);

  const textarea = chatInput.querySelector("textarea");
  const sendButton = chatInput.querySelector("button");

  function addMessage(text, type = "bot") {
    const messageDiv = document.createElement("div");
    messageDiv.className = `chat-message ${type}`;
    messageDiv.textContent =
      typeof text === "string" ? text : JSON.stringify(text, null, 2);
    messagesContainer.appendChild(messageDiv);
    messagesContainer.scrollTop = messagesContainer.scrollHeight;
  }

  function setLoadingState(isLoading) {
    textarea.disabled = isLoading;
    sendButton.disabled = isLoading;
    sendButton.textContent = isLoading ? "…" : "➤";
  }

  function extractBotReply(data) {
    if (!data) return "Brak odpowiedzi z workflow.";
    if (typeof data === "string") return data;

    if (data.message) return data.message;
    if (data.reply) return data.reply;
    if (data.output) return data.output;
    if (data.text) return data.text;
    if (data.response) return data.response;

    if (data.data) {
      return typeof data.data === "string"
        ? data.data
        : JSON.stringify(data.data, null, 2);
    }

    if (Array.isArray(data) && data.length > 0) {
      const first = data[0];
      if (typeof first === "string") return first;
      if (first?.message) return first.message;
      if (first?.reply) return first.reply;
      if (first?.output) return first.output;
      if (first?.text) return first.text;
      if (first?.response) return first.response;
      return JSON.stringify(first, null, 2);
    }

    return JSON.stringify(data, null, 2);
  }

  async function sendMessage() {
    const message = textarea.value.trim();
    if (!message) return;

    addMessage(message, "user");
    textarea.value = "";
    setLoadingState(true);

    try {
      const response = await fetch(webhookUrl, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Accept: "application/json, text/plain, */*",
        },
        body: JSON.stringify({
          message,
          sessionId,
          source: window.location.hostname,
          pageUrl: window.location.href,
          userAgent: navigator.userAgent,
          timestamp: new Date().toISOString(),
        }),
      });

      const contentType = response.headers.get("content-type") || "";
      let data;

      if (contentType.includes("application/json")) {
        data = await response.json();
      } else {
        data = await response.text();
      }

      if (!response.ok) {
        throw new Error(
          typeof data === "string" ? data : `HTTP ${response.status}`,
        );
      }

      const botReply = extractBotReply(data);
      addMessage(botReply, "bot");
    } catch (error) {
      console.error("Błąd połączenia z n8n:", error);
      addMessage(
        "Nie udało się pobrać odpowiedzi z n8n. Sprawdź webhook, metodę HTTP w workflow i odpowiedź z node'a Respond to Webhook.",
        "system",
      );
    } finally {
      setLoadingState(false);
      textarea.focus();
    }
  }

  toggleButton.addEventListener("click", () => {
    chatContainer.classList.toggle("open");
    if (chatContainer.classList.contains("open")) {
      textarea.focus();
    }
  });

  brandHeader.querySelector(".close-button").addEventListener("click", () => {
    chatContainer.classList.remove("open");
  });

  sendButton.addEventListener("click", sendMessage);

  textarea.addEventListener("keydown", (e) => {
    if (e.key === "Enter" && !e.shiftKey) {
      e.preventDefault();
      sendMessage();
    }
  });

  addMessage("Już my Cię u..rządzimy!", "bot");
})();
