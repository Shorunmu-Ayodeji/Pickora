// Vercel serverless function for storing and retrieving results
// Supports both GET (retrieve) and POST (store) operations

export default async function handler(req, res) {
  try {
    // Enable CORS
    res.setHeader('Access-Control-Allow-Origin', '*')
    res.setHeader('Access-Control-Allow-Methods', 'GET, POST, OPTIONS')
    res.setHeader('Access-Control-Allow-Headers', 'Content-Type')

    if (req.method === 'OPTIONS') {
      return res.status(200).end()
    }

    // Extract ID from URL path
    const id = req.query?.id

    if (!id || id.length !== 6) {
      return res.status(400).json({ error: 'Invalid result ID' })
    }

    // Try to use Vercel KV if available
    let kv = null
    try {
      // Vercel KV - check if environment variables are set
      if (process.env.KV_REST_API_URL && process.env.KV_REST_API_TOKEN) {
        const kvModule = await import('@vercel/kv')
        kv = kvModule.kv || kvModule.default
      }
    } catch (e) {
      // KV not configured, will use fallback
      console.log('KV not available:', e.message)
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
        try {
          // Use Vercel KV (automatically serializes objects)
          await kv.set(`pickora_result_${id}`, resultData, { ex: 86400 * 30 }) // 30 days TTL
          
          // Track analytics
          try {
            const analytics = await kv.get('pickora_analytics') || { totalDraws: 0 }
            analytics.totalDraws = (analytics.totalDraws || 0) + 1
            analytics.lastDraw = new Date().toISOString()
            await kv.set('pickora_analytics', analytics)
          } catch (e) {
            // Silent fail for analytics
            console.log('Analytics tracking failed:', e.message)
          }

          return res.status(200).json({ success: true, id })
        } catch (kvError) {
          console.error('KV storage error:', kvError)
          return res.status(500).json({ 
            error: 'Failed to save result',
            message: 'Database error. Please check Vercel KV configuration.'
          })
        }
      } else {
        // No KV configured - return error with helpful message
        return res.status(503).json({ 
          error: 'Storage not configured',
          message: 'Vercel KV database is required. Please set up KV in your Vercel dashboard (Storage tab).'
        })
      }
    }

    if (req.method === 'GET') {
      // Retrieve result
      let resultData = null

      if (kv) {
        try {
          // Use Vercel KV
          const kvData = await kv.get(`pickora_result_${id}`)
          resultData = kvData ? (typeof kvData === 'string' ? JSON.parse(kvData) : kvData) : null
        } catch (kvError) {
          console.error('KV retrieval error:', kvError)
          return res.status(500).json({ 
            error: 'Database error',
            message: 'Failed to retrieve result from database.'
          })
        }
      } else {
        // No KV configured
        return res.status(503).json({ 
          error: 'Storage not configured',
          message: 'Vercel KV database is required. Please set up KV in your Vercel dashboard.'
        })
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
        console.log('Analytics tracking failed:', e.message)
      }

      // Ensure resultData is properly formatted
      if (typeof resultData === 'string') {
        try {
          resultData = JSON.parse(resultData)
        } catch (e) {
          return res.status(500).json({ error: 'Invalid data format' })
        }
      }

      return res.status(200).json(resultData)
    }

    return res.status(405).json({ error: 'Method not allowed' })
  } catch (error) {
    console.error('API Error:', error)
    console.error('Error stack:', error.stack)
    return res.status(500).json({ 
      error: 'Internal server error',
      message: error.message
    })
  }
}
