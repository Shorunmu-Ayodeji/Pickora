// Analytics endpoint (optional, for viewing stats)

export default async function handler(req, res) {
  res.setHeader('Access-Control-Allow-Origin', '*')
  res.setHeader('Access-Control-Allow-Methods', 'GET, OPTIONS')
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type')

  if (req.method === 'OPTIONS') {
    return res.status(200).end()
  }

  if (req.method !== 'GET') {
    return res.status(405).json({ error: 'Method not allowed' })
  }

  try {
    let kv = null
    try {
      const { kv: kvClient } = await import('@vercel/kv')
      kv = kvClient
    } catch (e) {
      // KV not configured
    }

    if (kv) {
      const analytics = await kv.get('pickora_analytics') || {
        totalDraws: 0,
        resultViews: 0
      }
      return res.status(200).json(analytics)
    } else {
      // Fallback
      return res.status(200).json({
        totalDraws: 0,
        resultViews: 0,
        message: 'Analytics not available (KV not configured)'
      })
    }
  } catch (error) {
    console.error('Analytics Error:', error)
    return res.status(500).json({ error: 'Internal server error' })
  }
}

