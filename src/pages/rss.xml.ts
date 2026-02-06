import rss from '@astrojs/rss';
import { getCollection } from 'astro:content';
import type { APIContext } from 'astro';

const categoryNames: Record<string, string> = {
  'culture': 'Culture',
  'food': 'Food',
  'travel': 'Travel',
  'lifestyle': 'Lifestyle',
  'language': 'Language'
};

export async function GET(context: APIContext) {
  const posts = await getCollection('posts');
  const sortedPosts = posts.sort((a, b) =>
    new Date(b.data.pubDate).getTime() - new Date(a.data.pubDate).getTime()
  );

  return rss({
    title: 'Baksuls Blog',
    description: 'Introducing Korea to the world — culture, food, travel, lifestyle, and language tips for anyone curious about Korea.',
    site: context.site ?? 'https://baksuls.com',
    items: sortedPosts.map((post) => ({
      title: post.data.title,
      pubDate: new Date(post.data.pubDate),
      description: post.data.description,
      link: `/${post.data.category}/${post.data.shortId}/`,
      categories: [categoryNames[post.data.category] || post.data.category],
    })),
    customData: `<language>en</language>`,
  });
}
