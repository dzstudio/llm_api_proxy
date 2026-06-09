import prisma from '../models/prisma.js';

const EVALUATION_PROMPT = `你是一个 Prompt 质量评估专家。请对以下用户 Prompt 进行评分和分析。

## 评分标准（每项 1-100 分）
1. 表达清晰度：语言是否清晰、易理解、无歧义
2. 上下文完整度：是否提供了足够的上下文信息
3. 约束条件完整度：是否明确了约束条件和要求
4. 输出格式完整度：是否指定了期望的输出格式
5. 任务目标明确度：任务目标是否明确

## 用户 Prompt
{userPrompt}

请以 JSON 格式回复（只返回 JSON，不要其他内容）：
{
  "scores": {
    "clarity": 分数,
    "contextCompleteness": 分数,
    "constraintCompleteness": 分数,
    "outputFormatCompleteness": 分数,
    "taskGoalClarity": 分数
  },
  "overallScore": 总评分,
  "strengths": "优点",
  "weaknesses": "缺点",
  "suggestions": "改进建议"
}`;

interface EvaluationResult {
  scores: {
    clarity: number;
    contextCompleteness: number;
    constraintCompleteness: number;
    outputFormatCompleteness: number;
    taskGoalClarity: number;
  };
  overallScore: number;
  strengths: string;
  weaknesses: string;
  suggestions: string;
}

function parseEvaluation(raw: string): EvaluationResult | null {
  // Try to extract JSON from response
  const jsonMatch = raw.match(/\{[\s\S]*\}/);
  if (!jsonMatch) return null;

  try {
    const parsed = JSON.parse(jsonMatch[0]);
    const scores = parsed.scores || parsed;

    return {
      scores: {
        clarity: Number(scores.clarity) || 0,
        contextCompleteness: Number(scores.contextCompleteness || scores.context_completeness) || 0,
        constraintCompleteness: Number(scores.constraintCompleteness || scores.constraint_completeness) || 0,
        outputFormatCompleteness: Number(scores.outputFormatCompleteness || scores.output_format_completeness) || 0,
        taskGoalClarity: Number(scores.taskGoalClarity || scores.task_goal_clarity) || 0,
      },
      overallScore: Number(parsed.overallScore || parsed.overall_score) || 0,
      strengths: String(parsed.strengths || ''),
      weaknesses: String(parsed.weaknesses || ''),
      suggestions: String(parsed.suggestions || ''),
    };
  } catch {
    return null;
  }
}

async function callReviewModel(model: any, userPrompt: string): Promise<string> {
  const baseUrl = model.baseUrl.replace(/\/$/, '');
  const url = `${baseUrl}/v1/chat/completions`;

  const prompt = EVALUATION_PROMPT.replace('{userPrompt}', userPrompt);

  const timeoutMs = (model.timeoutSeconds || 60) * 1000;

  const response = await fetch(url, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'Authorization': `Bearer ${model.apiKey}`,
    },
    body: JSON.stringify({
      model: model.modelName,
      messages: [{ role: 'user', content: prompt }],
      max_tokens: 1000,
      temperature: 0.1,
    }),
    signal: AbortSignal.timeout(timeoutMs),
  });

  if (!response.ok) {
    throw new Error(`Review model returned HTTP ${response.status}`);
  }

  const data = (await response.json()) as any;
  return data.choices?.[0]?.message?.content || '';
}

export async function evaluateConversation(conversationId: number) {
  const conversation = await prisma.conversation.findUnique({
    where: { id: conversationId },
    include: {
      messages: {
        where: { role: 'user' },
        orderBy: { createTime: 'asc' },
      },
    },
  });

  if (!conversation) throw new Error('会话不存在');

  const userMessages = conversation.messages.filter(m => m.content && m.content.trim());
  if (userMessages.length === 0) throw new Error('该会话无用户输入内容');

  // Combine all user prompts if there are multiple
  const combinedPrompt = userMessages.map(m => m.content).join('\n\n---\n\n');
  if (!combinedPrompt.trim()) throw new Error('用户输入内容为空');

  // Find the review model
  const reviewModel = await prisma.sysModel.findFirst({
    where: { isReviewModel: 1, enabled: 1 },
  });

  if (!reviewModel) throw new Error('未配置评价模型，请先在模型管理中设置一个评价模型');

  // Call the review model
  const rawResponse = await callReviewModel(reviewModel, combinedPrompt);

  // Parse the evaluation
  const evaluation = parseEvaluation(rawResponse);
  if (!evaluation) throw new Error('评价模型返回格式无法解析');

  // Check for existing review
  const existing = await prisma.promptReview.findFirst({
    where: { conversationId },
  });

  if (existing) {
    // Update existing
    return prisma.promptReview.update({
      where: { id: existing.id },
      data: {
        reviewModelId: reviewModel.id,
        score: evaluation.overallScore,
        strengths: evaluation.strengths,
        weaknesses: evaluation.weaknesses,
        suggestions: evaluation.suggestions,
      },
    });
  }

  // Create new
  return prisma.promptReview.create({
    data: {
      conversationId,
      reviewModelId: reviewModel.id,
      score: evaluation.overallScore,
      strengths: evaluation.strengths,
      weaknesses: evaluation.weaknesses,
      suggestions: evaluation.suggestions,
    },
  });
}

export async function getReviewByConversation(conversationId: number) {
  const review = await prisma.promptReview.findFirst({
    where: { conversationId },
    include: {
      reviewModel: {
        select: { id: true, name: true, modelName: true },
      },
    },
  });

  if (!review) return null;

  return {
    id: review.id,
    conversationId: review.conversationId,
    reviewModelName: review.reviewModel?.name || '-',
    score: review.score,
    strengths: review.strengths,
    weaknesses: review.weaknesses,
    suggestions: review.suggestions,
    createTime: review.createTime,
  };
}

export async function getReviewStats() {
  const [totalReviews, aggregation] = await Promise.all([
    prisma.promptReview.count(),
    prisma.promptReview.aggregate({
      _avg: { score: true },
      _count: true,
    }),
  ]);

  // Score distribution
  const allScores = await prisma.promptReview.findMany({
    select: { score: true, conversationId: true, conversation: { select: { user: { select: { realName: true, username: true } } } } },
    orderBy: { score: 'desc' },
  });

  const excellentCount = allScores.filter(r => r.score && r.score >= 80).length;
  const goodCount = allScores.filter(r => r.score && r.score >= 60 && r.score < 80).length;
  const poorCount = allScores.filter(r => r.score && r.score < 60).length;

  return {
    totalReviews,
    avgScore: Math.round(aggregation._avg.score || 0),
    scoreDistribution: {
      excellent: excellentCount,
      good: goodCount,
      poor: poorCount,
    },
    topRated: allScores.slice(0, 5).map(r => ({
      conversationId: r.conversationId,
      username: r.conversation.user.realName || r.conversation.user.username,
      score: r.score,
    })),
  };
}

export async function listReviews(page = 1, pageSize = 20) {
  const [list, total] = await Promise.all([
    prisma.promptReview.findMany({
      include: {
        conversation: {
          select: { id: true, title: true, userId: true, user: { select: { realName: true, username: true } } },
        },
        reviewModel: {
          select: { id: true, name: true },
        },
      },
      orderBy: { createTime: 'desc' },
      skip: (page - 1) * pageSize,
      take: pageSize,
    }),
    prisma.promptReview.count(),
  ]);

  return {
    list: list.map(r => ({
      id: r.id,
      conversationId: r.conversationId,
      conversationTitle: r.conversation.title,
      username: r.conversation.user.realName || r.conversation.user.username,
      reviewModelName: r.reviewModel?.name || '-',
      score: r.score,
      strengths: r.strengths,
      weaknesses: r.weaknesses,
      suggestions: r.suggestions,
      createTime: r.createTime,
    })),
    total,
    page,
    pageSize,
  };
}
