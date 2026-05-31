module.exports = async function handler(req, res) {
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  const { audio, mimeType } = req.body || {};
  if (!audio || typeof audio !== 'string') {
    return res.status(400).json({ error: 'Invalid audio data' });
  }

  const apiKey = process.env.GROQ_API_KEY;
  if (!apiKey) {
    return res.status(500).json({ error: 'Server configuration error' });
  }

  try {
    const buffer = Buffer.from(audio, 'base64');
    const blob = new Blob([buffer], { type: mimeType || 'audio/webm' });

    const fd = new FormData();
    fd.append('file', blob, 'rec.webm');
    fd.append('model', 'whisper-large-v3');
    fd.append('language', 'ja');

    const response = await fetch('https://api.groq.com/openai/v1/audio/transcriptions', {
      method: 'POST',
      headers: { 'Authorization': `Bearer ${apiKey}` },
      body: fd,
    });

    const data = await response.json();
    if (!response.ok) return res.status(response.status).json({ error: 'TRANSCRIBE_ERROR' });

    return res.status(200).json({ text: data.text || '' });
  } catch (_) {
    return res.status(500).json({ error: 'FETCH_ERROR' });
  }
};
