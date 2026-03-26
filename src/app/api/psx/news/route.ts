import { NextRequest, NextResponse } from 'next/server';
import type { NewsArticle, NewsSourceKey } from '@/types';

interface SourceDef {
  key: Exclude<NewsSourceKey, 'all'>;
  name: string;
  rssUrl: string;
}

const SOURCES: SourceDef[] = [
  { key: 'dawn', name: 'Dawn', rssUrl: 'https://www.dawn.com/feeds/business' },
  { key: 'tribune', name: 'The Express Tribune', rssUrl: 'https://tribune.com.pk/feed/business' },
  { key: 'recorder', name: 'Business Recorder', rssUrl: 'https://www.brecorder.com/feeds/business' },
  { key: 'profit', name: 'Profit by Pakistan Today', rssUrl: 'https://profit.pakistantoday.com.pk/feed' },
];

function extractText(xml: string, tag: string): string {
  // Try CDATA first
  const cdataRe = new RegExp(`<${tag}[^>]*>\\s*<!\\[CDATA\\[([\\s\\S]*?)\\]\\]>\\s*</${tag}>`, 'i');
  const cdataMatch = xml.match(cdataRe);
  if (cdataMatch) return cdataMatch[1].trim();

  // Plain text
  const plainRe = new RegExp(`<${tag}[^>]*>([\\s\\S]*?)</${tag}>`, 'i');
  const plainMatch = xml.match(plainRe);
  if (plainMatch) return plainMatch[1].trim();

  return '';
}

function stripHtml(html: string): string {
  return html
    .replace(/<[^>]*>/g, '')
    .replace(/&amp;/g, '&')
    .replace(/&lt;/g, '<')
    .replace(/&gt;/g, '>')
    .replace(/&quot;/g, '"')
    .replace(/&#039;/g, "'")
    .replace(/&nbsp;/g, ' ')
    .replace(/\s+/g, ' ')
    .trim();
}

function extractImageUrl(itemXml: string): string | null {
  // media:content or media:thumbnail
  const mediaRe = /url=["']([^"']+\.(?:jpg|jpeg|png|webp|gif)[^"']*)/i;
  const mediaMatch = itemXml.match(mediaRe);
  if (mediaMatch) return mediaMatch[1];

  // <enclosure url="...">
  const encRe = /<enclosure[^>]+url=["']([^"']+)/i;
  const encMatch = itemXml.match(encRe);
  if (encMatch) return encMatch[1];

  // <img src="..."> inside content
  const imgRe = /<img[^>]+src=["']([^"']+)/i;
  const imgMatch = itemXml.match(imgRe);
  if (imgMatch) return imgMatch[1];

  // og:image style
  const ogRe = /property=["']og:image["'][^>]+content=["']([^"']+)/i;
  const ogMatch = itemXml.match(ogRe);
  if (ogMatch) return ogMatch[1];

  return null;
}

function parseRssFeed(xml: string, source: SourceDef): NewsArticle[] {
  const articles: NewsArticle[] = [];

  // Split by <item> tags
  const items = xml.split(/<item[\s>]/i).slice(1);

  for (const rawItem of items) {
    const itemXml = rawItem.split(/<\/item>/i)[0] || '';

    const title = stripHtml(extractText(itemXml, 'title'));
    if (!title) continue;

    const link = extractText(itemXml, 'link') || extractText(itemXml, 'guid');
    const pubDate = extractText(itemXml, 'pubDate');
    const author = extractText(itemXml, 'dc:creator') || extractText(itemXml, 'author');
    const category = extractText(itemXml, 'category');

    // Get description — prefer short description, fallback to content:encoded
    let description = stripHtml(extractText(itemXml, 'description'));
    if (!description) {
      const encoded = extractText(itemXml, 'content:encoded');
      description = stripHtml(encoded).slice(0, 300);
    }
    // Clean boilerplate
    description = description.replace(/The post .+ appeared first on .+\.?$/, '').trim();
    if (description.length > 250) description = description.slice(0, 247) + '...';

    const imageUrl = extractImageUrl(itemXml);

    const id = `${source.key}-${Buffer.from(link || title).toString('base64url').slice(0, 16)}`;

    articles.push({
      id,
      title,
      description,
      link: link.startsWith('http') ? link : '',
      imageUrl,
      source: source.key,
      sourceName: source.name,
      pubDate,
      category: stripHtml(category),
      author: stripHtml(author),
    });
  }

  return articles;
}

async function fetchSource(source: SourceDef): Promise<NewsArticle[]> {
  try {
    const res = await fetch(source.rssUrl, {
      next: { revalidate: 900 }, // 15 min cache
      headers: {
        'User-Agent': 'PSXTracker/1.0 (RSS Reader)',
        Accept: 'application/rss+xml, application/xml, text/xml',
      },
    });

    if (!res.ok) return [];

    const xml = await res.text();
    return parseRssFeed(xml, source);
  } catch {
    console.error(`Failed to fetch ${source.name} RSS`);
    return [];
  }
}

export async function GET(request: NextRequest) {
  const { searchParams } = new URL(request.url);
  const sourceFilter = (searchParams.get('source') || 'all') as NewsSourceKey;

  try {
    const sourcesToFetch = sourceFilter === 'all'
      ? SOURCES
      : SOURCES.filter((s) => s.key === sourceFilter);

    // Fetch all sources in parallel
    const results = await Promise.all(sourcesToFetch.map(fetchSource));
    const allArticles = results.flat();

    // Sort by date (newest first)
    allArticles.sort((a, b) => {
      const dateA = a.pubDate ? new Date(a.pubDate).getTime() : 0;
      const dateB = b.pubDate ? new Date(b.pubDate).getTime() : 0;
      return dateB - dateA;
    });

    return NextResponse.json(
      { articles: allArticles, count: allArticles.length, source: sourceFilter },
      {
        headers: {
          'Cache-Control': 'public, s-maxage=900, stale-while-revalidate=1800',
        },
      }
    );
  } catch {
    return NextResponse.json(
      { articles: [], count: 0, error: 'Failed to fetch news' },
      { status: 500 }
    );
  }
}
