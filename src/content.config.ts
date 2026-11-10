import { defineCollection } from "astro:content";
import { glob } from "astro/loaders";
import { z } from "astro/zod";

const events = defineCollection({
  loader: glob({ pattern: "**/*.json", base: "./src/content/events" }),
  schema: z.object({
    title: z.string(),
    summary: z.string(),
    start: z.coerce.date(),
    end: z.coerce.date().optional(),
    location: z.string(),
    status: z.enum(["confirmed", "tickets-planned", "save-the-date", "completed"]),
    statusLabel: z.string(),
    path: z.string().optional(),
    ctaLabel: z.string().optional(),
    ctaButton: z.boolean().default(false),
    archive: z.boolean().default(false),
    allDay: z.boolean().default(false),
    archiveFrom: z.coerce.date().optional(),
    image: z.string().optional(),
    imageAlt: z.string().optional(),
    pastSummary: z.string().optional(),
    lead: z.string().optional(),
    ticketPrice: z.string().optional(),
    ticketUrl: z.url().optional(),
    ticketNote: z.string().optional(),
    goodToKnow: z.array(z.object({ label: z.string(), text: z.string() })).optional(),
    guide: z.object({ path: z.string(), fileName: z.string(), size: z.string().optional() }).optional(),
    gettingThere: z.array(z.object({ label: z.string(), text: z.string(), url: z.url().optional(), urlLabel: z.string().optional() })).optional(),
    info: z.object({ label: z.string(), text: z.string() }).optional(),
    schedule: z.array(z.object({
      time: z.coerce.date(),
      label: z.string(),
      detail: z.string().optional(),
      burst: z.enum(["small", "finale"]).optional(),
    })).optional(),
    volunteerRoles: z.array(z.object({
      name: z.string(),
      group: z.string(),
      dates: z.string(),
      description: z.string(),
      url: z.url(),
      shifts: z.array(z.object({ label: z.string(), when: z.string(), helpers: z.number().int().positive() })),
    })).optional(),
    contactEmail: z.email().optional(),
    signupUrl: z.url().optional(),
    volunteeringPath: z.string().optional(),
    signupActivities: z.array(z.object({ name: z.string(), description: z.string(), anchor: z.string(), schedule: z.array(z.object({label:z.string(),when:z.string()})) })).optional(),
    loanSignupAnchor: z.string().optional(),
    entry: z.string().optional(),
    whatsOn: z.array(z.string()).optional(),
    helpAreas: z.array(z.object({
      name: z.string(),
      icon: z.enum(["funzone", "craft", "cafe", "photo", "tombola", "tokens", "sparkle"]),
    })).optional(),
    reviewed: z.coerce.date().optional(),
  }),
});

const newsletters = defineCollection({
  loader: glob({ pattern: "**/*.json", base: "./src/content/newsletters" }),
  schema: z.object({
    title: z.string(),
    published: z.coerce.date().optional(),
    summary: z.string(),
    sections: z.array(z.object({ title: z.string().optional(), heading: z.boolean().optional(), paragraphs: z.array(z.string()).default([]), list: z.array(z.string()).optional(), closing: z.array(z.string()).optional() })).optional(),
    latest: z.boolean().default(false),
  }),
});

const committee = defineCollection({
  loader: glob({ pattern: "**/*.json", base: "./src/content/committee" }),
  schema: z.object({
    name: z.string(),
    role: z.string(),
    portrait: z.string(),
    order: z.number(),
    imageClass: z.string().optional(),
  }),
});

const fundraising = defineCollection({
  loader: glob({ pattern: "**/*.json", base: "./src/content/fundraising" }),
  schema: z.object({
    title: z.string(),
    target: z.number().positive(),
    sources: z.array(z.object({ label: z.string(), amount: z.number().nonnegative() })),
    donateUrl: z.url(),
    updated: z.coerce.date(),
    previousYear: z.object({
      year: z.string(),
      raised: z.number().nonnegative(),
      impact: z.string(),
      sources: z.array(z.string()),
    }),
    priorities: z.array(z.object({
      title: z.string(),
      estimate: z.number().positive(),
      description: z.string(),
    })),
    annualSupport: z.array(z.object({
      title: z.string(),
      tone: z.enum(["green", "amber", "neutral"]),
      items: z.array(z.object({
        label: z.string(),
        icon: z.enum(["laptop", "bag", "tie", "cap", "star", "bee", "sparkle"]),
      })),
    })),
  }),
});

export const collections = { events, newsletters, committee, fundraising };
