require('dotenv').config();
const express = require('express');
const cors = require('cors');
const { createClient } = require('@supabase/supabase-js');
const axios = require('axios');

const app = express();
const PORT = process.env.PORT || 3001;

app.use(cors());
app.use(express.json());

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL,
  process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY
);

// Middleware: Auth
async function authenticate(req, res, next) {
  const token = req.headers.token;
  if (!token) return res.status(401).json({ error: 'Unauthorized' });

  const { data: { user }, error } = await supabase.auth.getUser(token);
  if (error || !user) return res.status(401).json({ error: 'Unauthorized' });

  req.user = user;
  next();
}

// ---------- Helpers ----------
function buildChatPrompt({ currentItinerary, history, userMessage, meta }) {
  const historyText = history
    .map((c) => `${c.role === 'assistant' ? 'Assistant' : 'User'}: ${c.content}`)
    .join('\n');

  const system = `
You are an expert travel planner. You ALWAYS return TWO parts separated by the literal delimiter "||||".

Rules:
1) Read the user's request and the CURRENT itinerary.
2) If changes are requested, update the itinerary accordingly (day-by-day).
3) If no change is needed, keep the itinerary as-is.
4) Return the FINAL itinerary in the required format.
5) Output format EXACTLY:
   <assistant_chat_reply_for_user>
   ||||
   <final_day_by_day_itinerary>
   
Formatting for the day-by-day itinerary:
- Day 1 (YYYY-MM-DD): <title>
  - Morning: ...
  - Afternoon: ...
  - Evening: ...
- Day 2 (...): ...
(continue for all days)

Keep the delimiter EXACTLY as "||||".
  `.trim();

  const metaLine = `Trip: ${meta?.title || ''} (${meta?.start_date || ''} → ${meta?.end_date || ''})`;

  const userBlock = `
${metaLine}

CURRENT ITINERARY (edit if needed):
${currentItinerary || '(empty)'}

Conversation so far:
${historyText}

User: ${userMessage}

Assistant: (Remember: reply for the chat first, then "||||", then the FINAL itinerary)
`.trim();

  return `${system}\n\n${userBlock}`;
}

function buildInitialItineraryPrompt({ destination, startDate, endDate, preferences }) {
  const system = `
You are an expert travel planner. Create a complete day-by-day itinerary and also provide a short friendly message for the user.
Return TWO parts separated by the literal delimiter "||||".
Part 1: A short assistant chat reply (1-3 lines) explaining you've created the itinerary.
Part 2: The FULL day-by-day itinerary in the exact format below.

Format:
- Day 1 (${startDate}): <title>
  - Morning: ...
  - Afternoon: ...
  - Evening: ...
- Day 2: ...
(continue until ${endDate})

Always include dates in "Day X (YYYY-MM-DD)" if you can infer them. If not given, still structure by Day X.
Keep the delimiter EXACTLY as "||||".
`.trim();

  const user = `
Please create an itinerary.

Inputs:
- Destination: ${destination}
- Start Date: ${startDate}
- End Date: ${endDate}
- Preferences: ${preferences}
`.trim();

  return `${system}\n\n${user}`;
}

async function callGemini(promptText) {
  const requestBody = {
    contents: [
      { role: "user", parts: [{ text: promptText }] }
    ],
  };

  const response = await axios.post(
    'https://generativelanguage.googleapis.com/v1beta/models/gemini-2.5-pro:generateContent',
    requestBody,
    {
      headers: {
        'Content-Type': 'application/json',
        'x-goog-api-key': process.env.GEMINI_API_KEY,
      },
    }
  );

  const text = response?.data?.candidates?.[0]?.content?.parts?.[0]?.text || "No response";
  return text;
}

// ---------- Routes ----------

app.post('/api/itineraries', authenticate, async (req, res) => {
  const { destination, startDate, endDate, preferences } = req.body;
  if (!destination || !startDate || !endDate) {
    return res.status(400).json({ error: 'Missing required fields' });
  }

  const title = `Trip to ${destination}`;

  try {
    const { data: itinerary, error: insertError } = await supabase
      .from('itineraries')
      .insert({
        user_id: req.user.id,
        title,
        start_date: startDate,
        end_date: endDate,
        preferences,
        itinerary_text: '' 
      })
      .select()
      .single();

    if (insertError) throw insertError;

    const promptText = buildInitialItineraryPrompt({ destination, startDate, endDate, preferences });
    const modelText = await callGemini(promptText);

    const [aiReply, itineraryPart] = modelText.split("||||").map(s => (s || "").trim());

    await supabase.from('chats').insert([
      { itinerary_id: itinerary.id, role: 'user', content: `Create itinerary for ${destination} (${startDate} → ${endDate}) with focus: ${preferences}` },
      { itinerary_id: itinerary.id, role: 'assistant', content: aiReply || "Itinerary created." },
    ]);

    await supabase
      .from('itineraries')
      .update({ itinerary_text: itineraryPart || '' })
      .eq('id', itinerary.id);

    res.json({ itinerary, combinedMessage: `${aiReply || ""}||||${itineraryPart || ""}` });
  } catch (error) {
    console.error(error.response?.data || error.message || error);
    res.status(500).json({ error: 'Failed to create itinerary' });
  }
});

app.get('/api/itineraries', authenticate, async (req, res) => {
  try {
    const { data, error } = await supabase
      .from('itineraries')
      .select('*')
      .eq('user_id', req.user.id)
      .order('updated_at', { ascending: false });

    if (error) throw error;
    res.json(data);
  } catch (error) {
    res.status(500).json({ error: 'Failed to fetch itineraries' });
  }
});

app.get('/api/itineraries/:id/chats', authenticate, async (req, res) => {
  const { id } = req.params;
  try {
    const { data: itinerary, error: itError } = await supabase
      .from('itineraries')
      .select('id')
      .eq('id', id)
      .eq('user_id', req.user.id)
      .single();

    if (itError || !itinerary) return res.status(404).json({ error: 'Not found' });

    const { data: chats, error: chatError } = await supabase
      .from('chats')
      .select('*')
      .eq('itinerary_id', id)
      .order('created_at');

    if (chatError) throw chatError;

    res.json(chats);
  } catch (error) {
    res.status(500).json({ error: 'Failed to fetch chat history' });
  }
});

app.get('/api/itineraries/:id/state', authenticate, async (req, res) => {
  const { id } = req.params;
  try {
    const { data: itinerary, error } = await supabase
      .from('itineraries')
      .select('title,start_date,end_date,itinerary_text')
      .eq('id', id)
      .eq('user_id', req.user.id)
      .single();

    if (error || !itinerary) return res.status(404).json({ error: 'Not found' });

    res.json(itinerary);
  } catch (error) {
    res.status(500).json({ error: 'Failed to fetch itinerary state' });
  }
});

app.post('/api/itineraries/:id/chat', authenticate, async (req, res) => {
  const { id } = req.params;
  const { message } = req.body;
  if (!message) return res.status(400).json({ error: 'Message is required' });

  try {
    const { data: itinerary } = await supabase
      .from('itineraries')
      .select('id,title,start_date,end_date,itinerary_text')
      .eq('id', id)
      .eq('user_id', req.user.id)
      .single();

    if (!itinerary) return res.status(404).json({ error: 'Not found' });

    const { data: chats } = await supabase
      .from('chats')
      .select('role,content')
      .eq('itinerary_id', id)
      .order('created_at');

    const promptText = buildChatPrompt({
      currentItinerary: itinerary.itinerary_text || '',
      history: chats || [],
      userMessage: message,
      meta: {
        title: itinerary.title,
        start_date: itinerary.start_date,
        end_date: itinerary.end_date,
      },
    });

    const modelText = await callGemini(promptText);
    const [aiReplyRaw, itineraryPartRaw] = modelText.split("||||");
    const aiReply = (aiReplyRaw || "").trim();
    const itineraryPart = (itineraryPartRaw || "").trim();

    await supabase.from('chats').insert([
      { itinerary_id: id, role: 'user', content: message },
      { itinerary_id: id, role: 'assistant', content: aiReply || "Done." },
    ]);

    await supabase
      .from('itineraries')
      .update({
        itinerary_text: itineraryPart || itinerary.itinerary_text || '',
        updated_at: new Date().toISOString(),
      })
      .eq('id', id);

    res.json({ combinedMessage: `${aiReply || ""}||||${itineraryPart || itinerary.itinerary_text || ""}` });
  } catch (error) {
    console.error(error.response?.data || error.message || error);
    res.status(500).json({ error: 'Failed to process message' });
  }
});

app.put('/api/itineraries/:id/rename', authenticate, async (req, res) => {
  const { id } = req.params;
  const { newTitle } = req.body;
  if (!newTitle) return res.status(400).json({ error: 'New title required' });

  try {
    const { error } = await supabase
      .from('itineraries')
      .update({ title: newTitle, updated_at: new Date().toISOString() })
      .eq('id', id)
      .eq('user_id', req.user.id);

    if (error) throw error;
    res.json({ message: 'Renamed' });
  } catch (error) {
    res.status(500).json({ error: 'Failed to rename' });
  }
});

app.delete('/api/itineraries/:id', authenticate, async (req, res) => {
  const { id } = req.params;

  console.log("Delete request for itinerary id:", id);
  console.log("User id from token:", req.user?.id);

  try {
    if (!req.user || !req.user.id) {
      return res.status(401).json({ error: "Unauthorized: no user info" });
    }

    // تأكد إن الرحلة موجودة ومملوكة للمستخدم
    const { data: itinerary, error: findError } = await supabase
      .from('itineraries')
      .select('id')
      .eq('id', id)
      .eq('user_id', req.user.id)
      .single();

    if (findError || !itinerary) {
      console.log("No itinerary found or not authorized to delete");
      return res.status(404).json({ error: "Not found or unauthorized" });
    }

    const { error: deleteChatsError } = await supabase
      .from('chats')
      .delete()
      .eq('itinerary_id', id);

    if (deleteChatsError) {
      console.error("Error deleting related chats:", deleteChatsError);
      throw deleteChatsError;
    }

    const { error: deleteItineraryError } = await supabase
      .from('itineraries')
      .delete()
      .eq('id', id)
      .eq('user_id', req.user.id);

    if (deleteItineraryError) {
      console.error("Delete itinerary error:", deleteItineraryError);
      throw deleteItineraryError;
    }

    res.json({ message: 'Deleted' });
  } catch (error) {
    console.error("Deletion failed:", error);
    res.status(500).json({ error: 'Failed to delete' });
  }
});



app.listen(PORT, () => {
  console.log(`Server running on http://localhost:${PORT}`);
});
