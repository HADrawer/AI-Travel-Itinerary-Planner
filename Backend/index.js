require('dotenv').config();
const express = require('express');
const cors = require('cors');
const { createClient } = require('@supabase/supabase-js');
const axios = require('axios');

const app = express();
const PORT = process.env.PORT || 3001;

app.use(cors());
app.use(express.json());

const supabase = createClient(process.env.NEXT_PUBLIC_SUPABASE_URL, process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY);

async function authenticate(req, res, next) {
  const token = req.headers.token;
  if (!token) return res.status(401).json({ error: 'Unauthorized' });

  const { data: { user }, error } = await supabase.auth.getUser(token);
  if (error || !user) return res.status(401).json({ error: 'Unauthorized' });

  req.user = user;
  next();
}

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
      })
      .select()
      .single();

    if (insertError) throw insertError;

const promptText = `Generate a detailed day-by-day itinerary for a trip to ${destination} from ${startDate} to ${endDate}, focusing on: ${preferences}. 
Format the output like this example exactly:

Form Inputs (user fills out before chat appears):

- Start Date: ${startDate}
- End Date: ${endDate}
- Trip Description: "${preferences}"

AI Output (day-by-day itinerary):

- Day 1 (${startDate}): Title of the day
    - Morning: ...
    - Afternoon: ...
    - Evening: ...
- Day 2 (next day): ...
- Continue for each day until ${endDate}.`;

    const requestBody = {
      contents: [
        {
          role: "user",
          parts: [{ text: promptText }],
        },
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

    const aiReply = response.data.candidates?.[0]?.content?.parts?.[0]?.text || "No response";

    await supabase.from('chats').insert([
      { itinerary_id: itinerary.id, role: 'user', content: promptText },
      { itinerary_id: itinerary.id, role: 'assistant', content: aiReply },
    ]);

    res.json({ itinerary, aiReply });
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

app.post('/api/itineraries/:id/chat', authenticate, async (req, res) => {
  const { id } = req.params;
  const { message } = req.body;
  if (!message) return res.status(400).json({ error: 'Message is required' });

  try {
    const { data: itinerary } = await supabase
      .from('itineraries')
      .select('*')
      .eq('id', id)
      .eq('user_id', req.user.id)
      .single();

    if (!itinerary) return res.status(404).json({ error: 'Not found' });

    const { data: chats } = await supabase
      .from('chats')
      .select('*')
      .eq('itinerary_id', id)
      .order('created_at');

    const fullConversationText = chats.map(c => `${c.role === 'assistant' ? 'Assistant' : 'User'}: ${c.content}`).join('\n');
    const promptText = fullConversationText + `\nUser: ${message}\nAssistant:`;

    const requestBody = {
      contents: [
        {
          role: "user",
          parts: [{ text: promptText }],
        },
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

    const aiReply = response.data.candidates?.[0]?.content?.parts?.[0]?.text || "No response";

    await supabase.from('chats').insert([
      { itinerary_id: id, role: 'user', content: message },
      { itinerary_id: id, role: 'assistant', content: aiReply },
    ]);

    await supabase
      .from('itineraries')
      .update({ updated_at: new Date().toISOString() })
      .eq('id', id);

    res.json({ aiReply });
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
    const { data, error } = await supabase
      .from('itineraries')
      .update({ title: newTitle })
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
  try {
    const { error } = await supabase
      .from('itineraries')
      .delete()
      .eq('id', id)
      .eq('user_id', req.user.id);

    if (error) throw error;
    res.json({ message: 'Deleted' });
  } catch (error) {
    res.status(500).json({ error: 'Failed to delete' });
  }
});

app.listen(PORT, () => {
  console.log(`Server running on http://localhost:${PORT}`);
});
