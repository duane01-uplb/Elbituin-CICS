import { useState, useRef, useEffect } from "react";
import { sendChatMessage } from "../lib/api";
import styles from "./AIChat.module.css";

// Quick prompt suggestions
const QUICK_PROMPTS = [
  "Where's the cheapest fuel nearby?",
  "How much can I save switching to EV?",
  "What is the cooperative wallet?",
  "Tips for fuel-efficient driving",
  "What government incentives are available?",
  "Tell me about carbon credits",
];

// Initial greeting message
const INITIAL_MESSAGE = {
  id: 0,
  role: "assistant",
  text: "👋 **Mabuhay!** I'm the FuelBridge AI Guide.\n\nI can help you:\n- 🔍 Find the cheapest fuel stations\n- ⚡ Plan your EV transition\n- 💰 Understand your cooperative savings\n- 🗺️ Optimize your routes\n- 🌱 Track your environmental impact\n\nWhat would you like to know today?",
  timestamp: new Date().toISOString(),
};

function parseMarkdown(text) {
  return text
    .replace(/\*\*(.*?)\*\*/g, "<strong>$1</strong>")
    .replace(/\*(.*?)\*/g, "<em>$1</em>")
    .replace(/\n/g, "<br>");
}

export default function AIChat() {
  const [messages, setMessages] = useState([INITIAL_MESSAGE]);
  const [input, setInput] = useState("");
  const [loading, setLoading] = useState(false);
  const messagesEndRef = useRef(null);
  const inputRef = useRef(null);

  // Auto-scroll to latest message
  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages]);

  async function sendMessage(text) {
    const userText = (text || input).trim();
    if (!userText || loading) return;

    // Add user message
    const userMsg = {
      id: Date.now(),
      role: "user",
      text: userText,
      timestamp: new Date().toISOString(),
    };

    setMessages((prev) => [...prev, userMsg]);
    setInput("");
    setLoading(true);

    try {
      // Add typing indicator
      const typingId = Date.now() + 1;
      setMessages((prev) => [
        ...prev,
        { id: typingId, role: "assistant", text: "...", isTyping: true },
      ]);

      // Small delay for realism
      await new Promise((r) => setTimeout(r, 600));

      const data = await sendChatMessage(userText);

      // Replace typing indicator with real response
      setMessages((prev) =>
        prev
          .filter((m) => !m.isTyping)
          .concat({
            id: typingId,
            role: "assistant",
            text: data.message,
            timestamp: data.timestamp,
          })
      );
    } catch {
      setMessages((prev) =>
        prev
          .filter((m) => !m.isTyping)
          .concat({
            id: Date.now() + 2,
            role: "assistant",
            text: "⚠️ Could not connect to FuelBridge AI. Please check that the backend is running.",
          })
      );
    } finally {
      setLoading(false);
      inputRef.current?.focus();
    }
  }

  function handleKeyDown(e) {
    if (e.key === "Enter" && !e.shiftKey) {
      e.preventDefault();
      sendMessage();
    }
  }

  function clearChat() {
    setMessages([INITIAL_MESSAGE]);
  }

  return (
    <div className={styles.container}>
      {/* Sidebar */}
      <div className={styles.sidebar}>
        <div className={styles.sidebarHeader}>
          <div className={styles.aiAvatar}>🤖</div>
          <div>
            <div className={styles.aiName}>FuelBridge AI</div>
            <div className={styles.aiStatus}>
              <span className={styles.statusDot} />
              Online
            </div>
          </div>
        </div>

        <div className={styles.sidebarSection}>
          <div className={styles.sidebarLabel}>Try asking about:</div>
          <div className={styles.quickPrompts}>
            {QUICK_PROMPTS.map((prompt) => (
              <button
                key={prompt}
                className={styles.quickPrompt}
                onClick={() => sendMessage(prompt)}
                disabled={loading}
              >
                {prompt}
              </button>
            ))}
          </div>
        </div>

        <div className={styles.sidebarSection}>
          <div className={styles.sidebarLabel}>AI Capabilities</div>
          <div className={styles.capabilityList}>
            {[
              { icon: "⛽", label: "Fuel price intelligence" },
              { icon: "🗺️", label: "Route optimization tips" },
              { icon: "⚡", label: "EV transition planning" },
              { icon: "💰", label: "Savings calculation" },
              { icon: "🏛️", label: "Government programs" },
              { icon: "🌱", label: "Carbon impact tracking" },
            ].map((item) => (
              <div key={item.label} className={styles.capability}>
                <span>{item.icon}</span>
                <span>{item.label}</span>
              </div>
            ))}
          </div>
        </div>

        <button className={styles.clearBtn} onClick={clearChat}>
          🗑 Clear Chat
        </button>
      </div>

      {/* Chat area */}
      <div className={styles.chatArea}>
        <div className={styles.chatHeader}>
          <div className={styles.chatHeaderTitle}>
            <span>FuelBridge AI Guide</span>
            <span className={styles.chatBeta}>BETA</span>
          </div>
          <div className={styles.chatHeaderSub}>
            Rule-based assistant · Prototype mode
          </div>
        </div>

        <div className={styles.messages}>
          {messages.map((msg) => (
            <div
              key={msg.id}
              className={`${styles.message} ${
                msg.role === "user" ? styles.messageUser : styles.messageAssistant
              } ${msg.isTyping ? styles.messageTyping : ""} animate-fadeIn`}
            >
              {msg.role === "assistant" && (
                <div className={styles.msgAvatar}>🤖</div>
              )}
              <div className={styles.messageBubble}>
                {msg.isTyping ? (
                  <div className={styles.typingDots}>
                    <span /><span /><span />
                  </div>
                ) : (
                  <div
                    className={styles.messageText}
                    dangerouslySetInnerHTML={{ __html: parseMarkdown(msg.text) }}
                  />
                )}
                {msg.timestamp && !msg.isTyping && (
                  <div className={styles.msgTime}>
                    {new Date(msg.timestamp).toLocaleTimeString("en-PH", {
                      hour: "2-digit",
                      minute: "2-digit",
                    })}
                  </div>
                )}
              </div>
              {msg.role === "user" && (
                <div className={styles.msgAvatarUser}>👤</div>
              )}
            </div>
          ))}
          <div ref={messagesEndRef} />
        </div>

        {/* Input area */}
        <div className={styles.inputArea}>
          <div className={styles.inputRow}>
            <textarea
              ref={inputRef}
              className={styles.input}
              placeholder="Ask me about fuel prices, routes, EV transition..."
              value={input}
              onChange={(e) => setInput(e.target.value)}
              onKeyDown={handleKeyDown}
              rows={1}
              disabled={loading}
            />
            <button
              className={styles.sendBtn}
              onClick={() => sendMessage()}
              disabled={!input.trim() || loading}
            >
              {loading ? <span className="spinner" /> : "➤"}
            </button>
          </div>
          <div className={styles.inputHint}>
            Press Enter to send · Shift+Enter for new line
          </div>
        </div>
      </div>
    </div>
  );
}
