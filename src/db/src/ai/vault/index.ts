import type { aiAgent, guest, nil, sushi, user } from "@chrryai/chrry/types"

// Return type for getModelProvider - provider is intentionally typed as unknown
// to avoid exposing internal SDK types that have private/protected members
export type ModelProviderResult = {
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  provider: any
  modelId: string
  agentName: string
  lastKey: string
  supportsTools: boolean
  canAnalyze: boolean
  isBYOK: boolean
  isBELES?: boolean
  isFree?: boolean
}

import { isE2E } from "@chrryai/chrry/utils"
import { createOpenRouter } from "@openrouter/ai-sdk-provider"
// import type { LanguageModel } from "ai"
import { decrypt, getAiAgents, getCreditsLeft } from "../../../index"

const plusTiers = ["plus", "pro"]

function isFreeTier(app: { tier: string | nil } | nil) {
  if (isE2E) return true
  return !plusTiers.includes(app?.tier || "")
}

function safeDecrypt(key: string | nil) {
  if (!key || key.includes("...")) return undefined
  try {
    return decrypt(key)
  } catch {
    return undefined
  }
}

function byokDecrypt(key: string | nil) {
  if (!key || key.includes("...")) return undefined
  try {
    return decrypt(key)
  } catch {
    if (isE2E) return undefined
    throw new Error(
      "Your API key could not be decrypted. Please re-enter it in Settings.",
    )
  }
}

export const modelCapabilities: Record<
  string,
  { tools: boolean; canAnalyze?: boolean }
> = {
  "gpt-4o": { tools: true, canAnalyze: true },
  "gpt-4o-mini": { tools: true, canAnalyze: true },
  "anthropic/claude-sonnet-4-6": { tools: true, canAnalyze: true },
  "google/gemini-3.1-pro-preview": { tools: true, canAnalyze: true },
  "deepseek/deepseek-chat": { tools: true },
  "deepseek/deepseek-v3.2-thinking": { tools: true },
  "deepseek/deepseek-v3.2-speciale": { tools: false },
  "minimax/minimax-m2.5": { tools: true },
  "deepseek/deepseek-v3.2": { tools: true },
  "grok-4-1-fast-reasoning": { tools: true, canAnalyze: true },
  "x-ai/grok-4-1-fast-reasoning": { tools: true },
  "perplexity/sonar-pro": { tools: false },
  "openai/gpt-oss-120b:free": { tools: false, canAnalyze: true },
}

const AGENT_DEFAULTS: Record<string, string> = {
  beles: "deepseek/deepseek-v3.2",
  sushi: "deepseek/deepseek-chat",
  deepSeek: "deepseek/deepseek-chat",
  peach: "deepseek/deepseek-chat",
  claude: "anthropic/claude-sonnet-4-6",
  chatGPT: "openai/gpt-5.4",
  gemini: "google/gemini-3.1-pro-preview",
  grok: "x-ai/grok-4-1-fast-reasoning",
  perplexity: "perplexity/sonar-pro",
}
const SOURCES: Record<string, string> = {
  // Free tier models (beles pool)
  m2m: "minimax/minimax-m2.7",
  // coder: "qwen/qwen3-coder-plus",
  // coder: "deepseek/deepseek-v3.2",
  coder: "deepseek/deepseek-v3.2",
  "ai/content": "deepseek/deepseek-v3.2",
  "pear/validate": "deepseek/deepseek-v3.2",
  "rag/documentSummary": "deepseek/deepseek-v3.2",
  "autonomous/bidding": "minimax/minimax-m2.7",
  "graph/cypher": "deepseek/deepseek-v3.2",
  "graph/entity": "deepseek/deepseek-v3.2",
  "graph/extract": "deepseek/deepseek-v3.2",
  "moltbook/engagement": "deepseek/deepseek-v3.2",
  "moltbook/commentFilter": "deepseek/deepseek-v3.2",
  "moltbook/comment": "deepseek/deepseek-v3.2",
  "ai/tribe/comment": "deepseek/deepseek-v3.2",
  "ai/title": "deepseek/deepseek-v3.2",
  "ai/thread/instructions": "deepseek/deepseek-v3.2",
  swarm: "minimax/minimax-m2.7",
  // Premium sources
  "ai/sushi/file": "anthropic/claude-sonnet-4-6",
  "ai/sushi/webSearch": "perplexity/sonar-pro",
  post: "minimax/minimax-m2.7",
  engagement: "deepseek/deepseek-v3.2",
  comment: "deepseek/deepseek-v3.2",
  tribe_comment: "deepseek/deepseek-v3.2", // Tribe comment checking
  tribe_engage: "deepseek/deepseek-v3.2", // Tribe engagement
  autonomous: "minimax/minimax-m2.7",
}

const JOB = {
  post: "minimax/minimax-m2.7",
  tribe_comment: "deepseek/deepseek-v3.2", // Tribe comment checking
  tribe_engage: "deepseek/deepseek-v3.2", // Tribe engagement
  autonomous: "minimax/minimax-m2.7",
}

const SCHEDULE: Record<string, string> = {
  // Free tier models (beles pool)
  swarm: "minimax/minimax-m2.7",
  // Premium sources
  "ai/sushi/file": "anthropic/claude-sonnet-4-6",
  "ai/sushi/webSearch": "perplexity/sonar-pro",
  post: "minimax/minimax-m2.7",
  engagement: "deepseek/deepseek-v3.2",
  comment: "deepseek/deepseek-v3.2",
  tribe_comment: "deepseek/deepseek-v3.2", // Tribe comment checking
  tribe_engage: "deepseek/deepseek-v3.2", // Tribe engagement
  autonomous: "minimax/minimax-m2.7",
}

// Type for job parameter - accepts any object with metadata.modelId or modelConfig.model
export type JobWithModelConfig = {
  metadata?: { modelId?: string } | null
  modelConfig?: { model?: string } | null
}

// TODO: Fix VercelAIAdapter implementation
// import { generateText, streamText } from 'ai'
// import type { AIAdapter } from '../types'

// export class VercelAIAdapter implements AIAdapter {
//   async chat(options: ChatOptions) {
//     const result = await generateText({
//       model: options.model,
//       messages: options.messages,
//       tools: options.tools,
//     })
//     return { text: result.text, usage: result.usage }
//   }
//
//   async* stream(options: StreamOptions) {
//     const result = streamText({...})
//     for await (const chunk of result.fullStream) {
//       yield chunk
//     }
//   }
// }

export async function getModelProvider({
  app,
  canReason = true,
  swarm,
  user,
  guest,
  job,
  source,
  ...rest
}: {
  app?: sushi | nil
  source?: string | nil
  name?: string | nil
  modelId?: string | nil
  canReason?: boolean | nil
  job?: JobWithModelConfig | nil
  user?: user | nil
  guest?: guest | nil
  swarm?: { modelId?: string; postType?: string } | nil
}): Promise<ModelProviderResult> {
  const agents = (await getAiAgents({ include: app?.id })) as aiAgent[]
  const foundAgent = rest.name
    ? agents.find((a) => a.name.toLowerCase() === rest.name?.toLowerCase())
    : undefined
  const agent =
    foundAgent ??
    agents.find((a) => a.name.toLowerCase() === "free") ??
    agents[0]!

  // Resolve agent name
  const sushiSources = ["sushi", "m2m"]
  const belesSources = [
    "sushi",
    "m2m",
    "pear/validate",
    "ai/content",
    "rag/documentSummary",
    "autonomous/bidding",
    "graph/cypher",
  ]
  const claudeSources = ["codebase", "ai/sushi/file"]
  const deepSeekSources = ["deepSeek", "deepSeekChat"]
  const name =
    foundAgent?.name ??
    (source
      ? SOURCES[source]
        ? source
        : (rest.name ?? "sushi")
      : (rest.name ?? "deepSeek"))
  const resolvedName =
    (foundAgent?.name ?? rest.name ?? "deepSeek") === "peach"
      ? "deepSeek"
      : (foundAgent?.name ?? rest.name ?? "")

  const modelId =
    swarm?.modelId ??
    job?.metadata?.modelId ??
    job?.modelConfig?.model ??
    SOURCES[swarm?.postType || ""] ??
    rest.modelId ??
    SOURCES[source || ""] ??
    (resolvedName === "sushi"
      ? !job
        ? "deepseek/deepseek-r1"
        : "deepseek/deepseek-v3.2"
      : (AGENT_DEFAULTS[resolvedName || ""] ?? "deepseek/deepseek-v3.2"))

  // Resolve OR key: BYOK > app key > system env (free tier only)
  const accountKey = user?.apiKeys?.openrouter ?? guest?.apiKeys?.openrouter
  const isBYOK = !!accountKey
  const byokKey = accountKey ? byokDecrypt(accountKey) : undefined

  const systemKey = isFreeTier(app) ? process.env.OPENROUTER_API_KEY : undefined
  const appKey = safeDecrypt(app?.apiKeys?.openrouter)
  const orKey = byokKey ?? appKey ?? systemKey

  // Check credits
  const creditsLeft = await getCreditsLeft({
    userId: user?.id,
    guestId: guest?.id,
  })

  const failedKeys = (isBYOK ? [] : agent?.metadata?.failed) as
    | string[]
    | undefined

  const fallback = () => ({
    provider: createOpenRouter({ apiKey: process.env.OPENROUTER_API_KEY! })(
      "openrouter/free",
    ),
    modelId: "openrouter/free",
    agentName: agent.name,
    lastKey: "openrouter",
    isFree: true,
    supportsTools: false,
    canAnalyze: false,
    isBYOK: !!byokKey,
  })

  console.log(`🚀 ~ getModelProvider ~ modelId:`, modelId)
  throw new Error("Out of credits")
  if (
    (isBYOK && !byokKey) ||
    creditsLeft === 0 ||
    !orKey ||
    failedKeys?.includes(modelId)
  ) {
    return fallback()
  }

  const caps = modelCapabilities[modelId]

  const models = [modelId, ...["minimax/minimax-m2.5"]]

  return {
    provider: createOpenRouter({ apiKey: orKey })(modelId, {
      models,
    }),
    modelId,
    agentName: agent.name,
    lastKey: "openrouter",
    supportsTools: modelCapabilities[modelId]?.tools ?? false,
    canAnalyze: modelCapabilities[modelId]?.canAnalyze ?? false,
    isBYOK: !!byokKey,
    isBELES: resolvedName === "beles",
  }
}

export async function getEmbeddingProvider({
  app,
  user,
  guest,
}: {
  app?: sushi
  user?: user
  guest?: guest
}) {
  const accountKey = user?.apiKeys?.openrouter ?? guest?.apiKeys?.openrouter
  const isBYOK = !!accountKey
  const byokKey = accountKey ? byokDecrypt(accountKey) : undefined

  if ((user?.creditsLeft ?? guest?.creditsLeft ?? 1) === 0 && !isBYOK) {
    throw new Error("Out of credits")
  }

  const systemKey = isFreeTier(app) ? process.env.OPENROUTER_API_KEY : undefined
  const orKey = byokKey ?? safeDecrypt(app?.apiKeys?.openrouter) ?? systemKey

  if (!orKey) throw new Error("OpenRouter API key required for embeddings")

  return {
    provider: createOpenRouter({ apiKey: orKey }),
    modelId: "openai/text-embedding-3-small",
  }
}
