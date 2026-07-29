import { SCRAPINGBEE_API_KEY } from '@/lib/config';

export async function fetchWithScrapingBee(targetUrl: string, renderJs = false, timeoutMs = 15000): Promise<Response> {
  if (!SCRAPINGBEE_API_KEY) {
    return fetch(targetUrl, {
      headers: {
        'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36',
        'Accept-Language': 'en-US,en;q=0.9',
      },
      signal: AbortSignal.timeout(timeoutMs)
    });
  }

  const scrapingBeeUrl = new URL('https://app.scrapingbee.com/api/v1/');
  scrapingBeeUrl.searchParams.append('api_key', SCRAPINGBEE_API_KEY);
  scrapingBeeUrl.searchParams.append('url', targetUrl);
  scrapingBeeUrl.searchParams.append('render_js', renderJs ? 'true' : 'false');
  
  return fetch(scrapingBeeUrl.toString(), {
    signal: AbortSignal.timeout(timeoutMs + 5000)
  });
}

// Robust JSON API provided by ScrapingBee for Google Searches
export async function searchGoogleApi(query: string, maxResults = 10): Promise<{ title: string; url: string; snippet: string }[]> {
  if (!SCRAPINGBEE_API_KEY) return [];

  const sbUrl = new URL('https://app.scrapingbee.com/api/v1/store/google');
  sbUrl.searchParams.append('api_key', SCRAPINGBEE_API_KEY);
  sbUrl.searchParams.append('search', query);
  sbUrl.searchParams.append('language', 'en');
  // sbUrl.searchParams.append('nb_results', Math.min(maxResults, 100).toString());

  try {
    const res = await fetch(sbUrl.toString(), { signal: AbortSignal.timeout(20000) });
    const data = await res.json();
    
    // Handle ScrapingBee's internal temporary errors
    if (data.error) {
       console.log("ScrapingBee Store API error:", data.error);
       return [];
    }

    const results = data.organic_results || [];
    return results.map((r: Record<string, string>) => ({
      title: r.title || '',
      url: r.url || '',
      snippet: r.description || ''
    })).slice(0, maxResults);
  } catch (err) {
    console.error("Search API failed:", err);
    return [];
  }
}
