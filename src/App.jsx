import { useState } from 'react'

function App() {
  const [names, setNames] = useState('')
  const [numWinners, setNumWinners] = useState(1)
  const [numWinnersInput, setNumWinnersInput] = useState('1')
  const [winners, setWinners] = useState([])
  const [isRevealing, setIsRevealing] = useState(false)
  const [copied, setCopied] = useState(false)

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

    // Small delay for animation effect
    setTimeout(() => {
      const selectedWinners = pickWinnersSecure(nameList, numWinners)
      setWinners(selectedWinners)
      setIsRevealing(false)
    }, 300)
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
    tweet += '\nPicked with Pickora try it here https://pickora.vercel.app/'
    
    return tweet
  }

  const handleCopyTweet = async () => {
    const tweetText = formatTweet()
    try {
      await navigator.clipboard.writeText(tweetText)
      setCopied(true)
      setTimeout(() => setCopied(false), 2000)
    } catch (err) {
      console.error('Failed to copy:', err)
      alert('Failed to copy to clipboard. Please try again.')
    }
  }

  return (
    <div className="min-h-screen flex flex-col max-w-4xl mx-auto px-5 py-10 md:px-10 md:py-16">
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
        </header>

        <div className="flex flex-col gap-8 animate-fade-up" style={{ animationDelay: '0.1s' }}>
          <div className="flex flex-col gap-3">
            <label htmlFor="names" className="text-xs font-semibold uppercase tracking-[0.15em] text-black/80">
              Names or X Handles
            </label>
            <textarea
              id="names"
              className="w-full p-5 border-[1.5px] border-black/20 bg-white text-black font-sans text-base leading-relaxed resize-y transition-all duration-300 focus:outline-none focus:border-black focus:shadow-elegant placeholder:text-gray-400/60 hover:border-black/40"
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
              className="group relative px-12 py-4 bg-black text-white border-2 border-black font-sans text-sm font-semibold uppercase tracking-[0.15em] cursor-pointer transition-all duration-300 hover:bg-white hover:text-black hover:shadow-elegant-lg disabled:opacity-50 disabled:cursor-not-allowed disabled:hover:bg-black disabled:hover:text-white disabled:hover:shadow-none self-start w-full md:w-auto overflow-hidden"
              onClick={handlePickWinners}
              disabled={isRevealing}
            >
              <span className="relative z-10 inline-block">
                {isRevealing ? 'Picking...' : 'Pick Winners'}
              </span>
              <span className="absolute inset-0 bg-white transform scale-x-0 group-hover:scale-x-100 transition-transform duration-300 origin-left"></span>
            </button>

            <p className="text-xs text-gray-500 italic font-light tracking-wide">
              Winners are selected using secure randomization.
            </p>
          </div>
        </div>

        {winners.length > 0 && (
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
                  className="group flex items-center gap-5 p-6 md:p-7 border-[1.5px] border-black/10 bg-white/50 backdrop-blur-sm animate-slide-in hover:border-black/30 hover:bg-white hover:shadow-elegant transition-all duration-300"
                  style={{ animationDelay: `${index * 0.12}s` }}
                >
                  <div className="flex-shrink-0 w-10 h-10 flex items-center justify-center bg-black/5 rounded-full group-hover:bg-black/10 transition-colors">
                    <span className="text-2xl">🏆</span>
                  </div>
                  <span className="text-lg md:text-xl font-medium tracking-wide text-black/90">{winner}</span>
                  <div className="ml-auto h-px flex-1 max-w-[60px] bg-black/5 group-hover:bg-black/20 transition-colors"></div>
                </div>
              ))}
            </div>
            <button
              className="group relative w-full p-5 bg-white text-black border-2 border-black font-sans text-sm font-semibold uppercase tracking-[0.15em] cursor-pointer transition-all duration-300 hover:bg-black hover:text-white hover:shadow-elegant-lg overflow-hidden"
              onClick={handleCopyTweet}
            >
              <span className="relative z-10 inline-block">
                {copied ? '✓ Copied!' : 'Copy Tweet'}
              </span>
              <span className="absolute inset-0 bg-black transform scale-x-0 group-hover:scale-x-100 transition-transform duration-300 origin-left"></span>
            </button>
          </div>
        )}
      </main>

      <footer className="mt-20 pt-10 border-t border-black/10 text-center animate-fade-up" style={{ animationDelay: '0.2s' }}>
        <p className="text-xs text-gray-400 font-light tracking-wider uppercase">
          Built by 9thStreet
        </p>
      </footer>
    </div>
  )
}

export default App

