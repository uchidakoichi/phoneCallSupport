module.exports = async function handler(req, res) {
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  const apiKey = process.env.HUME_API_KEY;
  if (!apiKey) {
    return res.status(503).json({ error: 'HUME_NOT_CONFIGURED' });
  }

  const { audio, mimeType } = req.body || {};
  if (!audio || typeof audio !== 'string') {
    return res.status(400).json({ error: 'Invalid audio data' });
  }

  try {
    const buffer = Buffer.from(audio, 'base64');
    const blob   = new Blob([buffer], { type: mimeType || 'audio/webm' });

    const fd = new FormData();
    fd.append('json', JSON.stringify({ models: { prosody: {} } }));
    fd.append('file', blob, 'rec.webm');

    const response = await fetch('https://api.hume.ai/v0/batch/jobs', {
      method:  'POST',
      headers: { 'X-Hume-Api-Key': apiKey },
      body:    fd,
    });

    const data = await response.json();
    if (!response.ok || !data.job_id) {
      return res.status(response.status || 500).json({ error: 'HUME_ERROR' });
    }

    return res.status(200).json({ jobId: data.job_id });
  } catch (_) {
    return res.status(500).json({ error: 'FETCH_ERROR' });
  }
};
