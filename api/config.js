module.exports = function handler(req, res) {
  var supabaseUrl     = process.env.SUPABASE_URL;
  var supabaseAnonKey = process.env.SUPABASE_ANON_KEY;

  res.setHeader('Cache-Control', 'public, max-age=3600');
  return res.status(200).json({
    supabaseUrl:     supabaseUrl     || null,
    supabaseAnonKey: supabaseAnonKey || null,
    hasHumeKey:      !!process.env.HUME_API_KEY,
  });
};
