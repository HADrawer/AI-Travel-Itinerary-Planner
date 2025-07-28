"use client";

import { useState, useEffect, useRef } from "react";
import { useRouter } from "next/navigation";
import { supabase } from "../../../lib/supabase";

export default function CreateItinerary() {
  const router = useRouter();
  const [destination, setDestination] = useState("");
  const [startDate, setStartDate] = useState("");
  const [endDate, setEndDate] = useState("");
  const [preferences, setPreferences] = useState("");
  const [loading, setLoading] = useState(false);
  useEffect(() => {
     supabase.auth.getSession().then(({ data: { session } }) => {
       if (!session) router.push("/Login");
     });
   }, []);

  async function create() {
    setLoading(true);
    const session = await supabase.auth.getSession();
    const token = session.data.session?.access_token;

    const res = await fetch("http://localhost:3001/api/itineraries", {
      method: "POST",
      headers: { "Content-Type": "application/json", token: token || "" },
      body: JSON.stringify({ destination, startDate, endDate, preferences }),
    });

    const data = await res.json();
    if (!data.error) {
      router.push(`/itineraries/${data.itinerary.id}`);
    } else {
      alert(data.error);
    }
    setLoading(false);
  }

  return (
    <main className="p-8 max-w-md mx-auto">
      <h1 className="text-2xl mb-4">Create New Itinerary</h1>
      <input
        type="text"
        placeholder="Destination"
        value={destination}
        onChange={(e) => setDestination(e.target.value)}
        className="border rounded p-2 w-full mb-2"
      />
      <input
        type="date"
        value={startDate}
        onChange={(e) => setStartDate(e.target.value)}
        className="border rounded p-2 w-full mb-2"
      />
      <input
        type="date"
        value={endDate}
        onChange={(e) => setEndDate(e.target.value)}
        className="border rounded p-2 w-full mb-2"
      />
      <textarea
        placeholder="Preferences"
        value={preferences}
        onChange={(e) => setPreferences(e.target.value)}
        className="border rounded p-2 w-full mb-4"
      />
      <button
        onClick={create}
        disabled={loading}
        className="bg-blue-600 text-white py-2 px-4 rounded w-full"
      >
        {loading ? "Creating..." : "Create Itinerary"}
      </button>
    </main>
  );
}
