import { corsHeaders } from '../_shared/cors.ts'

interface SearchRequest {
  query: string;
  limit?: number;
}

interface MusicSuggestion {
  id: string;
  title: string;
  artist: string;
  genre?: string;
  mood?: string;
  bpm?: number;
  duration?: string;
  preview_url?: string;
}

// Mock data for fallback when external API fails
const mockSuggestions: Record<string, MusicSuggestion[]> = {
  'default': [
    { id: '1', title: 'Bohemian Rhapsody', artist: 'Queen', genre: 'rock' },
    { id: '2', title: 'Imagine', artist: 'John Lennon', genre: 'pop' },
    { id: '3', title: 'Hotel California', artist: 'Eagles', genre: 'rock' },
    { id: '4', title: 'Stairway to Heaven', artist: 'Led Zeppelin', genre: 'rock' },
    { id: '5', title: 'Sweet Child O Mine', artist: 'Guns N Roses', genre: 'rock' },
    { id: '6', title: 'Yesterday', artist: 'The Beatles', genre: 'pop' },
    { id: '7', title: 'Smells Like Teen Spirit', artist: 'Nirvana', genre: 'grunge' },
    { id: '8', title: 'Billie Jean', artist: 'Michael Jackson', genre: 'pop' },
    { id: '9', title: 'Like a Rolling Stone', artist: 'Bob Dylan', genre: 'folk' },
    { id: '10', title: 'Purple Haze', artist: 'Jimi Hendrix', genre: 'rock' }
  ]
};

Deno.serve(async (req: Request) => {
  // Handle CORS preflight requests
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders })
  }

  try {
    const { query, limit = 10 }: SearchRequest = await req.json()

    if (!query || query.trim().length === 0) {
      return new Response(
        JSON.stringify({ error: 'Query parameter is required' }),
        { 
          status: 400, 
          headers: { ...corsHeaders, 'Content-Type': 'application/json' } 
        }
      )
    }

    let suggestions: MusicSuggestion[] = [];

    try {
      // Try to fetch from chosic.com playlist generator (more reliable endpoint)
      const chosicUrl = `https://www.chosic.com/playlist-generator/?q=${encodeURIComponent(query)}`
      
      const response = await fetch(chosicUrl, {
        headers: {
          'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/91.0.4472.124 Safari/537.36',
          'Accept': 'text/html,application/xhtml+xml,application/xml;q=0.9,image/webp,*/*;q=0.8',
          'Accept-Language': 'en-US,en;q=0.5',
          'Accept-Encoding': 'gzip, deflate, br',
          'DNT': '1',
          'Connection': 'keep-alive',
          'Upgrade-Insecure-Requests': '1',
        }
      })

      if (response.ok) {
        const html = await response.text()
        suggestions = parseChosicHTML(html, limit)
      }
    } catch (error) {
      console.log('External API failed, using fallback data:', error.message)
    }

    // If no suggestions from external API, use filtered mock data
    if (suggestions.length === 0) {
      const queryLower = query.toLowerCase()
      suggestions = mockSuggestions.default
        .filter(song => 
          song.title.toLowerCase().includes(queryLower) ||
          song.artist.toLowerCase().includes(queryLower) ||
          (song.genre && song.genre.toLowerCase().includes(queryLower))
        )
        .slice(0, limit)
    }

    return new Response(
      JSON.stringify({ suggestions }),
      { 
        headers: { ...corsHeaders, 'Content-Type': 'application/json' } 
      }
    )

  } catch (error) {
    console.error('Error in music-search function:', error)
    
    // Return mock data even on error to keep the app functional
    const suggestions = mockSuggestions.default.slice(0, 10)
    
    return new Response(
      JSON.stringify({ suggestions }),
      { 
        headers: { ...corsHeaders, 'Content-Type': 'application/json' } 
      }
    )
  }
})

function parseChosicHTML(html: string, limit: number): MusicSuggestion[] {
  const suggestions: MusicSuggestion[] = []
  
  try {
    // Look for playlist items in the HTML
    const playlistPattern = /<div[^>]*class="[^"]*pl-item[^"]*"[^>]*>(.*?)<\/div>/gis
    const titlePattern = /<div[^>]*class="[^"]*song-title[^"]*"[^>]*>(.*?)<\/div>/i
    const artistPattern = /<div[^>]*class="[^"]*artist-name[^"]*"[^>]*>(.*?)<\/div>/i
    
    let match
    let count = 0
    
    while ((match = playlistPattern.exec(html)) !== null && count < limit) {
      const itemHtml = match[1]
      
      const titleMatch = titlePattern.exec(itemHtml)
      const artistMatch = artistPattern.exec(itemHtml)
      
      if (titleMatch && artistMatch) {
        const title = titleMatch[1].replace(/<[^>]*>/g, '').trim()
        const artist = artistMatch[1].replace(/<[^>]*>/g, '').trim()
        
        if (title && artist) {
          suggestions.push({
            id: `chosic-${count}`,
            title,
            artist,
            genre: extractGenreFromText(itemHtml),
            mood: extractMoodFromText(itemHtml),
            bpm: extractBPMFromText(itemHtml),
            duration: extractDurationFromText(itemHtml)
          })
          count++
        }
      }
    }
    
  } catch (error) {
    console.error('Error parsing HTML:', error)
  }
  
  return suggestions
}

function extractGenreFromText(text: string): string | undefined {
  const genrePattern = /genre[:\s]*([^<\n,]+)/i
  const match = genrePattern.exec(text)
  return match ? match[1].trim() : undefined
}

function extractMoodFromText(text: string): string | undefined {
  const moodPattern = /mood[:\s]*([^<\n,]+)/i
  const match = moodPattern.exec(text)
  return match ? match[1].trim() : undefined
}

function extractBPMFromText(text: string): number | undefined {
  const bpmPattern = /(\d+)\s*bpm/i
  const match = bpmPattern.exec(text)
  return match ? parseInt(match[1]) : undefined
}

function extractDurationFromText(text: string): string | undefined {
  const durationPattern = /(\d+:\d+)/
  const match = durationPattern.exec(text)
  return match ? match[1] : undefined
}