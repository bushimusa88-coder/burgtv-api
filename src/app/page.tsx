export default function HomePage() {
  return (
    <div style={{ 
      fontFamily: 'Inter, sans-serif',
      maxWidth: '800px',
      margin: '2rem auto',
      padding: '2rem',
      lineHeight: '1.6'
    }}>
      <h1 style={{ color: '#B94A8E', marginBottom: '1rem' }}>
        🚀 BurgTV API
      </h1>
      
      <p style={{ fontSize: '1.1rem', marginBottom: '2rem', color: '#666' }}>
        Backend API for BurgTV IPTV Device Management System
      </p>

      <div style={{ 
        background: '#f5f5f5', 
        padding: '1.5rem', 
        borderRadius: '8px',
        marginBottom: '2rem'
      }}>
        <h2 style={{ marginBottom: '1rem' }}>🔌 Available Endpoints</h2>
        
        <div style={{ marginBottom: '1rem' }}>
          <strong>Health Check:</strong>
          <br />
          <code style={{ background: '#e0e0e0', padding: '0.2rem 0.5rem', borderRadius: '4px' }}>
            GET /api/health
          </code>
        </div>

        <div style={{ marginBottom: '1rem' }}>
          <strong>Device Registration:</strong>
          <br />
          <code style={{ background: '#e0e0e0', padding: '0.2rem 0.5rem', borderRadius: '4px' }}>
            POST /api/v1/devices/register
          </code>
        </div>

        <div style={{ marginBottom: '1rem' }}>
          <strong>Device Management:</strong>
          <br />
          <code style={{ background: '#e0e0e0', padding: '0.2rem 0.5rem', borderRadius: '4px' }}>
            GET|PUT|DELETE /api/v1/devices/[mac]
          </code>
        </div>

        <div>
          <strong>Playlist Validation:</strong>
          <br />
          <code style={{ background: '#e0e0e0', padding: '0.2rem 0.5rem', borderRadius: '4px' }}>
            POST /api/v1/playlists/validate
          </code>
        </div>
      </div>

      <div style={{ 
        background: '#e8f5e8', 
        padding: '1.5rem', 
        borderRadius: '8px',
        marginBottom: '2rem'
      }}>
        <h3 style={{ color: '#2d5a2d', marginBottom: '1rem' }}>✅ Quick Test</h3>
        <p>
          Test the API health:
        </p>
        <code style={{ 
          background: '#d4edda', 
          padding: '0.5rem', 
          borderRadius: '4px',
          display: 'block',
          marginTop: '0.5rem'
        }}>
          curl {typeof window !== 'undefined' ? window.location.origin : 'https://api.burgtv.com'}/api/health
        </code>
      </div>

      <div style={{ fontSize: '0.9rem', color: '#666' }}>
        <p>
          <strong>📚 Documentation:</strong> See README.md for complete API documentation
        </p>
        <p>
          <strong>🔗 Frontend:</strong> <a href="https://burgtv.com" style={{ color: '#B94A8E' }}>burgtv.com</a>
        </p>
        <p>
          <strong>📱 Portal:</strong> <a href="https://app.burgtv.com" style={{ color: '#B94A8E' }}>app.burgtv.com</a>
        </p>
      </div>
    </div>
  )
}