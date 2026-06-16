module.exports = async function handler(req, res) {
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  const { audio, mimeType } = req.body || {};
  if (!audio || typeof audio !== 'string') {
    return res.status(400).json({ error: 'Invalid audio data' });
  }

  const apiKey = process.env.GEMINI_API_KEY;
  if (!apiKey) {
    return res.status(503).json({ error: 'VOICE_NOT_CONFIGURED' });
  }

  const instruction = [
    'あなたは電話の話し方コーチです。添付の日本語音声を聞いて、次を JSON で返してください。',
    '1. transcript: 話している内容の文字起こし（聞き取れない場合は空文字）。',
    '2. confidence/anxiety/energy/calmness: 声の自信度・不安度・エネルギー・落ち着きを 0〜100 の整数で評価。',
    '3. impressions: 声から感じた印象を表す日本語の語を 3〜5 個。',
    '話し方（声の大きさ・抑揚・間・スピード・落ち着き）から評価してください。',
  ].join('\n');

  try {
    const response = await fetch(
      'https://generativelanguage.googleapis.com/v1beta/models/gemini-2.5-flash:generateContent?key=' + apiKey,
      {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          contents: [{
            role: 'user',
            parts: [
              { text: instruction },
              { inline_data: { mime_type: mimeType || 'audio/wav', data: audio } },
            ],
          }],
          generationConfig: {
            temperature: 0.4,
            maxOutputTokens: 1024,
            thinkingConfig: { thinkingBudget: 0 },
            responseMimeType: 'application/json',
            responseSchema: {
              type: 'OBJECT',
              properties: {
                transcript: { type: 'STRING' },
                confidence: { type: 'INTEGER' },
                anxiety:    { type: 'INTEGER' },
                energy:     { type: 'INTEGER' },
                calmness:   { type: 'INTEGER' },
                impressions: { type: 'ARRAY', items: { type: 'STRING' } },
              },
              required: ['transcript', 'confidence', 'anxiety', 'energy', 'calmness'],
            },
          },
        }),
      }
    );

    const data = await response.json();
    if (!response.ok) {
      if (response.status === 429 || response.status === 503) return res.status(429).json({ error: 'RATE_LIMIT' });
      return res.status(response.status).json({ error: 'VOICE_ERROR' });
    }

    const parts = data?.candidates?.[0]?.content?.parts;
    const raw = Array.isArray(parts) ? parts.map(function (p) { return p.text || ''; }).join('') : '';
    let parsed;
    try { parsed = JSON.parse(raw); } catch (_) { return res.status(500).json({ error: 'PARSE_ERROR' }); }

    const clamp = function (v) { return Math.max(0, Math.min(100, Math.round(Number(v) || 0))); };
    const scores = {
      confidence: clamp(parsed.confidence),
      anxiety:    clamp(parsed.anxiety),
      energy:     clamp(parsed.energy),
      calmness:   clamp(parsed.calmness),
      top5: Array.isArray(parsed.impressions) ? parsed.impressions.filter(function (s) { return typeof s === 'string' && s; }).slice(0, 5) : [],
    };

    return res.status(200).json({ transcript: typeof parsed.transcript === 'string' ? parsed.transcript : '', scores });
  } catch (_) {
    return res.status(500).json({ error: 'FETCH_ERROR' });
  }
};
