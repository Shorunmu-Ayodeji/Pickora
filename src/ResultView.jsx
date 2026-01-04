import { useState, useEffect } from 'react'

// Generate short unique ID (6 characters)
export function generateShortId() {
  const chars = 'abcdefghijklmnopqrstuvwxyz0123456789'
  const array = new Uint8Array(6)
  crypto.getRandomValues(array)
  return Array.from(array, byte => chars[byte % chars.length]).join('')
}

// Track analytics
export function trackResultView(resultId) {
  try {
    const key = 'pickora_analytics'
    const data = JSON.parse(localStorage.getItem(key) || '{}')
    data.resultViews = (data.resultViews || 0) + 1
    data.lastView = new Date().toISOString()
    localStorage.setItem(key, JSON.stringify(data))
  } catch (e) {
    // Silent fail for analytics
  }
}

function ResultView({ resultId, onBack }) {
  const [winners, setWinners] = useState([])
  const [timestamp, setTimestamp] = useState(null)
  const [seed, setSeed] = useState(null)
  const [loading, setLoading] = useState(true)
  const [copied, setCopied] = useState('')

  useEffect(() => {
    // Load result data from backend API
    const loadResult = async () => {
      try {
        const response = await fetch(`/api/results/${resultId}`)
        
        if (response.ok) {
          const data = await response.json()
          setWinners(data.winners || [])
          setTimestamp(data.timestamp)
          setSeed(data.seed)
          trackResultView(resultId)
        } else if (response.status === 404) {
          // Try localStorage as fallback
          try {
            const stored = localStorage.getItem(`pickora_result_${resultId}`)
            if (stored) {
              const data = JSON.parse(stored)
              setWinners(data.winners || [])
              setTimestamp(data.timestamp)
              setSeed(data.seed)
            }
          } catch (e) {
            // No fallback data
          }
        }
      } catch (e) {
        console.error('Failed to load result:', e)
        // Fallback to localStorage
        try {
          const stored = localStorage.getItem(`pickora_result_${resultId}`)
          if (stored) {
            const data = JSON.parse(stored)
            setWinners(data.winners || [])
            setTimestamp(data.timestamp)
            setSeed(data.seed)
          }
        } catch (localError) {
          console.error('Failed to load from localStorage:', localError)
        }
      } finally {
        setLoading(false)
      }
    }

    loadResult()
  }, [resultId])

  const resultUrl = `${window.location.origin}${window.location.pathname}#/result/${resultId}`
  const tweetText = winners.length > 0 ? formatTweet(winners) : ''

  const handleCopy = async (text, type) => {
    try {
      await navigator.clipboard.writeText(text)
      setCopied(type)
      setTimeout(() => setCopied(''), 2000)
    } catch (err) {
      console.error('Failed to copy:', err)
    }
  }

  const handleShareX = () => {
    const url = `https://twitter.com/intent/tweet?text=${encodeURIComponent(tweetText)}`
    window.open(url, '_blank', 'width=550,height=420')
  }

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <p className="text-black/60">Loading...</p>
      </div>
    )
  }

  if (winners.length === 0) {
    return (
      <div className="min-h-screen flex flex-col items-center justify-center max-w-4xl mx-auto px-5 py-10">
        <h1 className="text-2xl font-bold mb-4">Result Not Found</h1>
        <button
          onClick={onBack}
          className="px-6 py-3 bg-black text-white border-2 border-black font-sans text-sm font-semibold uppercase tracking-wider hover:bg-white hover:text-black transition-all"
        >
          Back to Pickora
        </button>
      </div>
    )
  }

  return (
    <div className="min-h-screen flex flex-col max-w-4xl mx-auto px-5 py-10 md:px-10 md:py-16 relative">
      {/* Watermark */}
      <div className="fixed bottom-4 right-4 text-[10px] text-black/20 font-light tracking-wider pointer-events-none z-10">
        Powered by Pickora
      </div>

      <main className="flex-1 flex flex-col gap-12">
        <div className="text-center">
          <h1 className="text-4xl md:text-5xl font-bold tracking-tighter mb-2">Raffle Results</h1>
          <div className="h-px w-16 bg-black/20 mx-auto mb-6"></div>
          {timestamp && (
            <p className="text-sm text-black/60 mb-8">
              Drawn on {new Date(timestamp).toLocaleString()}
            </p>
          )}
        </div>

        <div className="flex flex-col gap-3 mb-8">
          {winners.map((winner, index) => (
            <div
              key={index}
              className="group flex items-center gap-5 p-6 md:p-7 border-[1.5px] border-black/10 bg-white/50 backdrop-blur-sm hover:border-black/30 hover:bg-white hover:shadow-elegant transition-all duration-300"
            >
              <div className="flex-shrink-0 w-10 h-10 flex items-center justify-center bg-black/5 rounded-full">
                <span className="text-2xl">🏆</span>
              </div>
              <span className="text-lg md:text-xl font-medium tracking-wide text-black/90">{winner}</span>
              <div className="ml-auto h-px flex-1 max-w-[60px] bg-black/5"></div>
            </div>
          ))}
        </div>

        {seed && (
          <details className="mb-8 p-3 bg-black/3 border border-black/5 rounded-sm">
            <summary className="text-xs font-medium text-black/70 cursor-pointer hover:text-black/90 transition-colors">
              Proof of Fairness
            </summary>
            <div className="mt-3 text-xs text-black/60 font-mono">
              <div>
                <span className="font-semibold text-black/80">Seed:</span> {seed}
              </div>
              <p className="text-[10px] text-black/50 italic mt-2">
                This cryptographic seed ensures the draw cannot be manipulated or predicted.
              </p>
            </div>
          </details>
        )}

        {/* Social Sharing Buttons */}
        <div className="space-y-3">
          <div className="flex flex-col sm:flex-row gap-3">
            <button
              onClick={handleShareX}
              className="flex-1 px-6 py-4 bg-black text-white border-2 border-black font-sans text-sm font-semibold uppercase tracking-wider hover:bg-white hover:text-black transition-all"
            >
              Share to X
            </button>
            <button
              onClick={() => handleCopy(tweetText, 'tweet')}
              className="flex-1 px-6 py-4 bg-white text-black border-2 border-black font-sans text-sm font-semibold uppercase tracking-wider hover:bg-black hover:text-white transition-all"
            >
              {copied === 'tweet' ? '✓ Copied!' : 'Copy Tweet'}
            </button>
            <button
              onClick={() => handleCopy(resultUrl, 'link')}
              className="flex-1 px-6 py-4 bg-white text-black border-2 border-black font-sans text-sm font-semibold uppercase tracking-wider hover:bg-black hover:text-white transition-all"
            >
              {copied === 'link' ? '✓ Copied!' : 'Copy Link'}
            </button>
          </div>
        </div>
      </main>

      <footer className="mt-20 pt-10 border-t border-black/10 text-center">
        <p className="text-xs text-gray-400 font-light tracking-wider uppercase mb-4">
          Built by 9thStreet
        </p>
        <button
          onClick={onBack}
          className="text-xs text-black/60 hover:text-black underline underline-offset-4 transition-colors"
        >
          Create your own raffle
        </button>
      </footer>
    </div>
  )
}

function formatTweet(winners) {
  let tweet = '🎉 Raffle Winners 🎉\n\n'
  winners.forEach(winner => {
    tweet += `🏆 ${winner}\n`
  })
  tweet += '\nPicked with Pickora try it here https://pickora.vercel.app/\n\n#Pickora #Raffle'
  return tweet
}

export default ResultView

