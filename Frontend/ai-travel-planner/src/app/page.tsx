"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { supabase } from "../lib/supabase";
import LogoutButton from "./components/LogoutButtons";

interface Itinerary {
  id: string;
  title: string;
  start_date: string;
  end_date: string;
  updated_at: string;
}

export default function ItineraryList() {
  const router = useRouter();
  const [itineraries, setItineraries] = useState<Itinerary[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    supabase.auth.getSession().then(({ data: { session } }) => {
      if (!session) router.push("/Login");
      else fetchItineraries(session.access_token);
    });
  }, []);

  async function fetchItineraries(token: string) {
    const res = await fetch("http://localhost:3001/api/itineraries", {
      headers: { token },
    });
    const data = await res.json();
    setItineraries(data);
    setLoading(false);
  }

  if (loading) return <div>Loading itineraries...</div>;

  return (

    <main className="p-8 max-w-4xl mx-auto">
            <LogoutButton/>
      <h1 className="text-3xl mb-6">Your Itineraries</h1>
      {itineraries.length === 0 ? (
        <>
        <p>No itineraries yet.</p> <a href="/itineraries/new"> Create one!</a>
        </>
      ) : (
        <ul>
          {itineraries.map((item) => (
            <li key={item.id} className="mb-4 p-4 border rounded shadow flex justify-between items-center">
              <div>
                <h2 className="text-xl font-semibold">{item.title}</h2>
                <p>{item.start_date} - {item.end_date}</p>
                <p className="text-sm text-gray-500">Last updated: {new Date(item.updated_at).toLocaleString()}</p>
              </div>
              <div>
                <button
                  onClick={() => router.push(`/itineraries/${item.id}`)}
                  className="bg-blue-600 text-white px-4 py-2 rounded"
                >
                  Open
                </button>
              </div>
            </li>
          ))}
        </ul>
      )}
    </main>
  );
}
