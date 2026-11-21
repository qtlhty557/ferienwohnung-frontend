import { z } from 'zod';

// Data schema (matches your WP plugin import)
const DataSchema = z.object({
  name_de: z.string().min(1),
  name_en: z.string().optional(),
  place_de: z.string().optional(),
  place_en: z.string().optional(),
  price_per_night: z.number().positive(),
  currency: z.string().default('EUR'),
  max_guests: z.number().int().positive(),
  min_nights: z.number().int().positive().default(2),
  max_nights: z.number().int().positive().optional(),
  downpayment_percent: z.number().min(0).max(100).default(30),
  description_de: z.string().optional(),
  description_en: z.string().optional(),
  images: z.array(z.string().url()).min(1),
  owner: z.object({
    name: z.string().min(1),
    email: z.string().email(),
    phone: z.string().optional(),
    whatsapp: z.string().optional(),
    address: z.string().optional(),
    website: z.string().url().optional(),
  }),
  seasons: z.array(z.object({
    name_de: z.string(),
    name_en: z.string().optional(),
    start_month_day: z.string().regex(/^\d{2}-\d{2}$/),
    end_month_day: z.string().regex(/^\d{2}-\d{2}$/),
    price_per_night: z.number().positive(),
    is_active: z.boolean().default(true),
  })).optional(),
});

// Design schema
const DesignSchema = z.object({
  preset: z.enum([
    'modern-minimal',
    'cozy-rustic',
    'luxury-dark',
    'family-bright',
    'nature-immersive',
    'urban-chic'
  ]),
  colors: z.object({
    primary: z.string().regex(/^#[0-9a-fA-F]{6}$/),
    secondary: z.string().regex(/^#[0-9a-fA-F]{6}$/),
    accent: z.string().regex(/^#[0-9a-fA-F]{6}$/),
    background: z.string().regex(/^#[0-9a-fA-F]{6}$/).optional(),
    text: z.string().regex(/^#[0-9a-fA-F]{6}$/).optional(),
  }),
  fonts: z.object({
    heading: z.string(),
    body: z.string(),
  }),
  layout: z.enum([
    'hero-gallery-calendar',
    'split-map',
    'fullscreen-slider',
    'magazine',
    'compact'
  ]),
  components: z.object({
    gallery: z.enum(['swiper-masonry', 'flickity', 'lightbox-only', 'swiper-fullscreen', 'grid']),
    calendar: z.enum(['inline-range', 'modal-picker', 'sidebar', 'dropdown']),
    effects: z.array(z.enum([
      'scroll-reveal',
      'parallax-hero',
      'hover-zoom',
      'magnetic-buttons',
      'page-transitions',
      'text-reveal',
      'image-compare'
    ])).default([]),
  }),
});

// Main site schema
export const SiteSchema = z.object({
  domain: z.string().min(1),
  slug: z.string().optional(),
  data: DataSchema,
  design: DesignSchema,
});

// Type exports (for JSDoc / TypeScript consumers)
// export type SiteData = z.infer<typeof DataSchema>;
// export type SiteDesign = z.infer<typeof DesignSchema>;
// export type SiteConfig = z.infer<typeof SiteSchema>;