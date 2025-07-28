"use client";

import { useState, useEffect, useRef } from "react";
import { useRouter, useParams } from "next/navigation";
import { supabase } from "../../../lib/supabase";

interface ChatMessage {
  id?: string;
  role: "user" | "assistant";
  content: string;
  created_at?: string;
}

function splitItinerary(text: string) {
  const parts = text.split(/(?=- \*\*Day)/g);
  return parts.filter(p => p.trim().length > 0);
}

export default function ItineraryChat() {
  const router = useRouter();
  const params = useParams();
  const itineraryId = params.id!;
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [input, setInput] = useState("");
  const [loading, setLoading] = useState(false);

  const scrollRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    supabase.auth.getSession().then(({ data: { session } }) => {
      if (!session) router.push("/Login");
      else fetchChat(session.access_token);
    });
  }, []);

  useEffect(() => {
    scrollRef.current?.scrollTo({ top: scrollRef.current.scrollHeight, behavior: "smooth" });
  }, [messages]);

  async function fetchChat(token: string) {
    const res = await fetch(`http://localhost:3001/api/itineraries/${itineraryId}/chats`, {
      headers: { token },
    });
    const data = await res.json();
    setMessages(data);
  }

  async function sendMessage() {
    if (!input.trim()) return;
    setLoading(true);
    const session = await supabase.auth.getSession();
    const token = session.data.session?.access_token || "";

    const res = await fetch(`http://localhost:3001/api/itineraries/${itineraryId}/chat`, {
      method: "POST",
      headers: { "Content-Type": "application/json", token },
      body: JSON.stringify({ message: input }),
    });
    const data = await res.json();
    if (!data.error) {
      setMessages((prev) => [
        ...prev,
        { role: "user", content: input },
        { role: "assistant", content: data.aiReply },
      ]);
      setInput("");
    }
    setLoading(false);
  }

  return (
    <main className="max-w-3xl mx-auto p-8 flex flex-col h-screen">
      <h1 className="text-2xl font-bold mb-4">Itinerary Chat</h1>

      <div
        ref={scrollRef}
        className="flex-1 overflow-y-auto border rounded p-4 space-y-4 bg-gray-50"
      >
        {messages.map((msg, i) => {
          if (msg.role === "assistant") {
            const days = splitItinerary(msg.content);
            return (
              <div
                key={i}
                className="max-w-3/4 p-4 rounded-lg bg-gray-300 text-black self-start"
                style={{ alignSelf: "flex-start" }}
              >
                {days.map((dayText, idx) => (
                  <div
                    key={idx}
                    className="mb-4"
                    dangerouslySetInnerHTML={{ __html: dayText.replace(/\n/g, "<br />") }}
                  />
                ))}
              </div>
            );
          } else {
            return (
              <div
                key={i}
                className="max-w-3/4 p-3 rounded-lg bg-blue-600 text-white self-end"
                style={{ alignSelf: "flex-end" }}
              >
                <p>{msg.content}</p>
                <span className="block text-xs mt-1 text-gray-300">
                  {msg.created_at ? new Date(msg.created_at).toLocaleString() : ""}
                </span>
              </div>
            );
          }
        })}
      </div>

      <div className="mt-4 flex gap-2">
        <input
          type="text"
          className="flex-grow border rounded p-2"
          value={input}
          onChange={(e) => setInput(e.target.value)}
          placeholder="Type a message or ask to update itinerary..."
          onKeyDown={(e) => e.key === "Enter" && sendMessage()}
          disabled={loading}
        />
        <button
          onClick={sendMessage}
          disabled={loading || !input.trim()}
          className="bg-blue-600 text-white px-4 py-2 rounded"
        >
          Send
        </button>
      </div>
    </main>
  );
}
