import { createClient } from '@supabase/supabase-js';
import jwt from 'jsonwebtoken';

const supabase = createClient(
  process.env.SUPABASE_URL,
  process.env.SUPABASE_SERVICE_KEY
);

// Validazione MAC
function isValidMAC(mac) {
  const macRegex = /^([0-9A-Fa-f]{2}[:-]){5}([0-9A-Fa-f]{2})$/;
  return macRegex.test(mac);
}

// Validazione URL
function isValidURL(url) {
  try {
    new URL(url);
    return true;
  } catch {
    return false;
  }
}

export default async function handler(req, res) {
  // Solo POST
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  // Verifica API Key
  const apiKey = req.headers['x-api-key'];
  if (apiKey !== process.env.API_SECRET) {
    return res.status(401).json({ 
      success: false, 
      error: 'Non autorizzato' 
    });
  }

  try {
    const { mac_address, device_type, device_name, m3u_url, epg_url } = req.body;

    // Validazione
    if (!mac_address || !device_type || !m3u_url) {
      return res.status(400).json({
        success: false,
        error: 'Dati mancanti'
      });
    }

    if (!isValidMAC(mac_address)) {
      return res.status(400).json({
        success: false,
        error: 'MAC address non valido'
      });
    }

    if (!isValidURL(m3u_url)) {
      return res.status(400).json({
        success: false,
        error: 'URL playlist non valido'
      });
    }

    // Registra in Supabase
    const { data, error } = await supabase.rpc('register_device', {
      p_mac_address: mac_address,
      p_device_type: device_type,
      p_device_name: device_name || null,
      p_m3u_url: m3u_url,
      p_epg_url: epg_url || null
    });

    if (error) {
      console.error('Supabase error:', error);
      throw error;
    }

    // Genera token JWT
    const token = jwt.sign(
      { 
        mac: mac_address,
        type: 'device',
        iat: Date.now()
      },
      process.env.JWT_SECRET,
      { expiresIn: '30d' }
    );

    // Risposta successo
    res.status(200).json({
      success: true,
      message: 'Dispositivo registrato con successo',
      token: token,
      data: data
    });

  } catch (error) {
    console.error('Errore:', error);
    res.status(500).json({
      success: false,
      error: 'Errore interno del server'
    });
  }
}
