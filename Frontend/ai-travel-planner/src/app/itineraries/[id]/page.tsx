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
  // يدعم صيغ: "Day 1" أو "- Day 1" مع حساس لبداية السطر
  const parts = text.split(/(?=^\s*[-–]?\s*Day\s+\d+)/gmi);
  return parts.filter((p) => p.trim().length > 0);
}

export default function ItineraryChat() {
  const router = useRouter();
  const params = useParams();
  const itineraryId = params.id as string;

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
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  useEffect(() => {
    scrollRef.current?.scrollTo({
      top: scrollRef.current.scrollHeight,
      behavior: "smooth",
    });
  }, [messages]);

  async function fetchState(token: string) {
    const res = await fetch(`http://localhost:3001/api/itineraries/${itineraryId}/state`, {
      headers: { token },
    });
    if (res.ok) {
      const data = await res.json();
      setItineraryText(data.itinerary_text || "");
      setMeta({ title: data.title, start_date: data.start_date, end_date: data.end_date });
    }
  }

  async function fetchChat(token: string) {
    const res = await fetch(`http://localhost:3001/api/itineraries/${itineraryId}/chats`, {
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

    const res = await fetch(`http://localhost:3001/api/itineraries/${itineraryId}/chat`, {
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

      // حدّث الـ itinerary المعروض يسار
      if (itineraryPart) setItineraryText(itineraryPart);

      setInput("");
    }
    setLoading(false);
  }

  return (
    <main className="max-w-6xl mx-auto p-8 flex flex-col h-screen gap-8 text-black">
      <h1 className="text-3xl font-bold mb-2 text-center">Itinerary Chat</h1>
      <p className="text-center text-gray-600">
        {meta?.title ? `${meta.title} — ${meta.start_date} → ${meta.end_date}` : "Trip Itinerary"}
      </p>

      <div className="flex flex-1 gap-6 overflow-hidden">
        {/* اليسار: الـ Itinerary دائمًا محدث */}
        <div className="flex-1 overflow-y-auto border rounded p-6 bg-white shadow-lg max-h-full">
          <h2 className="text-xl font-semibold mb-4">Itinerary Details</h2>
          {itineraryText ? (
            splitItinerary(itineraryText).map((dayText, idx) => (
              <div
                key={idx}
                className="mb-5 p-4 border border-gray-300 rounded-lg bg-gray-50"
                style={{ whiteSpace: "pre-line" }}
              >
                {dayText}
              </div>
            ))
          ) : (
            <p className="text-gray-500">No itinerary details to show yet.</p>
          )}
        </div>

        {/* اليمين: الشات */}
        <div className="w-96 flex flex-col border rounded p-4 bg-gray-50 max-h-full">
          <h2 className="text-xl font-semibold mb-4">Chat Bot</h2>
          <div
            ref={scrollRef}
            className="flex-1 overflow-y-auto space-y-4 mb-4"
            style={{ scrollBehavior: "smooth" }}
          >
            {messages.map((msg, i) => (
              <div
                key={i}
                className={`max-w-3/4 p-3 rounded-lg ${
                  msg.role === "user"
                    ? "bg-blue-600 text-white self-end"
                    : "bg-gray-300 text-black self-start"
                }`}
                style={{
                  alignSelf: msg.role === "user" ? "flex-end" : "flex-start",
                  whiteSpace: "pre-line",
                }}
              >
                <p>{msg.content}</p>
                <span className="block text-xs mt-1 text-gray-600">
                  {msg.created_at ? new Date(msg.created_at).toLocaleString() : ""}
                </span>
              </div>
            ))}
          </div>

          <div className="flex gap-2">
            <input
              type="text"
              className="flex-grow border rounded p-2"
              value={input}
              onChange={(e) => setInput(e.target.value)}
              placeholder="Ask or request changes to the itinerary..."
              onKeyDown={(e) => e.key === "Enter" && sendMessage()}
              disabled={loading}
            />
            <button
              onClick={sendMessage}
              disabled={loading || !input.trim()}
              className="bg-blue-600 text-white px-4 py-2 rounded"
            >
              {loading ? "..." : "Send"}
            </button>
          </div>
        </div>
      </div>
    </main>
  );
}
