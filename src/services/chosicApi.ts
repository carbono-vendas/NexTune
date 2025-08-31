import { Suggestion, Song, SearchOptions } from '../types/music';

const SUPABASE_URL = import.meta.env.VITE_SUPABASE_URL;
const SUPABASE_ANON_KEY = import.meta.env.VITE_SUPABASE_ANON_KEY;

export interface MusicSuggestion {
  id: string;
  title: string;
  artist: string;
  genre?: string;
  mood?: string;
  bpm?: number;
  duration?: string;
  preview_url?: string;
}

// Mock data for fallback
const mockSuggestions: Record<string, Suggestion[]> = {
  'song': [
    { value: 'Bohemian Rhapsody', label: 'Bohemian Rhapsody - Queen' },
    { value: 'Imagine', label: 'Imagine - John Lennon' },
    { value: 'Hotel California', label: 'Hotel California - Eagles' },
    { value: 'Stairway to Heaven', label: 'Stairway to Heaven - Led Zeppelin' },
    { value: 'Sweet Child O Mine', label: 'Sweet Child O Mine - Guns N Roses' },
    { value: 'Yesterday', label: 'Yesterday - The Beatles' },
    { value: 'Smells Like Teen Spirit', label: 'Smells Like Teen Spirit - Nirvana' },
    { value: 'Billie Jean', label: 'Billie Jean - Michael Jackson' },
    { value: 'Like a Rolling Stone', label: 'Like a Rolling Stone - Bob Dylan' },
    { value: 'Purple Haze', label: 'Purple Haze - Jimi Hendrix' }
  ],
  'artist': [
    { value: 'The Beatles', label: 'The Beatles' },
    { value: 'Queen', label: 'Queen' },
    { value: 'Led Zeppelin', label: 'Led Zeppelin' },
    { value: 'Pink Floyd', label: 'Pink Floyd' },
    { value: 'The Rolling Stones', label: 'The Rolling Stones' },
    { value: 'Michael Jackson', label: 'Michael Jackson' },
    { value: 'Nirvana', label: 'Nirvana' },
    { value: 'Bob Dylan', label: 'Bob Dylan' },
    { value: 'Jimi Hendrix', label: 'Jimi Hendrix' },
    { value: 'Elvis Presley', label: 'Elvis Presley' }
  ]
};

const mockPlaylistData: Song[] = [
  {
    id: '1',
    title: 'Bohemian Rhapsody',
    artist: 'Queen',
    youtubeUrl: 'https://www.youtube.com/watch?v=fJ9rUzIMcZQ',
    youtubeId: 'fJ9rUzIMcZQ'
  },
  {
    id: '2',
    title: 'Imagine',
    artist: 'John Lennon',
    youtubeUrl: 'https://www.youtube.com/watch?v=YkgkThdzX-8',
    youtubeId: 'YkgkThdzX-8'
  },
  {
    id: '3',
    title: 'Hotel California',
    artist: 'Eagles',
    youtubeUrl: 'https://www.youtube.com/watch?v=BciS5krYL80',
    youtubeId: 'BciS5krYL80'
  },
  {
    id: '4',
    title: 'Stairway to Heaven',
    artist: 'Led Zeppelin',
    youtubeUrl: 'https://www.youtube.com/watch?v=QkF3oxziUI4',
    youtubeId: 'QkF3oxziUI4'
  },
  {
    id: '5',
    title: 'Sweet Child O Mine',
    artist: 'Guns N Roses',
    youtubeUrl: 'https://www.youtube.com/watch?v=1w7OgIMMRc4',
    youtubeId: '1w7OgIMMRc4'
  },
  {
    id: '6',
    title: 'Yesterday',
    artist: 'The Beatles',
    youtubeUrl: 'https://www.youtube.com/watch?v=NrgmdOz227I',
    youtubeId: 'NrgmdOz227I'
  },
  {
    id: '7',
    title: 'Smells Like Teen Spirit',
    artist: 'Nirvana',
    youtubeUrl: 'https://www.youtube.com/watch?v=hTWKbfoikeg',
    youtubeId: 'hTWKbfoikeg'
  },
  {
    id: '8',
    title: 'Billie Jean',
    artist: 'Michael Jackson',
    youtubeUrl: 'https://www.youtube.com/watch?v=Zi_XLOBDo_Y',
    youtubeId: 'Zi_XLOBDo_Y'
  },
  {
    id: '9',
    title: 'Like a Rolling Stone',
    artist: 'Bob Dylan',
    youtubeUrl: 'https://www.youtube.com/watch?v=IwOfCgkyEj0',
    youtubeId: 'IwOfCgkyEj0'
  },
  {
    id: '10',
    title: 'Purple Haze',
    artist: 'Jimi Hendrix',
    youtubeUrl: 'https://www.youtube.com/watch?v=WGoDaYjdfSg',
    youtubeId: 'WGoDaYjdfSg'
  }
];

export function activateCorsProxy(): void {
  // This function is no longer needed but kept for compatibility
  console.log('CORS proxy activation is no longer required');
}

export async function getSuggestions(query: string, type: string = 'song'): Promise<Suggestion[]> {
  try {
    const apiUrl = `${SUPABASE_URL}/functions/v1/music-search`;
    
    const response = await fetch(apiUrl, {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${SUPABASE_ANON_KEY}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({ query, limit: 10 })
    });

    if (!response.ok) {
      throw new Error(`HTTP error! status: ${response.status}`);
    }

    const data = await response.json();
    
    // Convert MusicSuggestion[] to Suggestion[]
    const suggestions: Suggestion[] = (data.suggestions || []).map((item: MusicSuggestion) => ({
      value: item.title,
      label: `${item.title} - ${item.artist}`
    }));

    return suggestions;
    
  } catch (error) {
    console.error('Error fetching suggestions:', error);
    
    // Return mock suggestions based on query and type
    const queryLower = query.toLowerCase();
    const mockData = mockSuggestions[type] || mockSuggestions['song'];
    
    return mockData.filter(suggestion => 
      suggestion.value.toLowerCase().includes(queryLower) ||
      suggestion.label.toLowerCase().includes(queryLower)
    ).slice(0, 8);
  }
}

export async function generatePlaylist(options: SearchOptions): Promise<Song[]> {
  try {
    // For now, return mock data filtered by search query
    const queryLower = options.query.toLowerCase();
    
    return mockPlaylistData.filter(song => {
      return song.title.toLowerCase().includes(queryLower) ||
             song.artist.toLowerCase().includes(queryLower);
    }).slice(0, 10);
    
  } catch (error) {
    console.error('Error generating playlist:', error);
    
    // Always return some mock data to keep the app functional
    return mockPlaylistData.slice(0, 10);
  }
}