'use server';

import { auth } from '@clerk/nextjs/server';
import { GoogleGenerativeAI, SchemaType } from '@google/generative-ai';
import type { HobbyCategory } from '@/lib/types';

export type DiscoveryShortAnswerInput = {
  category: HobbyCategory;
  goal: string;
  barriers: string;
  availability: string;
  preferences: string;
};

export type HobbyRecommendation = {
  name: string;
  reason: string;
  category: HobbyCategory;
  starter_plan: {
    duration: string;
    frequency: string;
    first_task: string;
  };
};

export type HobbyRecommendationResult = {
  recommendations: HobbyRecommendation[];
  source: 'ai' | 'fallback';
};

type RawRecommendation = Partial<{
  name: unknown;
  reason: unknown;
  category: unknown;
  starter_plan: Partial<{
    duration: unknown;
    frequency: unknown;
    first_task: unknown;
  }>;
}>;

const HOBBY_CATEGORIES: HobbyCategory[] = ['physical', 'intellectual', 'creative'];

const FALLBACK_TEMPLATES: Record<HobbyCategory, HobbyRecommendation[]> = {
  physical: [
    {
      name: 'Walking Routine',
      reason: 'A low-friction walking habit works well when you need something flexible, inexpensive, and easy to restart after missed days.',
      category: 'physical',
      starter_plan: {
        duration: '10-15 minutes',
        frequency: 'Daily',
        first_task: 'Walk one easy loop at a conversational pace',
      },
    },
    {
      name: 'Yoga at Home',
      reason: 'A short home yoga routine gives you movement without commute, equipment, or intensity pressure.',
      category: 'physical',
      starter_plan: {
        duration: '15 minutes',
        frequency: '3 times per week',
        first_task: 'Try one beginner flow with a short cooldown',
      },
    },
    {
      name: 'Bodyweight Circuit',
      reason: 'Simple bodyweight training creates visible progress while keeping the first version small enough to repeat.',
      category: 'physical',
      starter_plan: {
        duration: '20 minutes',
        frequency: '3 times per week',
        first_task: 'Complete one round of 3 beginner exercises',
      },
    },
  ],
  intellectual: [
    {
      name: 'Language Learning',
      reason: 'Short language sessions are easy to fit into uneven days and give you clear feedback after every practice.',
      category: 'intellectual',
      starter_plan: {
        duration: '10-15 minutes',
        frequency: 'Daily',
        first_task: 'Complete one short lesson and review five words',
      },
    },
    {
      name: 'Reading Practice',
      reason: 'A focused reading habit gives you a calm intellectual routine without needing special equipment or a long block of time.',
      category: 'intellectual',
      starter_plan: {
        duration: '15 minutes',
        frequency: '3 times per week',
        first_task: 'Read one short article or chapter section and write one takeaway',
      },
    },
    {
      name: 'Logic Puzzles',
      reason: 'Puzzles are contained, measurable, and useful when you want mental challenge without starting a large course.',
      category: 'intellectual',
      starter_plan: {
        duration: '20 minutes',
        frequency: '4 times per week',
        first_task: 'Finish one beginner puzzle and note the pattern you used',
      },
    },
  ],
  creative: [
    {
      name: 'Sketching',
      reason: 'Sketching keeps the setup light and makes it easy to practice creativity in short, repeatable sessions.',
      category: 'creative',
      starter_plan: {
        duration: '10-15 minutes',
        frequency: 'Daily',
        first_task: 'Fill one page with quick object sketches',
      },
    },
    {
      name: 'Creative Writing',
      reason: 'Writing works well when you want a private creative outlet with almost no materials or prep time.',
      category: 'creative',
      starter_plan: {
        duration: '15 minutes',
        frequency: '3 times per week',
        first_task: 'Write one scene, memory, or prompt response without editing',
      },
    },
    {
      name: 'Collage Making',
      reason: 'Collage is playful and tactile, which helps if you want a creative habit that feels less performance-driven.',
      category: 'creative',
      starter_plan: {
        duration: '20 minutes',
        frequency: '2 times per week',
        first_task: 'Assemble one mood board from scraps, photos, or magazine cutouts',
      },
    },
  ],
};

function sanitizeText(value: string, fallback: string) {
  const sanitized = value.replace(/\s+/g, ' ').trim();
  return sanitized.length > 0 ? sanitized.slice(0, 500) : fallback;
}

function parseCategory(value: HobbyCategory): HobbyCategory {
  return HOBBY_CATEGORIES.includes(value) ? value : 'physical';
}

function getFallbackRecommendations(input: DiscoveryShortAnswerInput): HobbyRecommendation[] {
  const category = parseCategory(input.category);
  const goal = sanitizeText(input.goal, 'build a steady routine').toLowerCase();
  const availability = sanitizeText(input.availability, 'a small weekly time commitment').toLowerCase();
  const barriers = sanitizeText(input.barriers, 'ordinary schedule friction').toLowerCase();

  return FALLBACK_TEMPLATES[category].map((recommendation, index) => ({
    ...recommendation,
    reason:
      index === 0
        ? `${recommendation.reason} It is a strong fit for your goal to ${goal} with ${availability}.`
        : index === 1
          ? `${recommendation.reason} This option is designed to stay realistic around ${barriers}.`
          : `${recommendation.reason} Choose this if you want a slightly different rhythm while still keeping the commitment manageable.`,
  }));
}

function isRecommendation(value: RawRecommendation, expectedCategory: HobbyCategory): value is HobbyRecommendation {
  return (
    typeof value.name === 'string' &&
    typeof value.reason === 'string' &&
    value.category === expectedCategory &&
    typeof value.starter_plan?.duration === 'string' &&
    typeof value.starter_plan.frequency === 'string' &&
    typeof value.starter_plan.first_task === 'string'
  );
}

function normalizeRecommendations(value: unknown, expectedCategory: HobbyCategory) {
  if (!value || typeof value !== 'object' || !('recommendations' in value)) {
    return [];
  }

  const recommendations = (value as { recommendations?: unknown }).recommendations;

  if (!Array.isArray(recommendations)) {
    return [];
  }

  return recommendations
    .filter((recommendation): recommendation is HobbyRecommendation =>
      isRecommendation(recommendation as RawRecommendation, expectedCategory)
    )
    .slice(0, 3)
    .map((recommendation) => ({
      name: recommendation.name.slice(0, 80),
      reason: recommendation.reason.slice(0, 360),
      category: expectedCategory,
      starter_plan: {
        duration: recommendation.starter_plan.duration.slice(0, 60),
        frequency: recommendation.starter_plan.frequency.slice(0, 60),
        first_task: recommendation.starter_plan.first_task.slice(0, 140),
      },
    }));
}

async function requireUserId() {
  const { userId } = await auth();

  if (!userId) {
    throw new Error('Unauthorized');
  }

  return userId;
}

export async function generateHobbyRecommendationsAction(
  input: DiscoveryShortAnswerInput
): Promise<HobbyRecommendationResult> {
  await requireUserId();

  const category = parseCategory(input.category);
  const normalizedInput = {
    category,
    goal: sanitizeText(input.goal, 'build a steady routine'),
    barriers: sanitizeText(input.barriers, 'ordinary schedule friction'),
    availability: sanitizeText(input.availability, '10 to 20 minutes a few times per week'),
    preferences: sanitizeText(input.preferences, 'low setup and beginner friendly'),
  };
  const fallbackRecommendations = getFallbackRecommendations(normalizedInput);
  const apiKey = process.env.GEMINI_API_KEY ?? process.env.GOOGLE_GENERATIVE_AI_API_KEY;

  if (!apiKey) {
    return {
      recommendations: fallbackRecommendations,
      source: 'fallback',
    };
  }

  try {
    const genAI = new GoogleGenerativeAI(apiKey);
    const model = genAI.getGenerativeModel({
      model: process.env.GEMINI_MODEL ?? 'gemini-2.5-flash',
      generationConfig: {
        temperature: 0.7,
        maxOutputTokens: 1200,
        responseMimeType: 'application/json',
        responseSchema: {
          type: SchemaType.OBJECT,
          properties: {
            recommendations: {
              type: SchemaType.ARRAY,
              minItems: 3,
              maxItems: 3,
              items: {
                type: SchemaType.OBJECT,
                properties: {
                  name: { type: SchemaType.STRING },
                  reason: { type: SchemaType.STRING },
                  category: { type: SchemaType.STRING },
                  starter_plan: {
                    type: SchemaType.OBJECT,
                    properties: {
                      duration: { type: SchemaType.STRING },
                      frequency: { type: SchemaType.STRING },
                      first_task: { type: SchemaType.STRING },
                    },
                    required: ['duration', 'frequency', 'first_task'],
                  },
                },
                required: ['name', 'reason', 'category', 'starter_plan'],
              },
            },
          },
          required: ['recommendations'],
        },
      },
    });
    const result = await model.generateContent(`
You are Trio's hobby recommendation agent. Recommend exactly 3 beginner-friendly ${category} hobbies.

Use the user's short-answer discovery profile:
- Goal: ${normalizedInput.goal}
- Barriers: ${normalizedInput.barriers}
- Availability: ${normalizedInput.availability}
- Preferences and constraints: ${normalizedInput.preferences}

Rules:
- Keep every recommendation in the ${category} category.
- Prefer affordable, safe, realistic activities for a beginner.
- Avoid medical, therapeutic, or high-risk claims.
- The first task must be one concrete action the user can complete today.
- Duration and frequency should be modest enough for habit formation.
`);
    const parsed = JSON.parse(result.response.text());
    const recommendations = normalizeRecommendations(parsed, category);

    if (recommendations.length === 3) {
      return {
        recommendations,
        source: 'ai',
      };
    }
  } catch (error) {
    console.error(error);
  }

  return {
    recommendations: fallbackRecommendations,
    source: 'fallback',
  };
}
