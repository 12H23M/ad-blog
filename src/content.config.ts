import { defineCollection, z } from 'astro:content';

const posts = defineCollection({
  type: 'content',
  schema: z.object({
    title: z.string(),
    description: z.string(),
    pubDate: z.string(),
    category: z.enum(['culture', 'food', 'travel', 'lifestyle', 'language']),
    shortId: z.string().length(6),
    keywords: z.string().optional(),
  }),
});

export const collections = {
  posts,
};
