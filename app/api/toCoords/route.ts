import { wordsToCoords } from '../../../lib/geohash';
import wordsData from '../../../data/words.json';

export async function POST(req: Request) {
  if (req.method && req.method !== 'POST') {
    return new Response(JSON.stringify({ error: 'Method not allowed' }), { status: 405 });
  }

  try {
    const body = await req.json();
    const { words } = body;

    // Validate input
    if (!Array.isArray(words) || words.length !== 3) {
      return new Response(JSON.stringify({ error: 'Words must be an array of exactly 3 strings' }), { status: 400 });
    }

    // Check if all words exist in our word list
    const invalidWords = words.filter(word => !wordsData.includes(word.toLowerCase()));
    if (invalidWords.length > 0) {
      console.log('Invalid words:', invalidWords, 'Input:', words);
      return new Response(JSON.stringify({
        error: 'Invalid words',
        invalidWords,
        message: 'Some words are not in the valid word list'
      }), { status: 400 });
    }

    // Convert words to coordinates
    const normalizedWords = words.map(word => word.toLowerCase());
    const coordinates = wordsToCoords(normalizedWords, wordsData);
    console.log('Input words:', words, 'Normalized:', normalizedWords, 'Coordinates:', coordinates);

    if (!coordinates) {
      return new Response(JSON.stringify({
        error: 'Location not found',
        message: 'Could not find coordinates for the given words'
      }), { status: 404 });
    }

    // Convert { lat, lng } to { latitude, longitude }
    const { lat, lng } = coordinates;
    return new Response(JSON.stringify({
      success: true,
      coordinates: { latitude: lat, longitude: lng },
      words: normalizedWords,
      message: 'Words converted to coordinates successfully'
    }), { status: 200 });

  } catch (error) {
    return new Response(JSON.stringify({
      error: 'Internal server error',
      message: error instanceof Error ? error.message : 'Unknown error'
    }), { status: 500 });
  }
} 