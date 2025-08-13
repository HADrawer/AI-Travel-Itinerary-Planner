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
  const parts = text.split(/(?=^\s*[-–]?\s*Day\s+\d+)/gmi);
  return parts.filter((p) => p.trim().length > 0);
}

export default function ItineraryChat() {
  const router = useRouter();
  const params = useParams();
  const itineraryId = params.id as string;
  const API_URL = process.env.NEXT_PUBLIC_API_URL || "http://localhost:3001";

  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [input, setInput] = useState("");
  const [loading, setLoading] = useState(false);
  const [itineraryText, setItineraryText] = useState<string>("");

  const [meta, setMeta] = useState<{ title?: string; start_date?: string; end_date?: string }>({});
  const scrollRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    supabase.auth.getSession().then(({ data: { session } }) => {
      if (!session) router.push("/Login");
      else {
        fetchState(session.access_token);
        fetchChat(session.access_token);
      }
    });
  }, []);

  useEffect(() => {
    scrollRef.current?.scrollTo({
      top: scrollRef.current.scrollHeight,
      behavior: "smooth",
    });
  }, [messages]);

  async function fetchState(token: string) {
    const res = await fetch(`${API_URL}/api/itineraries/${itineraryId}/state`, {
      headers: { token },
    });
    if (res.ok) {
      const data = await res.json();
      setItineraryText(data.itinerary_text || "");
      setMeta({ title: data.title, start_date: data.start_date, end_date: data.end_date });
    }
  }

  async function fetchChat(token: string) {
    const res = await fetch(`${API_URL}/api/itineraries/${itineraryId}/chats`, {
      headers: { token },
    });
    const data: ChatMessage[] = await res.json();
    setMessages(data);
  }

  async function sendMessage() {
    if (!input.trim()) return;
    setLoading(true);

    const session = await supabase.auth.getSession();
    const token = session.data.session?.access_token || "";

    const res = await fetch(`${API_URL}/api/itineraries/${itineraryId}/chat`, {
      method: "POST",
      headers: { "Content-Type": "application/json", token },
      body: JSON.stringify({ message: input }),
    });

    const data = await res.json();

    if (!data.error && data.combinedMessage) {
      const [aiReply, itineraryPart] = data.combinedMessage.split("||||").map((s: string) => s?.trim() ?? "");

      // حدّث الرسائل
      setMessages((prev) => [
        ...prev,
        { role: "user", content: input },
        { role: "assistant", content: aiReply },
      ]);

      if (itineraryPart) setItineraryText(itineraryPart);

      setInput("");
    }
    setLoading(false);
  }

  return (
    <main className="max-w-6xl mx-auto p-8 flex flex-col h-screen gap-8 text-black bg-gradient-to-r from-indigo-50 to-white">
      {/* زر العودة */}
      <button
        onClick={() => router.push("/")}
        className="self-start bg-indigo-600 text-white px-4 py-2 rounded-lg hover:bg-indigo-700 transition-colors duration-200"
      >
        ← Back
      </button>

      <h1 className="text-3xl font-extrabold mb-2 text-center text-indigo-700 drop-shadow-md">Itinerary Chat</h1>
         
      <p className="text-center text-indigo-500 italic font-semibold tracking-wide">
        {meta?.title ? `${meta.title} — ${meta.start_date} → ${meta.end_date}` : "Trip Itinerary"}
      </p>

      <div className="flex flex-1 gap-8 overflow-hidden">
        <div className="flex-1 overflow-y-auto border rounded-lg p-6 bg-white shadow-lg max-h-full">
          <h2 className="text-2xl font-semibold mb-6 border-b pb-2 border-indigo-300 text-indigo-600">Itinerary Details</h2>
          {itineraryText ? (
            splitItinerary(itineraryText).map((dayText, idx) => (
              <div
                key={idx}
                className="mb-6 p-5 border border-indigo-200 rounded-xl bg-indigo-50 hover:bg-indigo-100 transition-colors duration-300 cursor-default"
                style={{ whiteSpace: "pre-line", boxShadow: "0 3px 6px rgba(99, 102, 241, 0.15)" }}
              >
                {dayText}
              </div>
            ))
          ) : (
            <p className="text-gray-400 italic text-center mt-20">No itinerary details to show yet.</p>
          )}
        </div>

        <div className="w-96 flex flex-col border rounded-lg p-4 bg-white shadow-md max-h-full">
          <h2 className="text-2xl font-semibold mb-4 border-b border-gray-300 pb-2 text-gray-700">Chat Bot</h2>
          <div
            ref={scrollRef}
            className="flex-1 overflow-y-auto space-y-4 mb-4 px-2"
            style={{ scrollBehavior: "smooth" }}
          >
            {messages.map((msg, i) => (
              <div
                key={i}
                className={`max-w-[75%] p-3 rounded-2xl shadow-sm
                  ${msg.role === "user"
                    ? "bg-blue-600 text-white self-end rounded-br-none"
                    : "bg-gray-200 text-gray-900 self-start rounded-bl-none"
                  }`}
                style={{
                  alignSelf: msg.role === "user" ? "flex-end" : "flex-start",
                  whiteSpace: "pre-line",
                }}
              >
                <p className="break-words">{msg.content}</p>
                <span className="block text-xs mt-1 text-gray-500 select-none">
                  {msg.created_at ? new Date(msg.created_at).toLocaleString() : ""}
                </span>
              </div>
            ))}
          </div>

          <div className="flex gap-3">
            <input
              type="text"
              className="flex-grow border border-indigo-300 rounded-lg p-3 focus:outline-none focus:ring-2 focus:ring-indigo-400"
              value={input}
              onChange={(e) => setInput(e.target.value)}
              placeholder="Ask or request changes to the itinerary..."
              onKeyDown={(e) => e.key === "Enter" && sendMessage()}
              disabled={loading}
            />
            <button
              onClick={sendMessage}
              disabled={loading || !input.trim()}
              className="bg-indigo-600 text-white px-6 py-3 rounded-lg hover:bg-indigo-700 disabled:opacity-50 transition-colors duration-200"
            >
              {loading ? "Sending..." : "Send"}
            </button>
          </div>
        </div>
      </div>
    </main>
  );
}
