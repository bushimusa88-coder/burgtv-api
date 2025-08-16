export default function handler(req, res) {
  res.status(200).json({
    status: 'online',
    service: 'BurgTV API',
    version: '2.0.0',
    endpoints: {
      register: 'POST /api/register',
      playlist: 'GET /api/playlist?mac=XX:XX:XX:XX:XX:XX',
      trial: 'GET /api/trial?mac=XX:XX:XX:XX:XX:XX'
    }
  });
}
