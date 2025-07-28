"use client";

import { useState } from "react";

export default function Home() {
  const [destination, setDestination] = useState("");
  const [startDate, setStartDate] = useState("");
  const [endDate, setEndDate] = useState("");
  const [preferences, setPreferences] = useState("");
  const [loading, setLoading] = useState(false);
  const [itinerary, setItinerary] = useState("");

  const handleSubmit = async (e: any) => {
    e.preventDefault();
    setLoading(true);

    const res = await fetch("http://localhost:3001/api/itinerary", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ destination, startDate, endDate, preferences }),
    });

    const data = await res.json();
    setItinerary(data.itinerary);
    setLoading(false);
  };

  return (
    <main className="min-h-screen bg-gray-100 p-8">
      <h1 className="text-4xl font-bold mb-6 text-center">
        🌍 AI Travel Itinerary Planner
      </h1>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-8 max-w-6xl mx-auto text-black">
        {/* Input Panel */}
        <form
          onSubmit={handleSubmit}
          className="bg-white shadow p-6 rounded-lg space-y-4"
        >
          <label className="block">
            <span className="text-gray-700 font-semibold">Destination</span>
            <input
              className="mt-1 w-full border rounded p-2"
              value={destination}
              onChange={(e) => setDestination(e.target.value)}
              placeholder="e.g. Tokyo, Japan"
              required
            />
          </label>

          <div className="flex gap-4">
            <label className="flex-1">
              <span className="text-gray-700 font-semibold">Start Date</span>
              <input
                type="date"
                className="mt-1 w-full border rounded p-2"
                value={startDate}
                onChange={(e) => setStartDate(e.target.value)}
                required
              />
            </label>

            <label className="flex-1">
              <span className="text-gray-700 font-semibold">End Date</span>
              <input
                type="date"
                className="mt-1 w-full border rounded p-2"
                value={endDate}
                onChange={(e) => setEndDate(e.target.value)}
                required
              />
            </label>
          </div>

          <label className="block">
            <span className="text-gray-700 font-semibold">
              Travel Preferences
            </span>
            <input
              className="mt-1 w-full border rounded p-2"
              value={preferences}
              onChange={(e) => setPreferences(e.target.value)}
              placeholder="e.g. Food, Culture, Adventure"
              required
            />
          </label>

          <button
            type="submit"
            className="bg-blue-600 text-white py-2 px-4 rounded hover:bg-blue-700 transition"
          >
            {loading ? "Generating..." : "Generate Itinerary"}
          </button>
        </form>

        {/* Output Panel */}
        <div className="bg-white shadow p-6 rounded-lg overflow-auto">
          <h2 className="text-xl font-bold mb-4">🗓️ Itinerary</h2>
          {itinerary ? (
            itinerary
              .split("*   ")
              .filter((section) => section.trim() !== "")
              .map((section, index) => {
                const lines = section.split(/:\s*/);
                const title = lines[0]?.replace(/\*\*/g, "").trim();
                const bulletPoints =
                  lines[1]?.split(/[,•\-]\s+/).filter((line) => line.trim() !== "");

                return (
                  <div
                    key={index}
                    className="mb-4 p-4 border rounded-lg shadow-sm bg-gray-50"
                  >
                    <h3 className="text-lg font-semibold text-blue-700 mb-2">
                      {title}
                    </h3>
                    <ul className="list-disc list-inside text-gray-800 space-y-1">
                      {bulletPoints?.map((point, i) => (
                        <li key={i}>{point.trim()}</li>
                      ))}
                    </ul>
                  </div>
                );
              })
          ) : (
            <p className="text-gray-500">
              Your personalized itinerary will appear here...
            </p>
          )}
        </div>
      </div>
    </main>
  );
}
