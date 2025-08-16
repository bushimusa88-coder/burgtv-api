import { createClient } from '@supabase/supabase-js';

const supabase = createClient(
  process.env.SUPABASE_URL,
  process.env.SUPABASE_SERVICE_KEY
);

export default async function handler(req, res) {
  if (req.method !== 'GET') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  const { mac } = req.query;

  if (!mac) {
    return res.status(400).json({
      success: false,
      error: 'MAC address mancante'
    });
  }

  try {
    const { data, error } = await supabase.rpc('check_trial_status', {
      p_mac_address: mac
    });

    if (error) throw error;

    res.status(200).json(data);

  } catch (error) {
    console.error('Errore:', error);
    res.status(500).json({
      success: false,
      error: 'Errore controllo trial'
    });
  }
}
