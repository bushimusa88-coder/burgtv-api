# 🚀 BurgTV API - Deployment Guide

## ✅ API Completamente Creata!

L'API è **pronta per il deployment**. Ecco i passi per metterla online:

## 📋 Checklist Pre-Deployment

### 1. Database Setup (Supabase)
```sql
-- Vai su https://supabase.com/dashboard
-- Apri il tuo progetto BurgTV
-- Vai su SQL Editor
-- Copia e incolla il contenuto di: database/schema.sql
-- Esegui lo script per creare tabelle e funzioni
```

### 2. GitHub Repository
```bash
# Nella cartella burgtv-api/
git init
git add .
git commit -m "🚀 Initial BurgTV API setup"

# Crea repo su GitHub chiamato "burgtv-api"
git remote add origin https://github.com/TUO-USERNAME/burgtv-api.git
git branch -M main
git push -u origin main
```

### 3. Vercel Deployment
```bash
# Installa Vercel CLI
npm install -g vercel

# Login a Vercel
vercel login

# Deploy
cd burgtv-api
vercel

# Configurazione:
# Project name: burgtv-api
# Framework: Next.js
# Root directory: ./
# Override settings: No
```

## 🔧 Environment Variables (Vercel)

Aggiungi queste variabili nel dashboard Vercel:

```env
NEXT_PUBLIC_SUPABASE_URL=https://ugspmqfduabfmfsoxqoc.supabase.co
NEXT_PUBLIC_SUPABASE_ANON_KEY=eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InVnc3BtcWZkdWFiZm1mc294cW9jIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NTUyODY0NjEsImV4cCI6MjA3MDg2MjQ2MX0.euDiQhUl4NJbuVeClfunDV8wVaWITK_UNLrdZeMYKC0
SUPABASE_SERVICE_ROLE_KEY=YOUR_SERVICE_ROLE_KEY_FROM_SUPABASE
API_SECRET_KEY=burgtv_api_production_secure_key_2024
ENVIRONMENT=production
ALLOWED_ORIGINS=https://burgtv.com,https://app.burgtv.com
```

**⚠️ IMPORTANTE**: Trova il `SUPABASE_SERVICE_ROLE_KEY` in Supabase:
- Dashboard Supabase → Settings → API → service_role key

## 🌐 Custom Domain Setup

### In Vercel:
1. Vai su Project Settings → Domains
2. Aggiungi: `api.burgtv.com`
3. Configura DNS su Namecheap:

### In Namecheap DNS:
```
Type: CNAME
Host: api
Value: cname.vercel-dns.com
```

## 🔗 Update Portal Integration

Nel tuo portal esistente, cambia l'URL API da locale a produzione:

```javascript
// Nel file portal: /src/lib/api.js o simile
const API_BASE_URL = 'https://api.burgtv.com';

// Test API call
fetch(`${API_BASE_URL}/api/health`)
  .then(res => res.json())
  .then(data => console.log('API Status:', data));
```

## 🧪 Testing

### 1. Health Check
```bash
curl https://api.burgtv.com/api/health
```

### 2. Device Registration Test
```bash
curl -X POST https://api.burgtv.com/api/v1/devices/register \
  -H "Content-Type: application/json" \
  -d '{
    "device_type": "firetv",
    "mac_address": "AA:BB:CC:DD:EE:FF",
    "device_name": "Test Device",
    "m3u_url": "https://example.com/test.m3u",
    "captcha_token": "test_token"
  }'
```

### 3. Playlist Validation Test
```bash
curl -X POST https://api.burgtv.com/api/v1/playlists/validate \
  -H "Content-Type: application/json" \
  -d '{"url": "https://example.com/playlist.m3u"}'
```

## 📊 Monitoring

### Vercel Dashboard
- Visualizza logs in real-time
- Monitor performance
- Check deployment status

### Supabase Dashboard  
- Monitor database queries
- Check API usage
- View logs delle operazioni

## 🔐 Security Checklist

- ✅ Rate limiting configurato (100 req/15min)
- ✅ CORS configurato per domini specifici
- ✅ Input validation con Zod
- ✅ MAC address format validation
- ✅ Environment variables sicure
- ✅ Service role key protetta

## 🎯 Prossimi Step

1. **Deploy l'API** seguendo questa guida
2. **Aggiorna il Portal** per usare la nuova API
3. **Test completo** del flusso di registrazione
4. **Monitor** per errori e performance

## 📞 Troubleshooting

### Errore Deployment
- Controlla logs in Vercel Dashboard
- Verifica environment variables
- Check sintassi TypeScript

### Errore Database
- Verifica script SQL eseguito correttamente
- Check service role key
- Controlla permissions Supabase

### CORS Issues  
- Verifica ALLOWED_ORIGINS
- Check dominio configuration
- Update next.config.js se necessario

---

## 🎉 Ready to Deploy!

L'API è **100% pronta**. Seguendo questa guida avrai l'API online in 15 minuti!

**Comandi rapidi:**
```bash
# 1. Setup database (esegui SQL in Supabase)
# 2. Git push
git init && git add . && git commit -m "🚀 API ready"

# 3. Deploy
vercel

# 4. Configure domain: api.burgtv.com → Vercel
# 5. Test: curl https://api.burgtv.com/api/health
```