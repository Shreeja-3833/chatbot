import axios from "axios";
import { useEffect, useRef, useState } from "react";
import { API_URL } from "../utils/constants";
import { useNavigate } from "react-router-dom";

const Chat = () => {
  const navigate = useNavigate();
  const [messages, setMessages] = useState([
    { id: 1, text: "Hello! How can I help you?", sender: "bot" },
  ]);
  const [loading, setLoading] = useState(false);
  const [input, setInput] = useState("");
  const bottomRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const validate = async () => {
      try {
        const res = await axios.get(API_URL + "session_valid", {
          withCredentials: true,
        });
        if (res.data.status_code !== 200) {
          navigate("/login");
        }
      } catch (err) {
        console.error(err, "session not validated");
        navigate("/login");
      }
    };
    validate();
  }, [navigate]);

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages]);

  const sendMessage = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!input.trim()) return;

    const inputMessage = { id: Date.now(), text: input, sender: "user" };
    setMessages((prev) => [...prev, inputMessage]);
    setInput("");
    setLoading(true);

    try {
      const res = await axios.post(API_URL + "get_input", { input });
      console.log(res.data.response, "res.data.response");

      const botMessage = {
        id: Date.now(),
        text: res.data.response,
        sender: "bot",
      };
      setMessages((prev) => [...prev, botMessage]);
    } catch (err) {
      console.error(err, "something went wrong");
      //  console.error(, "something went wrong");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div
      style={{
        display: "flex",
        flexDirection: "column",
        height: "100vh",
        margin: "0 auto",
        background: "#f0f2f5",
      }}
    >
      <div
        style={{
          flex: 1,
          overflowY: "auto",
          padding: "20px 16px",
          display: "flex",
          flexDirection: "column",
          gap: "8px",
        }}
      >
        {messages.map((msg) => (
          <div
            key={msg.id}
            style={{
              display: "flex",
              justifyContent: msg.sender === "user" ? "flex-end" : "flex-start",
            }}
          >
            <span
              style={{
                maxWidth: "70%",
                background: msg.sender === "user" ? "#007bff" : "#ffffff",
                color: msg.sender === "user" ? "white" : "#111",
                padding: "10px 14px",
                borderRadius:
                  msg.sender === "user"
                    ? "18px 18px 4px 18px"
                    : "18px 18px 18px 4px",
                fontSize: "14px",
                lineHeight: "1.5",
                boxShadow: "0 1px 2px rgba(0,0,0,0.1)",
                wordBreak: "break-word",
              }}
            >
              {msg.text}
            </span>
          </div>
        ))}
        {loading && (
          <div style={{ display: "flex", justifyContent: "flex-start" }}>
            <span
              style={{
                background: "#ffffff",
                padding: "10px 14px",
                borderRadius: "18px 18px 18px 4px",
                fontSize: "20px",
                boxShadow: "0 1px 2px rgba(0,0,0,0.1)",
                letterSpacing: "2px",
              }}
            >
              •••
            </span>
          </div>
        )}

        <div ref={bottomRef} />
      </div>

      <form
        onSubmit={sendMessage}
        style={{
          display: "flex",
          gap: "8px",
          padding: "12px 16px",
          background: "#ffffff",
          borderTop: "1px solid #ddd",
        }}
      >
        <input
          type="text"
          value={input}
          onChange={(e) => setInput(e.target.value)}
          placeholder="Type a message..."
          style={{
            flex: 1,
            padding: "10px 14px",
            borderRadius: "24px",
            border: "1px solid #ddd",
            outline: "none",
            fontSize: "14px",
            background: "#f0f2f5",
            color: "black",
          }}
        />
        <button
          type="submit"
          disabled={loading}
          style={{
            padding: "10px 20px",
            borderRadius: "24px",
            background: loading ? "#aaa" : "#007bff",
            color: "white",
            border: "none",
            cursor: loading ? "not-allowed" : "pointer",
            fontWeight: 600,
            fontSize: "14px",
          }}
        >
          Send
        </button>
      </form>
    </div>
  );
};

export default Chat;
