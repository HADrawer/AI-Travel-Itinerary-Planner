"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { supabase } from "../lib/supabase";
import LogoutButton from "./components/LogoutButtons";
import Link from "next/link";

interface Itinerary {
  id: string;
  title: string;
  start_date: string;
  end_date: string;
  updated_at: string;
}

export default function ItineraryList() {
  const API_URL = process.env.NEXT_PUBLIC_API_URL || "http://localhost:3001";
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
    const res = await fetch(`${API_URL}/api/itineraries`, {
      headers: { token },
    });
    const data = await res.json();
    setItineraries(data);
    setLoading(false);
  }

  async function handleDelete(id: string) {
    if (!confirm("Are you sure you want to delete this itinerary?")) return;

    const session = await supabase.auth.getSession();
    const token = session.data.session?.access_token || "";

    try {
      const res = await fetch(`${API_URL}/api/itineraries/${id}`, {
        method: "DELETE",
        headers: { token },
      });

      if (!res.ok) throw new Error("Failed to delete itinerary");

      setItineraries((prev) => prev.filter((item) => item.id !== id));
    } catch (error) {
      alert("An error occurred while deleting the itinerary. Please try again");
      console.error(error);
    }
  }

  if (loading) return <div>Loading itineraries...</div>;

  return (
    <main className="p-8 max-w-4xl mx-auto">
      <LogoutButton />
      <h1 className="text-3xl mb-6">Your Itineraries</h1>
      {itineraries.length === 0 ? (
        <>
          <h1>No itineraries yet.</h1> 
          <Link href={"/itineraries/new"}>
          <button className="bg-blue-500 text-white px-4 py-2 rounded hover:bg-blue-600 transition">
             Create one!
          </button>
          </Link>
        </>
      ) : (
        <>
            <Link href={"/itineraries/new"}>
          <button className="bg-blue-500 text-white px-4 py-2 rounded hover:bg-blue-600 transition">
             Create one!
          </button>
          </Link>
          <br />
          <br />

          <ul>
            {itineraries.map((item) => (
              <li
                key={item.id}
                className="mb-4 p-4 border rounded shadow flex justify-between items-center"
              >
                <div>
                  <h2 className="text-xl font-semibold">{item.title}</h2>
                  <p>
                    {item.start_date} - {item.end_date}
                  </p>
                  <p className="text-sm text-gray-500">
                    Last updated: {new Date(item.updated_at).toLocaleString()}
                  </p>
                </div>
                <div className="flex gap-2">
                  <button
                    onClick={() => router.push(`/itineraries/${item.id}`)}
                    className="bg-blue-600 text-white px-4 py-2 rounded"
                  >
                    Open
                  </button>
                  <button
                    onClick={() => handleDelete(item.id)}
                    className="bg-red-600 text-white px-4 py-2 rounded hover:bg-red-700 transition"
                  >
                    Delete
                  </button>
                </div>
              </li>
            ))}
          </ul>
        </>
      )}
    </main>
  );
}
