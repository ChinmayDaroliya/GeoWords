import { coordsToWords } from '../../../lib/geohash';
import wordsData from '../../../data/words.json';

export async function POST(req: Request) {
  if (req.method && req.method !== 'POST') {
    return new Response(JSON.stringify({ error: 'Method not allowed' }), { status: 405 });
  }

  try {
    const body = await req.json();
    const { latitude, longitude } = body;

    // Validate input
    if (typeof latitude !== 'number' || typeof longitude !== 'number') {
      return new Response(JSON.stringify({ error: 'Invalid coordinates. Latitude and longitude must be numbers.' }), { status: 400 });
    }

    if (latitude < 6.5 || latitude > 37.6 || longitude < 68.7 || longitude > 97.25) {
      return new Response(JSON.stringify({ error: 'Coordinates must be within India bounds' }), { status: 400 });
    }

    // Convert coordinates to words
    const words = coordsToWords(latitude, longitude, wordsData);
    let safeWords = words;
    if (typeof words === 'string') {
      // Try to split by 6-letter chunks (since your words are 6 letters)
      safeWords = (words as string).match(/.{1,6}/g) || [words];
    }
    return new Response(JSON.stringify({
      success: true,
      words: safeWords,
      coordinates: { latitude, longitude },
      message: `Location converted to words successfully`
    }), { status: 200 });

  } catch (error) {
    return new Response(JSON.stringify({
      error: 'Internal server error',
      message: error instanceof Error ? error.message : 'Unknown error'
    }), { status: 500 });
  }
} 