import { useState, useEffect } from 'react'
import ResultView, { generateShortId, trackResultView } from './ResultView'

function App() {
  const [names, setNames] = useState('')
  const [numWinners, setNumWinners] = useState(1)
  const [numWinnersInput, setNumWinnersInput] = useState('1')
  const [winners, setWinners] = useState([])
  const [isRevealing, setIsRevealing] = useState(false)
  const [copied, setCopied] = useState('')
  const [shareLinkCopied, setShareLinkCopied] = useState(false)
  const [showHowItWorks, setShowHowItWorks] = useState(false)
  const [shareableLink, setShareableLink] = useState('')
  const [drawTimestamp, setDrawTimestamp] = useState(null)
  const [drawSeed, setDrawSeed] = useState(null)
  const [resultId, setResultId] = useState(null)
  const [showResultView, setShowResultView] = useState(false)

  const handlePickWinners = () => {
    const nameList = names
      .split('\n')
      .map(name => name.trim())
      .filter(name => name.length > 0)
      .map(name => name.startsWith('@') ? name : `@${name}`)

    if (nameList.length === 0) {
      alert('Please enter at least one name or handle.')
      return
    }

    if (numWinners < 1) {
      alert('Please select at least 1 winner.')
      return
    }

    if (numWinners > nameList.length) {
      alert(`Cannot pick ${numWinners} winners from ${nameList.length} entries.`)
      return
    }

    setIsRevealing(true)
    setWinners([])
    setCopied(false)
    setShareLinkCopied(false)
    setShareableLink('')

    // Generate seed and timestamp for proof
    const timestamp = new Date().toISOString()
    const seedArray = new Uint32Array(1)
    crypto.getRandomValues(seedArray)
    const seed = seedArray[0].toString(16)
    
    setDrawTimestamp(timestamp)
    setDrawSeed(seed)
    
    // Longer delay for dramatic reveal animation
    setTimeout(async () => {
      const selectedWinners = pickWinnersSecure(nameList, numWinners)
      setWinners(selectedWinners)
      setIsRevealing(false)
      
      // Generate short ID and store result
      const shortId = generateShortId()
      setResultId(shortId)
      
      // Store result data in backend
      try {
        const response = await fetch(`/api/results/${shortId}`, {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({
            winners: selectedWinners,
            timestamp,
            seed,
            count: numWinners
          })
        })

        if (!response.ok) {
          throw new Error('Failed to save result')
        }

        // Also store in localStorage as backup
        try {
          localStorage.setItem(`pickora_result_${shortId}`, JSON.stringify({
            winners: selectedWinners,
            timestamp,
            seed,
            count: numWinners
          }))
        } catch (e) {
          // Silent fail for localStorage backup
        }
      } catch (e) {
        console.error('Failed to store result:', e)
        // Fallback: store in localStorage only
        try {
          localStorage.setItem(`pickora_result_${shortId}`, JSON.stringify({
            winners: selectedWinners,
            timestamp,
            seed,
            count: numWinners
          }))
        } catch (localError) {
          console.error('Failed to store in localStorage:', localError)
        }
      }
      
      // Generate shareable link with short ID
      const shareUrl = `${window.location.origin}${window.location.pathname}#/result/${shortId}`
      setShareableLink(shareUrl)
    }, 800)
  }

  const pickWinnersSecure = (nameList, count) => {
    const available = [...nameList]
    const selected = []
    const array = new Uint32Array(count)

    // Use cryptographically secure random number generator
    crypto.getRandomValues(array)

    for (let i = 0; i < count; i++) {
      const randomValue = array[i] / (0xFFFFFFFF + 1)
      const index = Math.floor(randomValue * available.length)
      selected.push(available[index])
      available.splice(index, 1)
    }

    return selected
  }

  const formatTweet = () => {
    if (winners.length === 0) return ''
    
    let tweet = '🎉 Raffle Winners 🎉\n\n'
    winners.forEach(winner => {
      tweet += `🏆 ${winner}\n`
    })
    tweet += '\nPicked with Pickora try it here https://pickora.vercel.app/\n\n#Pickora #Raffle'
    
    return tweet
  }

  const handleCopyTweet = async () => {
    const tweetText = formatTweet()
    try {
      await navigator.clipboard.writeText(tweetText)
      setCopied('tweet')
      setTimeout(() => setCopied(''), 2000)
    } catch (err) {
      console.error('Failed to copy:', err)
      alert('Failed to copy to clipboard. Please try again.')
    }
  }

  const handleCopyShareLink = async () => {
    try {
      await navigator.clipboard.writeText(shareableLink)
      setShareLinkCopied(true)
      setTimeout(() => setShareLinkCopied(false), 2000)
    } catch (err) {
      console.error('Failed to copy:', err)
      alert('Failed to copy link. Please try again.')
    }
  }

  const handleShareX = () => {
    const tweetText = formatTweet()
    const url = `https://twitter.com/intent/tweet?text=${encodeURIComponent(tweetText)}`
    window.open(url, '_blank', 'width=550,height=420')
  }

  const handleViewResult = () => {
    if (resultId) {
      window.location.hash = `#/result/${resultId}`
      setShowResultView(true)
    }
  }

  // Handle routing and load data on mount
  useEffect(() => {
    // Check for hash-based routing (#/result/:id)
    const hash = window.location.hash
    const resultMatch = hash.match(/^#\/result\/([a-z0-9]+)$/)
    
    if (resultMatch) {
      const id = resultMatch[1]
      setResultId(id)
      setShowResultView(true)
      trackResultView(id)
      return
    }
    
    // Fallback: Load from query params (legacy support)
    const params = new URLSearchParams(window.location.search)
    const winnersParam = params.get('winners')
    if (winnersParam) {
      const winnersList = winnersParam.split(',').filter(w => w)
      if (winnersList.length > 0) {
        setWinners(winnersList)
        setShareableLink(window.location.href)
        
        // Load proof data if available
        const timestamp = params.get('t')
        const seed = params.get('s')
        if (timestamp) setDrawTimestamp(timestamp)
        if (seed) setDrawSeed(seed)
      }
    }
  }, [])

  // Handle hash changes for routing
  useEffect(() => {
    const handleHashChange = () => {
      const hash = window.location.hash
      const resultMatch = hash.match(/^#\/result\/([a-z0-9]+)$/)
      
      if (resultMatch) {
        const id = resultMatch[1]
        setResultId(id)
        setShowResultView(true)
        trackResultView(id)
      } else {
        setShowResultView(false)
      }
    }

    window.addEventListener('hashchange', handleHashChange)
    return () => window.removeEventListener('hashchange', handleHashChange)
  }, [])

  // Show result view if routing to result page
  if (showResultView && resultId) {
    return (
      <ResultView 
        resultId={resultId} 
        onBack={() => {
          window.location.hash = ''
          setShowResultView(false)
        }} 
      />
    )
  }

  return (
    <div className="min-h-screen flex flex-col max-w-4xl mx-auto px-5 py-10 md:px-10 md:py-16 relative">
      {/* Watermark */}
      <div className="fixed bottom-4 right-4 text-[10px] text-black/20 font-light tracking-wider pointer-events-none z-10 hidden md:block">
        Powered by Pickora
      </div>
      <main className="flex-1 flex flex-col gap-16 md:gap-20">
        <header className="text-center py-8 md:py-12 animate-fade-up">
          <div className="inline-block mb-4">
            <h1 className="text-6xl md:text-8xl font-bold tracking-tighter mb-3 leading-[0.95] text-balance">
              Pickora
            </h1>
            <div className="h-1 w-20 bg-black mx-auto"></div>
          </div>
          <p className="text-xl md:text-2xl font-light text-gray-700 tracking-wide mt-6">
            Fair Picks. Real Winners.
          </p>
          <button
            onClick={() => setShowHowItWorks(true)}
            className="mt-4 text-xs uppercase tracking-wider text-black/60 hover:text-black underline underline-offset-4 transition-colors"
          >
            How it works
          </button>
        </header>

        <div className="flex flex-col gap-8 animate-fade-up" style={{ animationDelay: '0.1s' }}>
          <div className="flex flex-col gap-3">
            <label htmlFor="names" className="text-xs font-semibold uppercase tracking-[0.15em] text-black/80">
              Names or X Handles
            </label>
            <textarea
              id="names"
              className="w-full p-4 md:p-5 border-[1.5px] border-black/20 bg-white text-black font-sans text-base leading-relaxed resize-y transition-all duration-300 focus:outline-none focus:border-black focus:shadow-elegant placeholder:text-gray-400/60 hover:border-black/40"
              placeholder="Enter names or handles, one per line&#10;@username1&#10;@username2&#10;username3"
              value={names}
              onChange={(e) => setNames(e.target.value)}
              rows={8}
            />
          </div>

          <div className="flex flex-col gap-3">
            <label htmlFor="numWinners" className="text-xs font-semibold uppercase tracking-[0.15em] text-black/80">
              Number of Winners
            </label>
            <input
              id="numWinners"
              type="number"
              className="w-full max-w-[220px] p-4 border-[1.5px] border-black/20 bg-white text-black font-sans text-base transition-all duration-300 focus:outline-none focus:border-black focus:shadow-elegant hover:border-black/40"
              min="1"
              value={numWinnersInput}
              onChange={(e) => {
                const value = e.target.value
                setNumWinnersInput(value)
                const num = parseInt(value, 10)
                if (!isNaN(num) && num >= 1) {
                  setNumWinners(num)
                }
              }}
              onBlur={(e) => {
                const value = e.target.value
                const num = parseInt(value, 10)
                if (value === '' || isNaN(num) || num < 1) {
                  setNumWinnersInput('1')
                  setNumWinners(1)
                } else {
                  setNumWinnersInput(value)
                }
              }}
            />
          </div>

          <div className="flex flex-col gap-3">
            <button
              className="group relative px-8 md:px-12 py-4 bg-black text-white border-2 border-black font-sans text-sm font-semibold uppercase tracking-[0.15em] cursor-pointer transition-all duration-300 hover:bg-white hover:text-black hover:shadow-elegant-lg disabled:opacity-50 disabled:cursor-not-allowed disabled:hover:bg-black disabled:hover:text-white disabled:hover:shadow-none self-start w-full md:w-auto overflow-hidden touch-manipulation"
              onClick={handlePickWinners}
              disabled={isRevealing}
            >
              <span className="relative z-10 inline-block">
                {isRevealing ? 'Picking...' : 'Pick Winners'}
              </span>
              <span className="absolute inset-0 bg-white transform scale-x-0 group-hover:scale-x-100 transition-transform duration-300 origin-left"></span>
            </button>

            <div className="flex items-start gap-2 p-3 bg-black/5 border border-black/10 rounded-sm">
              <span className="text-xs text-black/70 font-medium mt-0.5">🔒</span>
              <p className="text-xs text-black/80 font-medium tracking-wide leading-relaxed">
                Winners are selected using <span className="font-semibold">cryptographically secure randomization</span> for guaranteed fairness.
              </p>
            </div>
          </div>
        </div>

        {winners.length > 0 && (
          <>
            <div className={`mt-4 transition-all duration-700 ease-out ${
              isRevealing 
                ? 'opacity-0 translate-y-8 scale-95' 
                : 'opacity-100 translate-y-0 scale-100'
            }`}>
              <div className="text-center mb-8">
                <h2 className="text-3xl md:text-4xl font-bold tracking-tight mb-2">
                  Winners
                </h2>
                <div className="h-px w-16 bg-black/20 mx-auto"></div>
              </div>
              <div className="flex flex-col gap-3 mb-8">
                {winners.map((winner, index) => (
                  <div
                    key={index}
                    className="group flex items-center gap-5 p-6 md:p-7 border-[1.5px] border-black/10 bg-white/50 backdrop-blur-sm animate-winner-reveal hover:border-black/30 hover:bg-white hover:shadow-elegant transition-all duration-300"
                    style={{ animationDelay: `${index * 0.15}s` }}
                  >
                    <div className="flex-shrink-0 w-10 h-10 flex items-center justify-center bg-black/5 rounded-full group-hover:bg-black/10 transition-colors">
                      <span className="text-2xl">🏆</span>
                    </div>
                    <span className="text-lg md:text-xl font-medium tracking-wide text-black/90">{winner}</span>
                    <div className="ml-auto h-px flex-1 max-w-[60px] bg-black/5 group-hover:bg-black/20 transition-colors"></div>
                  </div>
                ))}
              </div>
              
              {shareableLink && (
                <div className="mb-4 space-y-3">
                  <div className="p-4 bg-black/5 border border-black/10 rounded-sm">
                    <div className="flex items-center gap-2 mb-2">
                      <span className="text-xs font-semibold uppercase tracking-wider text-black/80">Shareable Link</span>
                    </div>
                    <div className="flex gap-2">
                      <input
                        type="text"
                        readOnly
                        value={shareableLink}
                        className="flex-1 px-3 py-2 text-xs bg-white border border-black/20 text-black/70 font-mono"
                      />
                      <button
                        onClick={handleCopyShareLink}
                        className="px-4 py-2 text-xs font-semibold uppercase tracking-wider bg-black text-white border border-black hover:bg-white hover:text-black transition-all"
                      >
                        {shareLinkCopied ? '✓' : 'Copy'}
                      </button>
                    </div>
                    <button
                      onClick={handleViewResult}
                      className="mt-3 w-full px-4 py-2 text-xs font-medium text-black/70 hover:text-black border border-black/20 hover:border-black/40 transition-all"
                    >
                      View Result Page →
                    </button>
                  </div>
                  
                  {(drawTimestamp || drawSeed) && (
                    <details className="p-3 bg-black/3 border border-black/5 rounded-sm">
                      <summary className="text-xs font-medium text-black/70 cursor-pointer hover:text-black/90 transition-colors">
                        Proof of Fairness
                      </summary>
                      <div className="mt-3 space-y-2 text-xs text-black/60 font-mono">
                        {drawTimestamp && (
                          <div>
                            <span className="font-semibold text-black/80">Timestamp:</span> {new Date(drawTimestamp).toLocaleString()}
                          </div>
                        )}
                        {drawSeed && (
                          <div>
                            <span className="font-semibold text-black/80">Seed:</span> {drawSeed}
                          </div>
                        )}
                        <p className="text-[10px] text-black/50 italic mt-2">
                          This cryptographic seed ensures the draw cannot be manipulated or predicted.
                        </p>
                      </div>
                    </details>
                  )}
                </div>
              )}
            </div>
            
            <div className="sticky bottom-0 md:relative bg-white pt-4 md:pt-0 border-t border-black/10 md:border-0 -mx-5 md:mx-0 px-5 md:px-0 pb-4 md:pb-0 safe-area-inset-bottom">
              <div className="flex flex-col sm:flex-row gap-3">
                <button
                  onClick={handleShareX}
                  className="group relative flex-1 p-4 md:p-5 bg-black text-white border-2 border-black font-sans text-sm font-semibold uppercase tracking-[0.15em] cursor-pointer transition-all duration-300 hover:bg-white hover:text-black hover:shadow-elegant-lg overflow-hidden touch-manipulation"
                >
                  <span className="relative z-10 inline-block">Share to X</span>
                  <span className="absolute inset-0 bg-white transform scale-x-0 group-hover:scale-x-100 transition-transform duration-300 origin-left"></span>
                </button>
                <button
                  className="group relative flex-1 p-4 md:p-5 bg-white text-black border-2 border-black font-sans text-sm font-semibold uppercase tracking-[0.15em] cursor-pointer transition-all duration-300 hover:bg-black hover:text-white hover:shadow-elegant-lg overflow-hidden touch-manipulation"
                  onClick={handleCopyTweet}
                >
                  <span className="relative z-10 inline-block">
                    {copied === 'tweet' ? '✓ Copied!' : 'Copy Tweet'}
                  </span>
                  <span className="absolute inset-0 bg-black transform scale-x-0 group-hover:scale-x-100 transition-transform duration-300 origin-left"></span>
                </button>
                <button
                  className="group relative flex-1 p-4 md:p-5 bg-white text-black border-2 border-black font-sans text-sm font-semibold uppercase tracking-[0.15em] cursor-pointer transition-all duration-300 hover:bg-black hover:text-white hover:shadow-elegant-lg overflow-hidden touch-manipulation"
                  onClick={handleCopyShareLink}
                >
                  <span className="relative z-10 inline-block">
                    {shareLinkCopied ? '✓ Copied!' : 'Copy Link'}
                  </span>
                  <span className="absolute inset-0 bg-black transform scale-x-0 group-hover:scale-x-100 transition-transform duration-300 origin-left"></span>
                </button>
              </div>
            </div>
          </>
        )}
      </main>

      <footer className="mt-20 pt-10 border-t border-black/10 text-center animate-fade-up" style={{ animationDelay: '0.2s' }}>
        <p className="text-xs text-gray-400 font-light tracking-wider uppercase">
          Built by 9thStreet
        </p>
      </footer>

      {/* How it Works Modal */}
      {showHowItWorks && (
        <div 
          className="fixed inset-0 bg-black/50 backdrop-blur-sm z-50 flex items-center justify-center p-4 animate-fade-up"
          onClick={() => setShowHowItWorks(false)}
        >
          <div 
            className="bg-white border-2 border-black max-w-lg w-full p-8 md:p-10 animate-scale-in"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="flex items-center justify-between mb-6">
              <h3 className="text-2xl font-bold tracking-tight">How It Works</h3>
              <button
                onClick={() => setShowHowItWorks(false)}
                className="text-2xl leading-none text-black/60 hover:text-black transition-colors"
              >
                ×
              </button>
            </div>
            
            <div className="space-y-4 text-sm text-black/80 leading-relaxed">
              <div>
                <h4 className="font-semibold mb-2 text-black">🔒 Secure Randomization</h4>
                <p>
                  Pickora uses <span className="font-semibold">crypto.getRandomValues()</span>, a cryptographically secure random number generator built into modern browsers. This ensures every draw is truly random and cannot be predicted or manipulated.
                </p>
              </div>
              
              <div>
                <h4 className="font-semibold mb-2 text-black">✓ Fair Selection</h4>
                <p>
                  Each entry has an equal chance of winning. Winners are selected without replacement, so no duplicate winners are possible.
                </p>
              </div>
              
              <div>
                <h4 className="font-semibold mb-2 text-black">🔗 Shareable Results</h4>
                <p>
                  Every draw generates a unique shareable link with cryptographic proof (timestamp & seed). Share it to let others verify the results independently.
                </p>
              </div>
              
              <div>
                <h4 className="font-semibold mb-2 text-black">📱 Social Sharing</h4>
                <p>
                  Copy formatted tweets with hashtags (#Pickora #Raffle) ready to post on X. Winners are pre-formatted for easy sharing.
                </p>
              </div>
              
              <div>
                <h4 className="font-semibold mb-2 text-black">🚀 No Backend Required</h4>
                <p>
                  All randomization happens in your browser. No data is sent to any server, ensuring complete privacy and transparency.
                </p>
              </div>
            </div>
            
            <button
              onClick={() => setShowHowItWorks(false)}
              className="mt-8 w-full p-4 bg-black text-white border-2 border-black font-sans text-sm font-semibold uppercase tracking-[0.15em] cursor-pointer transition-all duration-300 hover:bg-white hover:text-black"
            >
              Got it
            </button>
          </div>
        </div>
      )}
    </div>
  )
}

export default App

