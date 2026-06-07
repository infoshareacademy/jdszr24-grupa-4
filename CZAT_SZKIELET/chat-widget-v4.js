// Chat Widget Script
(function() {
    // Inject Sora font
    const fontLink = document.createElement('link');
    fontLink.rel = 'stylesheet';
    fontLink.href = 'https://fonts.googleapis.com/css2?family=Sora:wght@400;600;700&display=swap';
    document.head.appendChild(fontLink);

    // Creative, glassmorphic, circular styles
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
            z-index: 999;
            display: flex;
            align-items: center;
            justify-content: center;
            transition: transform 0.3s cubic-bezier(.68,-0.55,.27,1.55);
            outline: none;
        }
        .n8n-chat-widget .chat-toggle:active {
            transform: scale(0.95);
        }
        .n8n-chat-widget .chat-toggle svg {
            width: 36px;
            height: 36px;
            fill: currentColor;
        }
        .n8n-chat-widget .chat-container {
            position: fixed;
            bottom: 120px;
            right: 32px;
            width: 420px;
            height: 620px;
            border-radius: 32px;
            background: var(--chat--color-glass);
            backdrop-filter: var(--chat--color-glass-blur);
            box-shadow: 0 12px 48px rgba(115, 103, 240, 0.18);
            border: 2px solid rgba(255,255,255,0.3);
            overflow: hidden;
            display: none;
            flex-direction: column;
            z-index: 1000;
            animation: popIn 0.5s cubic-bezier(.68,-0.55,.27,1.55);
        }
        .n8n-chat-widget .chat-container.open {
            display: flex;
        }
        @keyframes popIn {
            0% { transform: scale(0.7) translateY(60px); opacity: 0; }
            100% { transform: scale(1) translateY(0); opacity: 1; }
        }
        .n8n-chat-widget .brand-header {
            padding: 20px 24px 12px 24px;
            display: flex;
            align-items: center;
            gap: 16px;
            background: transparent;
            border-bottom: none;
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
        .n8n-chat-widget .close-button:hover {
            opacity: 1;
        }
        .n8n-chat-widget .chat-messages {
            flex: 1;
            overflow-y: auto;
            padding: 32px 24px 16px 24px;
            background: transparent;
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
        @keyframes bubbleIn {
            0% { transform: scale(0.8) translateY(20px); opacity: 0; }
            100% { transform: scale(1) translateY(0); opacity: 1; }
        }
        .n8n-chat-widget .chat-input {
            padding: 18px 24px;
            background: transparent;
            border-top: none;
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
            transition: transform 0.2s;
        }
        .n8n-chat-widget .chat-input button:hover {
            transform: scale(1.08);
        }
    `;

    // Inject styles
    const styleSheet = document.createElement('style');
    styleSheet.textContent = styles;
    document.head.appendChild(styleSheet);

    // Widget container
    const widgetContainer = document.createElement('div');
    widgetContainer.className = 'n8n-chat-widget';
    document.body.appendChild(widgetContainer);

    // Chat toggle (FAB)
    const toggleButton = document.createElement('button');
    toggleButton.className = 'chat-toggle';
    toggleButton.innerHTML = `
        <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 48 48"><circle cx="24" cy="24" r="22" fill="#fff" opacity="0.12"/><path d="M24 12a2 2 0 0 1 2 2v8h8a2 2 0 1 1 0 4h-8v8a2 2 0 1 1-4 0v-8h-8a2 2 0 1 1 0-4h8v-8a2 2 0 0 1 2-2z" fill="currentColor"/></svg>
    `;
    widgetContainer.appendChild(toggleButton);

    // Chat container (hidden by default)
    const chatContainer = document.createElement('div');
    chatContainer.className = 'chat-container';
    widgetContainer.appendChild(chatContainer);

    // Brand header with mascot
    const brandHeader = document.createElement('div');
    brandHeader.className = 'brand-header';
    brandHeader.innerHTML = `
        <div class="mascot" title="Mascot">🤖</div>
        <span>ChatBot</span>
        <button class="close-button" aria-label="Close chat">×</button>
    `;
    chatContainer.appendChild(brandHeader);

    // Chat messages area
    const messagesContainer = document.createElement('div');
    messagesContainer.className = 'chat-messages';
    chatContainer.appendChild(messagesContainer);

    // Chat input area
    const chatInput = document.createElement('div');
    chatInput.className = 'chat-input';
    chatInput.innerHTML = `
        <textarea placeholder="Type your message..." rows="1"></textarea>
        <button type="submit" aria-label="Send message">➤</button>
    `;
    chatContainer.appendChild(chatInput);

    // Show/hide chat
    toggleButton.addEventListener('click', () => {
        chatContainer.classList.toggle('open');
    });
    brandHeader.querySelector('.close-button').addEventListener('click', () => {
        chatContainer.classList.remove('open');
    });

    // Send message logic (placeholder, to be expanded)
    const textarea = chatInput.querySelector('textarea');
    const sendButton = chatInput.querySelector('button');
    sendButton.addEventListener('click', () => {
        const message = textarea.value.trim();
        if (message) {
            const userMessageDiv = document.createElement('div');
            userMessageDiv.className = 'chat-message user';
            userMessageDiv.textContent = message;
            messagesContainer.appendChild(userMessageDiv);
            messagesContainer.scrollTop = messagesContainer.scrollHeight;
            textarea.value = '';
            // TODO: Add bot response, mascot animation, etc.
        }
    });
    textarea.addEventListener('keypress', (e) => {
        if (e.key === 'Enter' && !e.shiftKey) {
            e.preventDefault();
            sendButton.click();
        }
    });
})();