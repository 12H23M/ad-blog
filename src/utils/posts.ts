import { getCollection } from 'astro:content';
import type { Lang } from '../i18n/utils';

export async function getAllPosts() {
  const posts = await getCollection('posts');
  return posts
    .filter((p) => !p.data.draft)
    .sort((a, b) => new Date(b.data.pubDate).getTime() - new Date(a.data.pubDate).getTime());
}

export async function getPostsByLang(lang: Lang) {
  const posts = await getAllPosts();
  return posts.filter((p) => p.data.lang === lang);
}

export async function getPostsByCategory(category: string) {
  const posts = await getAllPosts();
  return posts.filter((p) => p.data.category === category);
}

export async function getPostsBySeries(seriesSlug: string) {
  const posts = await getAllPosts();
  return posts
    .filter((p) => p.data.series === seriesSlug)
    .sort((a, b) => (a.data.seriesOrder ?? 0) - (b.data.seriesOrder ?? 0));
}

export async function getSeriesList() {
  const posts = await getAllPosts();
  const seriesMap = new Map<string, { slug: string; count: number; langs: Set<Lang>; latestDate: string }>();

  for (const post of posts) {
    if (!post.data.series) continue;
    const existing = seriesMap.get(post.data.series);
    if (existing) {
      existing.count++;
      existing.langs.add(post.data.lang);
      if (new Date(post.data.pubDate) > new Date(existing.latestDate)) {
        existing.latestDate = post.data.pubDate;
      }
    } else {
      seriesMap.set(post.data.series, {
        slug: post.data.series,
        count: 1,
        langs: new Set([post.data.lang]),
        latestDate: post.data.pubDate,
      });
    }
  }

  return Array.from(seriesMap.values()).sort(
    (a, b) => new Date(b.latestDate).getTime() - new Date(a.latestDate).getTime()
  );
}

export async function getTranslation(slug: string, translationOf?: string) {
  if (!translationOf) return null;
  const posts = await getAllPosts();
  return posts.find((p) => p.id === translationOf) ?? null;
}

export function getReadingTime(content: string): number {
  const words = content.split(/\s+/).length;
  return Math.max(1, Math.ceil(words / 200));
}

export const categoryColors: Record<string, string> = {
  system: '#00D4FF',
  strategy: '#00FF88',
  daily: '#FFB800',
  insight: '#FF6B6B',
  tutorial: '#A78BFA',
};
