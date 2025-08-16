import { createClient } from '@supabase/supabase-js';
import jwt from 'jsonwebtoken';

const supabase = createClient(
  process.env.SUPABASE_URL,
  process.env.SUPABASE_SERVICE_KEY
);

export default async function handler(req, res) {
  // Solo GET
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

  // Verifica token (opzionale per ora)
  const token = req.headers['authorization']?.replace('Bearer ', '');
  
  if (token) {
    try {
      const decoded = jwt.verify(token, process.env.JWT_SECRET);
      if (decoded.mac !== mac) {
        return res.status(403).json({
          success: false,
          error: 'Token non valido per questo dispositivo'
        });
      }
    } catch (error) {
      // Token non valido, continua senza
      console.log('Token non valido:', error.message);
    }
  }

  try {
    // Ottieni playlist da Supabase
    const { data, error } = await supabase.rpc('get_device_playlist', {
      p_mac_address: mac
    });

    if (error) throw error;

    if (!data || !data.success) {
      return res.status(404).json({
        success: false,
        error: 'Dispositivo non trovato. Registralo su app.burgtv.com'
      });
    }

    // Controlla trial
    const deviceData = data.data;
    const daysRemaining = deviceData.days_remaining || 0;

    if (daysRemaining <= 0) {
      return res.status(402).json({
        success: false,
        trial_expired: true,
        message: 'Prova gratuita scaduta',
        payment_url: 'https://burgtv.com/payment'
      });
    }

    // Ritorna playlist
    res.status(200).json({
      success: true,
      playlist: deviceData.m3u_url,
      epg: deviceData.epg_url,
      device_type: deviceData.device_type,
      trial_days: daysRemaining,
      message: `Trial attivo - ${daysRemaining} giorni rimanenti`
    });

  } catch (error) {
    console.error('Errore:', error);
    res.status(500).json({
      success: false,
      error: 'Errore nel recupero playlist'
    });
  }
}
