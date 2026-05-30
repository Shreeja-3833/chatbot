import axios from "axios";
import { useEffect, useRef, useState } from "react";
import { API_URL } from "../utils/constants";
import { useNavigate } from "react-router-dom";
import { Sidebar, SidebarItem } from "./Sidebar";

const Chat = () => {
  const navigate = useNavigate();
  const [messages, setMessages] = useState([
    { id: 1, text: "Hello! How can I help you?", sender: "bot" },
  ]);
  const [loading, setLoading] = useState(false);
  const [input, setInput] = useState("");
  const [conversationId, setConversationId] = useState<string | undefined>();
  const [conversations, setConversations] = useState<any[]>([]);
  const [models, setModels] = useState<string[]>([]);
  const [selectedModel, setSelectedModel] = useState<string>("");
  const bottomRef = useRef<HTMLDivElement>(null);
  const activeConvoRef = useRef<string | null>(null);

  const createConversation = async () => {
    try {
      const res = await axios.post(
        API_URL + "conversations",
        {},
        { withCredentials: true },
      );
      // console.log(res, "conversation id");
      setConversationId(res.data.conversation_id);
    } catch (err: any) {
      console.error(
        err.response,
        "something went wrong while creating conversation id",
      );
    }
  };

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
    const func = async () => {
      const res = await axios.get(API_URL + "conversations", {
        withCredentials: true,
      });
      setConversations(res.data)
    };
    createConversation();
    func();
  }, []);
  // console.log(conversations, "conversationsssssssss");

  useEffect(() => {
    const loadModels = async () => {
      try {
        const res = await axios.get(API_URL + "models", {
          withCredentials: true,
        });
        const list: string[] = res.data.models || [];
        setModels(list);
        if (list.length) setSelectedModel(list[0]);
      } catch (err) {
        console.error(err, "couldn't load models");
      }
    };
    loadModels();
  }, []);

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages]);

  const sendMessage = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!input.trim()) return;

    const userText = input;
    const inputMessage = {
      id: Date.now(),
      text: userText,
      sender: "user",
    };
    const botId = Date.now() + 1;
    setMessages((prev) => [
      ...prev,
      inputMessage,
      { id: botId, text: "", sender: "bot" },
    ]);
    setInput("");
    setLoading(true);

    const appendToBot = (chunk: string) => {
      setMessages((prev) =>
        prev.map((m) =>
          m.id === botId ? { ...m, text: m.text + chunk } : m,
        ),
      );
    };

    try {
      const res = await fetch(API_URL + "get_input_stream", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        credentials: "include",
        body: JSON.stringify({
          input: userText,
          conversation_id: conversationId,
          model: selectedModel,
        }),
      });

      if (!res.ok || !res.body) {
        throw new Error(`Request failed with status ${res.status}`);
      }

      const reader = res.body.getReader();
      const decoder = new TextDecoder();
      let buffer = "";
      let streamError = false;

      while (true) {
        const { value, done } = await reader.read();
        if (done) break;
        buffer += decoder.decode(value, { stream: true });

        const events = buffer.split("\n\n");
        buffer = events.pop() || "";

        for (const evt of events) {
          if (!evt.trim()) continue;
          const isError = evt.includes("event: error");
          const dataLine = evt
            .split("\n")
            .find((l) => l.startsWith("data:"));
          if (!dataLine) continue;
          const payload = JSON.parse(dataLine.slice(5).trim());
          if (isError) {
            streamError = true;
          } else if (payload.delta) {
            appendToBot(payload.delta);
          }
        }
      }

      if (streamError) {
        throw new Error("model error");
      }
    } catch (err: any) {
      console.error(err, "something went wrong");
      setMessages((prev) => prev.filter((m) => m.id !== botId));
      alert("Something went wrong with the model, please try again later");
    } finally {
      setLoading(false);
    }
  };
  const getMessages = async (id: string) => {
    activeConvoRef.current = id;
    setMessages([]);
    setLoading(true);
    try {
      const res = await axios.get(API_URL + `conversations/${id}/messages`, {
        withCredentials: true,
      });
      if (activeConvoRef.current !== id) return;

      const newMessages = res.data.map((msg: any) => ({
        id: msg.id,
        text: msg.text,
        sender: msg.role,
      }));
      setMessages(newMessages);
      setConversationId(id)
    } catch (err: any) {
      console.error(err.response, "couldn't get messages");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="flex flex-row h-screen overflow-hidden">
      <Sidebar>
        {conversations.map((convo: any) => {
          return (
            <SidebarItem
              text={convo.title}
              active={false}
              onClick={() => {
                setMessages([]);
                getMessages(convo.conversation_id);
              }}
            />
          );
        })}
      </Sidebar>
      <div className="flex flex-col flex-1 min-w-0 bg-[#f0f2f5]">
        <div
          style={{
            display: "flex",
            alignItems: "center",
            justifyContent: "space-between",
            gap: "8px",
            padding: "10px 16px",
            background: "#ffffff",
            borderBottom: "1px solid #ddd",
          }}
        >
          <label
            style={{
              display: "flex",
              alignItems: "center",
              gap: "8px",
              fontSize: "13px",
              color: "#333",
            }}
          >
            Model:
            <select
              value={selectedModel}
              onChange={(e) => setSelectedModel(e.target.value)}
              style={{
                padding: "6px 10px",
                borderRadius: "8px",
                border: "1px solid #ddd",
                fontSize: "13px",
                background: "#f0f2f5",
                color: "black",
              }}
            >
              {models.map((m) => (
                <option key={m} value={m}>
                  {m}
                </option>
              ))}
            </select>
          </label>
          <button
            type="button"
            onClick={() => navigate("/dashboard")}
            style={{
              padding: "6px 14px",
              borderRadius: "8px",
              border: "1px solid #007bff",
              background: "#ffffff",
              color: "#007bff",
              fontSize: "13px",
              cursor: "pointer",
            }}
          >
            Dashboard
          </button>
        </div>
        <div className="flex-1 overflow-y-auto p-4 flex flex-col gap-2">
          {messages.map((msg) => (
            <div
              key={msg.id}
              style={{
                display: "flex",
                justifyContent:
                  msg.sender === "user" ? "flex-end" : "flex-start",
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
    </div>
  );
};


export default Chat;
