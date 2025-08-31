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

    // Fetch from chosic.com server-side to avoid CORS issues
    const chosicUrl = `https://www.chosic.com/search/?q=${encodeURIComponent(query)}`
    
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

    if (!response.ok) {
      throw new Error(`HTTP error! status: ${response.status}`)
    }

    const html = await response.text()
    
    // Parse the HTML to extract music suggestions
    const suggestions = parseChosicHTML(html, limit)

    return new Response(
      JSON.stringify({ suggestions }),
      { 
        headers: { ...corsHeaders, 'Content-Type': 'application/json' } 
      }
    )

  } catch (error) {
    console.error('Error in music-search function:', error)
    
    return new Response(
      JSON.stringify({ 
        error: 'Failed to fetch music suggestions',
        details: error.message 
      }),
      { 
        status: 500, 
        headers: { ...corsHeaders, 'Content-Type': 'application/json' } 
      }
    )
  }
})

function parseChosicHTML(html: string, limit: number): MusicSuggestion[] {
  const suggestions: MusicSuggestion[] = []
  
  try {
    // Extract music data from HTML using regex patterns
    // This is a simplified parser - in production you might want to use a proper HTML parser
    
    // Look for song containers in the HTML
    const songPattern = /<div[^>]*class="[^"]*song[^"]*"[^>]*>(.*?)<\/div>/gis
    const titlePattern = /<h[1-6][^>]*>(.*?)<\/h[1-6]>/i
    const artistPattern = /<span[^>]*class="[^"]*artist[^"]*"[^>]*>(.*?)<\/span>/i
    const genrePattern = /<span[^>]*class="[^"]*genre[^"]*"[^>]*>(.*?)<\/span>/i
    
    let match
    let count = 0
    
    while ((match = songPattern.exec(html)) !== null && count < limit) {
      const songHtml = match[1]
      
      const titleMatch = titlePattern.exec(songHtml)
      const artistMatch = artistPattern.exec(songHtml)
      const genreMatch = genrePattern.exec(songHtml)
      
      if (titleMatch) {
        const title = titleMatch[1].replace(/<[^>]*>/g, '').trim()
        const artist = artistMatch ? artistMatch[1].replace(/<[^>]*>/g, '').trim() : 'Unknown Artist'
        const genre = genreMatch ? genreMatch[1].replace(/<[^>]*>/g, '').trim() : undefined
        
        suggestions.push({
          id: `chosic-${count}`,
          title,
          artist,
          genre,
          mood: extractMoodFromText(songHtml),
          bpm: extractBPMFromText(songHtml),
          duration: extractDurationFromText(songHtml)
        })
        
        count++
      }
    }
    
    // If no songs found with the above pattern, try alternative patterns
    if (suggestions.length === 0) {
      // Fallback: look for any text that might be song titles
      const fallbackPattern = /<a[^>]*href="[^"]*song[^"]*"[^>]*>(.*?)<\/a>/gi
      
      while ((match = fallbackPattern.exec(html)) !== null && count < limit) {
        const title = match[1].replace(/<[^>]*>/g, '').trim()
        
        if (title && title.length > 0) {
          suggestions.push({
            id: `chosic-fallback-${count}`,
            title,
            artist: 'Unknown Artist'
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