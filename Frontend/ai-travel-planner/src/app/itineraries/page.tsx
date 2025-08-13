"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { supabase } from "../../lib/supabase";
import Link from "next/link";


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
  const API_URL = process.env.NEXT_PUBLIC_API_URL || "http://localhost:3001";

  useEffect(() => {
    supabase.auth.getSession().then(({ data: { session } }) => {
      if (!session) router.push("/Login");
      else fetchItineraries(session.access_token);
    });
  }, []);

  async function fetchItineraries(token: string) {
    const res = await fetch(`${API_URL}/api/itineraries`, {
      headers: { token },
    });
    const data = await res.json();
    setItineraries(data);
    setLoading(false);
  }

  if (loading) return <div>Loading itineraries...</div>;

  return (
    <main className="p-8 max-w-4xl mx-auto">
      <h1 className="text-3xl mb-6">Your Itineraries</h1>
      {itineraries.length === 0 ? (
        <Link href={"/itineraries/new"}>
        <p>No itineraries yet.</p>  Create one!
        </Link>
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
