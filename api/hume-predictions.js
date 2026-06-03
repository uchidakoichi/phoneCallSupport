module.exports = async function handler(req, res) {
  const apiKey = process.env.HUME_API_KEY;
  if (!apiKey) return res.status(503).json({ error: 'HUME_NOT_CONFIGURED' });

  const jobId = req.query.jobId;
  if (!jobId) return res.status(400).json({ error: 'Missing jobId' });

  try {
    const response = await fetch('https://api.hume.ai/v0/batch/jobs/' + jobId + '/predictions', {
      headers: { 'X-Hume-Api-Key': apiKey },
    });
    const data = await response.json();
    if (!response.ok) return res.status(response.status).json({ error: 'HUME_ERROR' });
    return res.status(200).json(data);
  } catch (_) {
    return res.status(500).json({ error: 'FETCH_ERROR' });
  }
};
