import { createClient } from '@supabase/supabase-js';

const supabase = createClient(
  process.env.SUPABASE_URL,
  process.env.SUPABASE_SERVICE_KEY
);

export default async function handler(req, res) {
  // Verifica API Key per admin
  const apiKey = req.headers['x-api-key'];
  if (apiKey !== process.env.API_SECRET) {
    return res.status(401).json({ 
      success: false, 
      error: 'Non autorizzato' 
    });
  }

  try {
    const { data, error } = await supabase.rpc('get_all_devices');

    if (error) throw error;

    res.status(200).json(data);

  } catch (error) {
    console.error('Errore:', error);
    res.status(500).json({
      success: false,
      error: 'Errore recupero dispositivi'
    });
  }
}
