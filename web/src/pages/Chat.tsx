import axios from "axios";
import { useEffect, useRef, useState } from "react";
import { API_URL } from "../utils/constants";
import { useNavigate } from "react-router-dom";
import { Sidebar, SidebarItem } from "./Sidebar";
import { MarkdownMessage } from "./Markdown";

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
  const initDone = useRef(false);

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
    if (initDone.current) return;
    initDone.current = true;

    const init = async () => {
      try {
        const res = await axios.get(API_URL + "session_valid", {
          withCredentials: true,
        });
        if (res.data.status_code !== 200) {
          navigate("/login");
          return;
        }
      } catch {
        navigate("/login");
        return;
      }

      await Promise.all([
        createConversation(),
        axios
          .get(API_URL + "conversations", { withCredentials: true })
          .then((res) => setConversations(res.data))
          .catch((err) => console.error(err)),
        axios
          .get(API_URL + "models", { withCredentials: true })
          .then((res) => {
            const list: string[] = res.data.models || [];
            setModels(list);
            if (list.length) setSelectedModel(list[0]);
          })
          .catch((err) => console.error(err)),
      ]);
    };

    init();
  }, [navigate]);

  // console.log(conversations, "conversationsssssssss");

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
        prev.map((m) => (m.id === botId ? { ...m, text: m.text + chunk } : m)),
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
          const dataLine = evt.split("\n").find((l) => l.startsWith("data:"));
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
      setConversationId(id);
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
              // active={false}
              onClick={() => {
                setMessages([]);
                getMessages(convo.conversation_id);
              }}
            />
          );
        })}
      </Sidebar>
      <div className="flex flex-col flex-1 min-w-0 bg-[#f0f2f5]">
        <div className="flex items-center justify-between gap-2 px-4 py-2.5 bg-white border-b border-[#ddd]">
          <label className="flex items-center gap-2 text-[13px] text-[#333]">
            Model:
            <select
              value={selectedModel}
              onChange={(e) => setSelectedModel(e.target.value)}
              className="px-2.5 py-1.5 rounded-lg border border-[#ddd] text-[13px] bg-[#f0f2f5] text-black"
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
            className="px-3.5 py-1.5 rounded-lg border border-[#007bff] bg-white text-[#007bff] text-[13px] cursor-pointer"
          >
            Dashboard
          </button>
        </div>
        <div className="flex-1 overflow-y-auto p-4 flex flex-col gap-2">
          {messages.map((msg) => (
            <div
              key={msg.id}
              className={`flex ${msg.sender === "user" ? "justify-end" : "justify-start"}`}
            >
              {msg.sender === "user" ? (
                <span
                  className={`max-w-[70%] px-3.5 py-2.5 text-sm leading-normal shadow-sm wrap-break-words ${
                    msg.sender === "user"
                      ? "bg-[#007bff] text-white rounded-[18px_18px_4px_18px]"
                      : "bg-white text-[#111] rounded-[18px_18px_18px_4px]"
                  }`}
                >
                  {msg.text}
                </span>
              ) : (
                <MarkdownMessage content={msg.text} />
              )}
            </div>
          ))}
          {loading && (
            <div className="flex justify-start">
              <span className="bg-white px-3.5 py-2.5 rounded-[18px_18px_18px_4px] text-xl shadow-sm tracking-[2px]">
                •••
              </span>
            </div>
          )}
          <div ref={bottomRef} />
        </div>

        <form
          onSubmit={sendMessage}
          className="flex gap-2 px-4 py-3 bg-white border-t border-[#ddd]"
        >
          <input
            type="text"
            value={input}
            onChange={(e) => setInput(e.target.value)}
            placeholder="Type a message..."
            className="flex-1 px-3.5 py-2.5 rounded-3xl border border-[#ddd] outline-none text-sm bg-[#f0f2f5] text-black"
          />
          <button
            type="submit"
            disabled={loading}
            className={`px-5 py-2.5 rounded-3xl text-white border-none font-semibold text-sm ${
              loading
                ? "bg-[#aaa] cursor-not-allowed"
                : "bg-[#007bff] cursor-pointer"
            }`}
          >
            Send
          </button>
        </form>
      </div>
    </div>
  );
};

export default Chat;
