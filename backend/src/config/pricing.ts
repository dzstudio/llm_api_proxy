// Model pricing per 1M tokens (CNY), cache-miss pricing
// Sources:
//   DeepSeek: https://api-docs.deepseek.com/zh-cn/quick_start/pricing/
//   MiMo:     https://platform.xiaomimimo.com/docs/zh-CN/price/pay-as-you-go

interface ModelPricing {
  inputPrice: number;   // ¥ per 1M input tokens
  outputPrice: number;  // ¥ per 1M output tokens
}

const MODEL_PRICING: Record<string, ModelPricing> = {
  'deepseek-v4-flash':        { inputPrice: 1.00, outputPrice: 2.00 },
  'deepseek-v4-pro':          { inputPrice: 3.00, outputPrice: 6.00 },
  'mimo-v2.5-pro-ultraspeed': { inputPrice: 9.00, outputPrice: 18.00 },
  'mimo-v2.5-pro':            { inputPrice: 3.00, outputPrice: 6.00 },
  'mimo-v2.5':                { inputPrice: 1.00, outputPrice: 2.00 },
};

/**
 * Calculate estimated cost for a model given prompt and completion token counts.
 * Returns cost in CNY, rounded to 2 decimal places.
 * Returns 0 for unknown models (no error thrown).
 */
export function calculateCost(
  modelName: string,
  promptTokens: number,
  completionTokens: number,
): number {
  const pricing = MODEL_PRICING[modelName];
  if (!pricing) return 0;

  const inputCost = (promptTokens / 1_000_000) * pricing.inputPrice;
  const outputCost = (completionTokens / 1_000_000) * pricing.outputPrice;
  return Math.round((inputCost + outputCost) * 100) / 100;
}
