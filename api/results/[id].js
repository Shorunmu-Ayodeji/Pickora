// Vercel serverless function for storing and retrieving results
// Supports both GET (retrieve) and POST (store) operations

export default async function handler(req, res) {
  // Enable CORS
  res.setHeader('Access-Control-Allow-Origin', '*')
  res.setHeader('Access-Control-Allow-Methods', 'GET, POST, OPTIONS')
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type')

  if (req.method === 'OPTIONS') {
    return res.status(200).end()
  }

  const { id } = req.query

  if (!id || id.length !== 6) {
    return res.status(400).json({ error: 'Invalid result ID' })
  }

  try {
    // Try to use Vercel KV if available
    let kv = null
    try {
      // Vercel KV is automatically available via environment variables
      // Import the kv client
      const { kv: kvClient } = await import('@vercel/kv')
      kv = kvClient
    } catch (e) {
      // KV not configured, will use fallback
      // This is expected if KV database hasn't been set up yet
    }

    if (req.method === 'POST') {
      // Store result
      const { winners, timestamp, seed, count } = req.body

      if (!winners || !Array.isArray(winners) || winners.length === 0) {
        return res.status(400).json({ error: 'Invalid winners data' })
      }

      const resultData = {
        winners,
        timestamp: timestamp || new Date().toISOString(),
        seed: seed || null,
        count: count || winners.length,
        createdAt: new Date().toISOString()
      }

      if (kv) {
        // Use Vercel KV
        await kv.set(`pickora_result_${id}`, JSON.stringify(resultData), { ex: 86400 * 30 }) // 30 days TTL
      } else {
        // Fallback: Use a simple in-memory store (not persistent, but works for demo)
        // In production, you should use a real database
        if (!global.resultStore) {
          global.resultStore = new Map()
        }
        global.resultStore.set(`pickora_result_${id}`, resultData)
      }

      // Track analytics
      try {
        if (kv) {
          const analytics = await kv.get('pickora_analytics') || { totalDraws: 0 }
          analytics.totalDraws = (analytics.totalDraws || 0) + 1
          analytics.lastDraw = new Date().toISOString()
          await kv.set('pickora_analytics', analytics)
        }
      } catch (e) {
        // Silent fail for analytics
      }

      return res.status(200).json({ success: true, id })
    }

    if (req.method === 'GET') {
      // Retrieve result
      let resultData = null

      if (kv) {
        // Use Vercel KV
        resultData = await kv.get(`pickora_result_${id}`)
      } else {
        // Fallback: Use in-memory store
        if (global.resultStore) {
          resultData = global.resultStore.get(`pickora_result_${id}`) || null
        }
      }

      if (!resultData) {
        return res.status(404).json({ error: 'Result not found' })
      }

      // Track view analytics
      try {
        if (kv) {
          const analytics = await kv.get('pickora_analytics') || { resultViews: 0 }
          analytics.resultViews = (analytics.resultViews || 0) + 1
          analytics.lastView = new Date().toISOString()
          await kv.set('pickora_analytics', analytics)
        }
      } catch (e) {
        // Silent fail for analytics
      }

      return res.status(200).json(resultData)
    }

    return res.status(405).json({ error: 'Method not allowed' })
  } catch (error) {
    console.error('API Error:', error)
    return res.status(500).json({ error: 'Internal server error' })
  }
}

