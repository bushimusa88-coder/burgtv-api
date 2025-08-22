# BurgTV API

Backend API for BurgTV IPTV Device Management System.

## 🚀 Features

- **Device Registration**: Register IPTV devices with MAC addresses
- **M3U Playlist Management**: Validate and manage M3U playlist URLs
- **Rate Limiting**: Built-in rate limiting for API protection
- **CORS Support**: Cross-origin resource sharing configuration
- **TypeScript**: Full TypeScript support for type safety
- **Supabase Integration**: Database operations with Supabase

## 📋 API Endpoints

### Health Check
- `GET /api/health` - API health status

### Device Management
- `POST /api/v1/devices/register` - Register a new device
- `GET /api/v1/devices/[mac]` - Get device by MAC address
- `PUT /api/v1/devices/[mac]` - Update device information
- `DELETE /api/v1/devices/[mac]` - Delete device

### Playlist Validation
- `POST /api/v1/playlists/validate` - Validate M3U playlist URL

## 🛠️ Installation

### Prerequisites
- Node.js 18+ 
- npm or yarn
- Supabase account

### Local Development

1. **Clone and install**:
```bash
cd burgtv-api
npm install
```

2. **Environment Setup**:
```bash
cp .env.example .env.local
```

3. **Configure environment variables**:
```env
NEXT_PUBLIC_SUPABASE_URL=your_supabase_url
NEXT_PUBLIC_SUPABASE_ANON_KEY=your_supabase_anon_key
SUPABASE_SERVICE_ROLE_KEY=your_service_role_key
API_SECRET_KEY=your_api_secret_key
```

4. **Run development server**:
```bash
npm run dev
```

API will be available at `http://localhost:3001`

## 🗄️ Database Schema

### Devices Table
```sql
CREATE TABLE devices (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    mac_address VARCHAR(17) UNIQUE NOT NULL,
    device_type VARCHAR(20) NOT NULL,
    device_name VARCHAR(100),
    m3u_url TEXT NOT NULL,
    epg_url TEXT,
    status VARCHAR(20) DEFAULT 'active',
    captcha_verified BOOLEAN DEFAULT false,
    last_active TIMESTAMP,
    created_at TIMESTAMP DEFAULT NOW(),
    updated_at TIMESTAMP DEFAULT NOW()
);
```

### Device Logs Table  
```sql
CREATE TABLE device_logs (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    device_id UUID REFERENCES devices(id) ON DELETE CASCADE,
    action VARCHAR(50) NOT NULL,
    details JSONB,
    ip_address INET,
    user_agent TEXT,
    created_at TIMESTAMP DEFAULT NOW()
);
```

## 🚀 Deployment

### Vercel Deployment

1. **Connect to Vercel**:
```bash
npm install -g vercel
vercel login
vercel
```

2. **Configure environment variables in Vercel**:
- `NEXT_PUBLIC_SUPABASE_URL`
- `NEXT_PUBLIC_SUPABASE_ANON_KEY` 
- `SUPABASE_SERVICE_ROLE_KEY`
- `API_SECRET_KEY`
- `ENVIRONMENT=production`

3. **Deploy**:
```bash
vercel --prod
```

### Custom Domain Setup
Configure `api.burgtv.com` to point to your Vercel deployment.

## 📝 Usage Examples

### Register Device
```javascript
const response = await fetch('https://api.burgtv.com/api/v1/devices/register', {
  method: 'POST',
  headers: {
    'Content-Type': 'application/json'
  },
  body: JSON.stringify({
    device_type: 'firetv',
    mac_address: 'AA:BB:CC:DD:EE:FF',
    device_name: 'Living Room Fire TV',
    m3u_url: 'https://example.com/playlist.m3u',
    epg_url: 'https://example.com/epg.xml',
    captcha_token: 'captcha_token_here'
  })
});

const data = await response.json();
```

### Get Device
```javascript
const response = await fetch('https://api.burgtv.com/api/v1/devices/AA:BB:CC:DD:EE:FF');
const data = await response.json();
```

### Validate Playlist
```javascript
const response = await fetch('https://api.burgtv.com/api/v1/playlists/validate', {
  method: 'POST',
  headers: {
    'Content-Type': 'application/json'
  },
  body: JSON.stringify({
    url: 'https://example.com/playlist.m3u'
  })
});

const data = await response.json();
```

## 🔒 Security

- Rate limiting: 100 requests per 15 minutes per IP
- CORS configured for specific origins
- Input validation with Zod schemas
- MAC address format validation
- Captcha verification for registration

## 🐛 Error Handling

All endpoints return standardized error responses:

```json
{
  "success": false,
  "error": "Error type",
  "message": "Detailed error message"
}
```

## 📊 Monitoring

- Health check endpoint for monitoring
- Request logging with IP and User-Agent
- Database operation logs
- Error tracking and reporting

## 🤝 Contributing

1. Fork the repository
2. Create feature branch
3. Make changes with tests
4. Submit pull request

## 📄 License

Private - BurgTV Project