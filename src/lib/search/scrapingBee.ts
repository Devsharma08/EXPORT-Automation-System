import { SCRAPINGBEE_API_KEY, SERPER_API_KEY, TAVILY_API_KEY } from '@/lib/config';
import * as cheerio from 'cheerio';

export async function fetchWithScrapingBee(targetUrl: string, renderJs = false, timeoutMs = 15000): Promise<Response> {
  const sbKey = process.env.SCRAPINGBEE_API_KEY || SCRAPINGBEE_API_KEY;
  if (!sbKey) {
    return fetch(targetUrl, {
      headers: {
        'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/122.0.0.0 Safari/537.36',
        'Accept': 'text/html,application/xhtml+xml,application/xml;q=0.9,image/avif,image/webp,*/*;q=0.8',
        'Accept-Language': 'en-US,en;q=0.9',
      },
      signal: AbortSignal.timeout(timeoutMs)
    });
  }

  const scrapingBeeUrl = new URL('https://app.scrapingbee.com/api/v1/');
  scrapingBeeUrl.searchParams.append('api_key', sbKey);
  scrapingBeeUrl.searchParams.append('url', targetUrl);
  scrapingBeeUrl.searchParams.append('render_js', renderJs ? 'true' : 'false');
  
  return fetch(scrapingBeeUrl.toString(), {
    signal: AbortSignal.timeout(timeoutMs + 5000)
  });
}

// ── Native Free DuckDuckGo HTML Scraper ──────────────────────────────────────
async function searchNativeFreeDuckDuckGo(query: string, maxResults = 10): Promise<{ title: string; url: string; snippet: string }[]> {
  try {
    const formData = new URLSearchParams();
    formData.append('q', query);

    const res = await fetch('https://html.duckduckgo.com/html/', {
      method: 'POST',
      headers: {
        'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/122.0.0.0 Safari/537.36',
        'Content-Type': 'application/x-www-form-urlencoded',
        'Accept': 'text/html,application/xhtml+xml,application/xml;q=0.9,*/*;q=0.8',
      },
      body: formData.toString(),
      signal: AbortSignal.timeout(12000),
    });

    if (!res.ok) return [];

    const html = await res.text();
    const $ = cheerio.load(html);
    const results: { title: string; url: string; snippet: string }[] = [];

    $('.result').each((_, element) => {
      const title = $(element).find('.result__title a').text().trim();
      let rawUrl = $(element).find('.result__title a').attr('href') || '';
      const snippet = $(element).find('.result__snippet').text().trim();

      // DuckDuckGo redirects via /l/?uddg=...
      if (rawUrl.includes('uddg=')) {
        try {
          const match = rawUrl.match(/uddg=([^&]+)/);
          if (match && match[1]) {
            rawUrl = decodeURIComponent(match[1]);
          }
        } catch {
          // Keep rawUrl if decoding fails
        }
      }

      if (title && rawUrl.startsWith('http')) {
        results.push({ title, url: rawUrl, snippet });
      }
    });

    return results.slice(0, maxResults);
  } catch (err) {
    console.log('Native DuckDuckGo free search error:', err);
    return [];
  }
}

// ── Serper.dev Google API Integration ───────────────────────────────────────
async function searchSerperApi(query: string, maxResults = 10, apiKey: string): Promise<{ title: string; url: string; snippet: string }[]> {
  try {
    const res = await fetch('https://google.serper.dev/search', {
      method: 'POST',
      headers: {
        'X-API-KEY': apiKey,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({ q: query, num: Math.min(maxResults, 20) }),
      signal: AbortSignal.timeout(12000),
    });

    if (!res.ok) return [];
    const data = await res.json();
    const organic = data.organic || [];

    return organic.map((item: Record<string, string>) => ({
      title: item.title || '',
      url: item.link || item.url || '',
      snippet: item.snippet || '',
    })).filter((r: { url: string }) => r.url.startsWith('http')).slice(0, maxResults);
  } catch (err) {
    console.log('Serper.dev API search error:', err);
    return [];
  }
}

// ── Tavily Search API Integration ──────────────────────────────────────────
async function searchTavilyApi(query: string, maxResults = 10, apiKey: string): Promise<{ title: string; url: string; snippet: string }[]> {
  try {
    const res = await fetch('https://api.tavily.com/search', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({ api_key: apiKey, query, max_results: maxResults }),
      signal: AbortSignal.timeout(12000),
    });

    if (!res.ok) return [];
    const data = await res.json();
    const results = data.results || [];

    return results.map((item: Record<string, string>) => ({
      title: item.title || '',
      url: item.url || '',
      snippet: item.content || item.snippet || '',
    })).filter((r: { url: string }) => r.url.startsWith('http')).slice(0, maxResults);
  } catch (err) {
    console.log('Tavily API search error:', err);
    return [];
  }
}

// ── ScrapingBee Search API Integration ──────────────────────────────────────
async function searchScrapingBeeApi(query: string, maxResults = 10, apiKey: string): Promise<{ title: string; url: string; snippet: string }[]> {
  const sbUrl = new URL('https://app.scrapingbee.com/api/v1/store/google');
  sbUrl.searchParams.append('api_key', apiKey);
  sbUrl.searchParams.append('search', query);
  sbUrl.searchParams.append('language', 'en');

  try {
    const res = await fetch(sbUrl.toString(), { signal: AbortSignal.timeout(15000) });
    const data = await res.json();
    
    if (data.error) {
       console.log("ScrapingBee Store API error:", data.error);
       return [];
    }

    const results = data.organic_results || [];
    return results.map((r: Record<string, string>) => ({
      title: r.title || '',
      url: r.url || '',
      snippet: r.description || ''
    })).filter((r: { url: string }) => r.url.startsWith('http')).slice(0, maxResults);
  } catch (err) {
    console.error("ScrapingBee API failed:", err);
    return [];
  }
}

// ── Multi-Provider Search Gateway ───────────────────────────────────────────
export async function searchGoogleApi(query: string, maxResults = 10): Promise<{ title: string; url: string; snippet: string }[]> {
  const sbKey = process.env.SCRAPINGBEE_API_KEY || SCRAPINGBEE_API_KEY;
  const serperKey = process.env.SERPER_API_KEY || SERPER_API_KEY;
  const tavilyKey = process.env.TAVILY_API_KEY || TAVILY_API_KEY;

  // 1. Try Serper.dev if key provided (fastest, 2,500 free queries)
  if (serperKey) {
    const serperRes = await searchSerperApi(query, maxResults, serperKey);
    if (serperRes.length > 0) return serperRes;
  }

  // 2. Try ScrapingBee if key provided
  if (sbKey) {
    const sbRes = await searchScrapingBeeApi(query, maxResults, sbKey);
    if (sbRes.length > 0) return sbRes;
  }

  // 3. Try Tavily if key provided
  if (tavilyKey) {
    const tavilyRes = await searchTavilyApi(query, maxResults, tavilyKey);
    if (tavilyRes.length > 0) return tavilyRes;
  }

  // 4. Native Free Engine Fallback (Zero API Key required!)
  const nativeRes = await searchNativeFreeDuckDuckGo(query, maxResults);
  return nativeRes;
}
