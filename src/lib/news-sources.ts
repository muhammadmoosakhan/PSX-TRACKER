import type { NewsSourceConfig, NewsSourceKey } from '@/types';

export const NEWS_SOURCES: Record<Exclude<NewsSourceKey, 'all'>, NewsSourceConfig> = {
  dawn: {
    key: 'dawn',
    name: 'Dawn',
    shortName: 'DAWN',
    rssUrl: 'https://www.dawn.com/feeds/business',
    color: '#1A1A1A',
    icon: 'D',
    homepage: 'https://www.dawn.com',
  },
  tribune: {
    key: 'tribune',
    name: 'The Express Tribune',
    shortName: 'TRIBUNE',
    rssUrl: 'https://tribune.com.pk/feed/business',
    color: '#E31E24',
    icon: 'T',
    homepage: 'https://tribune.com.pk',
  },
  recorder: {
    key: 'recorder',
    name: 'Business Recorder',
    shortName: 'RECORDER',
    rssUrl: 'https://www.brecorder.com/feeds/business',
    color: '#0B3D2E',
    icon: 'BR',
    homepage: 'https://www.brecorder.com',
  },
  profit: {
    key: 'profit',
    name: 'Profit by Pakistan Today',
    shortName: 'PROFIT',
    rssUrl: 'https://profit.pakistantoday.com.pk/feed',
    color: '#F58220',
    icon: 'pt',
    homepage: 'https://profit.pakistantoday.com.pk',
  },
};

export const SOURCE_KEYS = Object.keys(NEWS_SOURCES) as Exclude<NewsSourceKey, 'all'>[];

export function getSourceConfig(key: NewsSourceKey): NewsSourceConfig | null {
  if (key === 'all') return null;
  return NEWS_SOURCES[key] ?? null;
}
