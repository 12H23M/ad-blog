import { defineCollection, z } from 'astro:content';

const posts = defineCollection({
  type: 'content',
  schema: z.object({
    title: z.string(),
    description: z.string(),
    pubDate: z.string(),
    lang: z.enum(['ko', 'en']),
    category: z.enum(['system', 'strategy', 'daily', 'insight', 'tutorial']),
    series: z.string().optional(),
    seriesOrder: z.number().optional(),
    translationOf: z.string().optional(),
    tags: z.array(z.string()),
    draft: z.boolean().default(false),
  }),
});

export const collections = {
  posts,
};
