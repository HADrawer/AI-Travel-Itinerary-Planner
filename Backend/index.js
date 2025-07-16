require("dotenv").config();
const express = require("express");
const axios = require("axios");
const app = express();
const PORT = 3001;

app.use(express.json());
const cors = require("cors");
app.use(cors());




app.post("/api/itinerary", async (req, res) => {
  const { destination, startDate, endDate, preferences } = req.body;

  if (!destination || !startDate || !endDate || !preferences) {
    return res.status(400).json({ error: "All fields are required." });
  }

const prompt = `
    Please generate a day-by-day travel itinerary from ${startDate} to ${endDate} for a trip to ${destination}, focusing on ${preferences}.
    Format the output like this example:
    - Day 1 (DATE): Activity 1, Activity 2, Activity 3
    - Day 2 (DATE): ...
    Keep it concise, clear, and in bullet points.
    `;

  const modelName = "models/gemini-2.5-pro";
  
  try {
    const response = await axios.post(
      `https://generativelanguage.googleapis.com/v1beta/${modelName}:generateContent`,
      {
        contents: [
          {
            parts: [{ text: prompt }],
            role: "user"
          }
        ]
      },
      {
        headers: {
          "Content-Type": "application/json",
          "x-goog-api-key": process.env.GEMINI_API_KEY
        }
      }
    );

    const reply = response.data.candidates[0].content.parts[0].text;
    res.json({ itinerary: reply });

  } catch (error) {
    console.error("Gemini API Error:", error.response?.data || error.message);
    res.status(500).json({ error: "Failed to generate itinerary using Gemini API." });
  }
});

app.listen(PORT , () => {
  console.log(`Server is running on http://localhost:${PORT }`);
});
