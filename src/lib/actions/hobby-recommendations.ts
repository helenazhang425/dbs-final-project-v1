'use server';

import { auth } from '@clerk/nextjs/server';
import { GoogleGenerativeAI, SchemaType } from '@google/generative-ai';
import { headers } from 'next/headers';
import {
  checkAiBudget,
  estimateTokenCount,
  fingerprintIpAddress,
  recordAiUsageEvent,
  type AiFeature,
  type AiUsageStatus,
} from '@/lib/ai-usage';
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

export type CustomHobbyPlanInput = {
  category: HobbyCategory;
  name: string;
  attempt?: number;
  previousPlan?: {
    duration?: string;
    frequency?: string;
    firstTask?: string;
  };
};

export type CustomHobbyPlanResult = {
  recommendation: HobbyRecommendation;
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
const DEFAULT_GEMINI_MODEL = 'gemini-2.5-flash';
const CUSTOM_PLAN_MAX_OUTPUT_TOKENS = 600;
const RECOMMENDATIONS_MAX_OUTPUT_TOKENS = 1200;

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

function normalizeCustomRecommendation(value: unknown, expectedCategory: HobbyCategory, fallbackName: string) {
  if (!value || typeof value !== 'object' || !('recommendation' in value)) {
    return null;
  }

  const recommendation = (value as { recommendation?: unknown }).recommendation as RawRecommendation;

  if (!isRecommendation(recommendation, expectedCategory)) {
    return null;
  }

  return {
    name: sanitizeText(recommendation.name, fallbackName).slice(0, 80),
    reason: sanitizeText(recommendation.reason, `${fallbackName} is ready to begin with a small first step.`).slice(0, 360),
    category: expectedCategory,
    starter_plan: {
      duration: sanitizeText(recommendation.starter_plan.duration, '10 minutes').slice(0, 60),
      frequency: sanitizeText(recommendation.starter_plan.frequency, '3 times per week').slice(0, 60),
      first_task: sanitizeText(
        recommendation.starter_plan.first_task,
        `Spend 10 minutes setting up one beginner ${fallbackName} session`
      ).slice(0, 140),
    },
  };
}

function getCustomHobbyFallback(category: HobbyCategory, name: string, attempt = 0): HobbyRecommendation {
  const fallbackPlans = [
    {
      duration: '10 minutes',
      frequency: '3 times per week',
      first_task: `Spend 10 minutes on one beginner ${name} session`,
      reasonDetail: 'a small first session',
    },
    {
      duration: '15 minutes',
      frequency: '2 times per week',
      first_task: `Pick one beginner ${name} skill and practice only that piece for 15 minutes`,
      reasonDetail: 'one narrow skill focus',
    },
    {
      duration: '5 minutes',
      frequency: 'Daily',
      first_task: `Set up for ${name} and do the smallest useful warm-up or drill for 5 minutes`,
      reasonDetail: 'a tiny daily warm-up',
    },
    {
      duration: '20 minutes',
      frequency: '2 times per week',
      first_task: `Do one low-pressure ${name} session and stop while it still feels manageable`,
      reasonDetail: 'a slightly longer but less frequent rhythm',
    },
  ];
  const plan = fallbackPlans[Math.abs(attempt) % fallbackPlans.length];

  return {
    name,
    category,
    reason: `You already know ${name} is the hobby you want to try, so Trio is starting with ${plan.reasonDetail} instead of forcing a recommendation choice.`,
    starter_plan: {
      duration: plan.duration,
      frequency: plan.frequency,
      first_task: plan.first_task,
    },
  };
}

async function requireUserId() {
  const { userId } = await auth();

  if (!userId) {
    throw new Error('Unauthorized');
  }

  return userId;
}

async function getRequestIpFingerprint() {
  const headersList = await headers();
  const forwardedFor = headersList.get('x-forwarded-for');
  const realIp = headersList.get('x-real-ip');
  const vercelForwardedFor = headersList.get('x-vercel-forwarded-for');
  const firstForwardedIp = forwardedFor?.split(',')[0]?.trim();

  return fingerprintIpAddress(firstForwardedIp ?? vercelForwardedFor ?? realIp);
}

function getGeminiModelName() {
  return process.env.GEMINI_MODEL ?? DEFAULT_GEMINI_MODEL;
}

function getErrorType(error: unknown) {
  return error instanceof Error ? error.name : 'UnknownError';
}

async function canUseAi(input: {
  clerkUserId: string;
  ipFingerprint: string | null;
  feature: AiFeature;
  category: HobbyCategory;
  model: string;
  prompt: string;
  maxOutputTokens: number;
}) {
  const estimatedInputTokens = estimateTokenCount(input.prompt);

  try {
    const budget = await checkAiBudget({
      clerkUserId: input.clerkUserId,
      ipFingerprint: input.ipFingerprint,
      feature: input.feature,
      category: input.category,
      model: input.model,
      estimatedInputTokens,
      maxOutputTokens: input.maxOutputTokens,
    });

    return {
      allowed: budget.allowed,
      estimatedInputTokens,
      blockedReason: budget.reason,
    };
  } catch (error) {
    console.error(error);
    return {
      allowed: false,
      estimatedInputTokens,
      blockedReason: 'budget_check_failed' as const,
    };
  }
}

async function safelyRecordAiUsage(input: {
  clerkUserId: string;
  ipFingerprint: string | null;
  feature: AiFeature;
  category: HobbyCategory;
  model: string;
  source: 'ai' | 'fallback';
  status: AiUsageStatus;
  estimatedInputTokens: number;
  maxOutputTokens: number;
  startedAt: number;
  errorType?: string;
}) {
  try {
    await recordAiUsageEvent({
      clerkUserId: input.clerkUserId,
      ipFingerprint: input.ipFingerprint,
      feature: input.feature,
      category: input.category,
      model: input.model,
      source: input.source,
      status: input.status,
      estimatedInputTokens: input.estimatedInputTokens,
      maxOutputTokens: input.maxOutputTokens,
      latencyMs: Date.now() - input.startedAt,
      errorType: input.errorType,
    });
  } catch (error) {
    console.error(error);
  }
}

export async function generateCustomHobbyPlanAction(
  input: CustomHobbyPlanInput
): Promise<CustomHobbyPlanResult> {
  const clerkUserId = await requireUserId();
  const ipFingerprint = await getRequestIpFingerprint();

  const category = parseCategory(input.category);
  const name = sanitizeText(input.name, 'new hobby').slice(0, 80);
  const attempt = Number.isFinite(input.attempt) ? Math.max(0, Math.floor(input.attempt ?? 0)) : 0;
  const previousPlan = input.previousPlan;
  const previousPlanInstruction = previousPlan
    ? `
This is regeneration attempt ${attempt + 1}. Make the new starter plan meaningfully different from the previous one:
- Previous duration: ${sanitizeText(previousPlan.duration ?? '', 'not provided')}
- Previous frequency: ${sanitizeText(previousPlan.frequency ?? '', 'not provided')}
- Previous first task: ${sanitizeText(previousPlan.firstTask ?? '', 'not provided')}
`
    : `
This is plan attempt ${attempt + 1}. If attempt is greater than 1, vary the cadence and first task from a generic first session.
`;
  const fallbackRecommendation = getCustomHobbyFallback(category, name, attempt);
  const apiKey = process.env.GEMINI_API_KEY ?? process.env.GOOGLE_GENERATIVE_AI_API_KEY;
  const modelName = getGeminiModelName();
  const prompt = `
You are Trio's custom hobby starter-plan agent. The user already wants to try "${name}".

Create one beginner-friendly starter plan for the ${category} category.
${previousPlanInstruction}

Rules:
- Keep the hobby name as "${name}".
- Keep category exactly "${category}".
- Reason should explain why starting tiny makes this hobby easier to begin.
- The first task must be concrete, safe, and doable today without expert knowledge.
- Duration should be 5 to 20 minutes.
- Frequency should be modest: daily, 2 times per week, 3 times per week, or 4 times per week.
- When regenerating, avoid returning the same first task, duration, and frequency together.
- Avoid medical, therapeutic, or high-risk claims.
`;

  if (!apiKey) {
    return {
      recommendation: fallbackRecommendation,
      source: 'fallback',
    };
  }

  const budget = await canUseAi({
    clerkUserId,
    ipFingerprint,
    feature: 'custom_hobby_plan',
    category,
    model: modelName,
    prompt,
    maxOutputTokens: CUSTOM_PLAN_MAX_OUTPUT_TOKENS,
  });
  const startedAt = Date.now();

  if (!budget.allowed) {
    await safelyRecordAiUsage({
      clerkUserId,
      ipFingerprint,
      feature: 'custom_hobby_plan',
      category,
      model: modelName,
      source: 'fallback',
      status: 'blocked',
      estimatedInputTokens: budget.estimatedInputTokens,
      maxOutputTokens: CUSTOM_PLAN_MAX_OUTPUT_TOKENS,
      startedAt,
      errorType: budget.blockedReason ?? undefined,
    });

    return {
      recommendation: fallbackRecommendation,
      source: 'fallback',
    };
  }

  try {
    const genAI = new GoogleGenerativeAI(apiKey);
    const model = genAI.getGenerativeModel({
      model: modelName,
      generationConfig: {
        temperature: 0.8,
        maxOutputTokens: CUSTOM_PLAN_MAX_OUTPUT_TOKENS,
        responseMimeType: 'application/json',
        responseSchema: {
          type: SchemaType.OBJECT,
          properties: {
            recommendation: {
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
          required: ['recommendation'],
        },
      },
    });
    const result = await model.generateContent(prompt);
    const parsed = JSON.parse(result.response.text());
    const recommendation = normalizeCustomRecommendation(parsed, category, name);

    if (recommendation) {
      await safelyRecordAiUsage({
        clerkUserId,
        ipFingerprint,
        feature: 'custom_hobby_plan',
        category,
        model: modelName,
        source: 'ai',
        status: 'success',
        estimatedInputTokens: budget.estimatedInputTokens,
        maxOutputTokens: CUSTOM_PLAN_MAX_OUTPUT_TOKENS,
        startedAt,
      });

      return {
        recommendation,
        source: 'ai',
      };
    }

    await safelyRecordAiUsage({
      clerkUserId,
      ipFingerprint,
      feature: 'custom_hobby_plan',
      category,
      model: modelName,
      source: 'fallback',
      status: 'invalid_response',
      estimatedInputTokens: budget.estimatedInputTokens,
      maxOutputTokens: CUSTOM_PLAN_MAX_OUTPUT_TOKENS,
      startedAt,
    });
  } catch (error) {
    console.error(error);
    await safelyRecordAiUsage({
      clerkUserId,
      ipFingerprint,
      feature: 'custom_hobby_plan',
      category,
      model: modelName,
      source: 'fallback',
      status: 'error',
      estimatedInputTokens: budget.estimatedInputTokens,
      maxOutputTokens: CUSTOM_PLAN_MAX_OUTPUT_TOKENS,
      startedAt,
      errorType: getErrorType(error),
    });
  }

  return {
    recommendation: fallbackRecommendation,
    source: 'fallback',
  };
}

export async function generateHobbyRecommendationsAction(
  input: DiscoveryShortAnswerInput
): Promise<HobbyRecommendationResult> {
  const clerkUserId = await requireUserId();
  const ipFingerprint = await getRequestIpFingerprint();

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
  const modelName = getGeminiModelName();
  const prompt = `
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
`;

  if (!apiKey) {
    return {
      recommendations: fallbackRecommendations,
      source: 'fallback',
    };
  }

  const budget = await canUseAi({
    clerkUserId,
    ipFingerprint,
    feature: 'hobby_recommendations',
    category,
    model: modelName,
    prompt,
    maxOutputTokens: RECOMMENDATIONS_MAX_OUTPUT_TOKENS,
  });
  const startedAt = Date.now();

  if (!budget.allowed) {
    await safelyRecordAiUsage({
      clerkUserId,
      ipFingerprint,
      feature: 'hobby_recommendations',
      category,
      model: modelName,
      source: 'fallback',
      status: 'blocked',
      estimatedInputTokens: budget.estimatedInputTokens,
      maxOutputTokens: RECOMMENDATIONS_MAX_OUTPUT_TOKENS,
      startedAt,
      errorType: budget.blockedReason ?? undefined,
    });

    return {
      recommendations: fallbackRecommendations,
      source: 'fallback',
    };
  }

  try {
    const genAI = new GoogleGenerativeAI(apiKey);
    const model = genAI.getGenerativeModel({
      model: modelName,
      generationConfig: {
        temperature: 0.7,
        maxOutputTokens: RECOMMENDATIONS_MAX_OUTPUT_TOKENS,
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
    const result = await model.generateContent(prompt);
    const parsed = JSON.parse(result.response.text());
    const recommendations = normalizeRecommendations(parsed, category);

    if (recommendations.length === 3) {
      await safelyRecordAiUsage({
        clerkUserId,
        ipFingerprint,
        feature: 'hobby_recommendations',
        category,
        model: modelName,
        source: 'ai',
        status: 'success',
        estimatedInputTokens: budget.estimatedInputTokens,
        maxOutputTokens: RECOMMENDATIONS_MAX_OUTPUT_TOKENS,
        startedAt,
      });

      return {
        recommendations,
        source: 'ai',
      };
    }

    await safelyRecordAiUsage({
      clerkUserId,
      ipFingerprint,
      feature: 'hobby_recommendations',
      category,
      model: modelName,
      source: 'fallback',
      status: 'invalid_response',
      estimatedInputTokens: budget.estimatedInputTokens,
      maxOutputTokens: RECOMMENDATIONS_MAX_OUTPUT_TOKENS,
      startedAt,
    });
  } catch (error) {
    console.error(error);
    await safelyRecordAiUsage({
      clerkUserId,
      ipFingerprint,
      feature: 'hobby_recommendations',
      category,
      model: modelName,
      source: 'fallback',
      status: 'error',
      estimatedInputTokens: budget.estimatedInputTokens,
      maxOutputTokens: RECOMMENDATIONS_MAX_OUTPUT_TOKENS,
      startedAt,
      errorType: getErrorType(error),
    });
  }

  return {
    recommendations: fallbackRecommendations,
    source: 'fallback',
  };
}
