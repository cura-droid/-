import 'dotenv/config';
import express from 'express';
import type { Request, Response } from 'express';
import path from 'path';
import { fileURLToPath } from 'url';
import { GoogleGenAI, ThinkingLevel } from '@google/genai';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const PORT = Number(process.env.PORT) || 3000;
const VALID_STAGES = ['문제 발견', '원인 분석', '해결안 탐색', '검토'] as const;
type Stage = (typeof VALID_STAGES)[number];

const STAGE_INSTRUCTIONS: Record<Stage, string> = {
  '문제 발견':
    '현재 단계는 [문제 발견]입니다. 학생이 캠퍼스 일상에서 구체적인 불편이나 문제를 스스로 포착하고 대상을 좁히도록 질문으로 이끌어 주세요. 문제를 대신 정의해 주지 마세요.',
  '원인 분석':
    '현재 단계는 [원인 분석]입니다. 학생이 발견한 문제의 표면적 현상 너머에 있는 구조적·환경적·행동적 원인을 스스로 파고들도록 탐구 질문을 던져 주세요. 원인을 대신 정리해 주지 마세요.',
  '해결안 탐색':
    '현재 단계는 [해결안 탐색]입니다. 학생이 현실적이고 실행 가능한 캠퍼스 해결 아이디어를 스스로 떠올리고 비교할 수 있도록 힌트와 질문을 주세요. 해결안을 대신 작성해 주지 마세요.',
  '검토':
    '현재 단계는 [검토]입니다. 학생이 자신이 세운 해결안의 실현 가능성, 부작용, 이해관계자(학생·교직원·학교) 관점을 스스로 점검하도록 날카롭지만 따뜻한 질문을 던져 주세요. 검토 보고서를 대신 써 주지 마세요.',
};

interface ChatHistoryItem {
  stage: string;
  question: string;
  aiReply: string;
}

function getAiClient(): GoogleGenAI | null {
  const apiKey = process.env.GEMINI_API_KEY?.trim();
  if (!apiKey || apiKey === 'MY_GEMINI_API_KEY') {
    return null;
  }
  return new GoogleGenAI({
    apiKey,
    httpOptions: {
      headers: {
        'User-Agent': 'aistudio-build',
      },
    },
  });
}

async function startServer() {
  const app = express();
  app.use(express.json({ limit: '1mb' }));

  app.post('/api/chat', async (req: Request, res: Response) => {
    try {
      const body = req.body as {
        studentCode?: unknown;
        stage?: unknown;
        question?: unknown;
        history?: unknown;
      };

      const studentCode = typeof body.studentCode === 'string' ? body.studentCode.trim() : '';
      const stage = typeof body.stage === 'string' ? body.stage.trim() : '';
      const question = typeof body.question === 'string' ? body.question.trim() : '';

      if (!studentCode || studentCode.length > 20) {
        res.status(400).json({ error: '유효한 학생 코드(1~20자)를 입력해 주세요.' });
        return;
      }
      if (!VALID_STAGES.includes(stage as Stage)) {
        res.status(400).json({ error: '올바른 문제해결 단계가 아닙니다.' });
        return;
      }
      if (!question || question.length > 2000) {
        res.status(400).json({ error: '질문은 1자 이상 2,000자 이하로 입력해 주세요.' });
        return;
      }

      const ai = getAiClient();
      if (!ai) {
        res.status(503).json({
          error: 'Gemini API 키가 설정되지 않았습니다. Settings > Secrets에서 GEMINI_API_KEY를 확인해 주세요.',
        });
        return;
      }

      const rawHistory = Array.isArray(body.history) ? body.history : [];
      const safeHistory: ChatHistoryItem[] = rawHistory
        .slice(-6)
        .filter(
          (item): item is ChatHistoryItem =>
            typeof item === 'object' &&
            item !== null &&
            typeof (item as ChatHistoryItem).question === 'string' &&
            typeof (item as ChatHistoryItem).aiReply === 'string'
        )
        .map((item) => ({
          stage: typeof item.stage === 'string' ? item.stage.slice(0, 20) : '',
          question: item.question.slice(0, 600),
          aiReply: item.aiReply.slice(0, 600),
        }));

      const historyContext =
        safeHistory.length > 0
          ? safeHistory
              .map(
                (h, idx) =>
                  `[이전 대화 ${idx + 1} (${h.stage})]\n학생: ${h.question}\n코치: ${h.aiReply}`
              )
              .join('\n\n')
          : '이전 대화 없음';

      const systemInstruction = [
        '당신은 대학생이 "우리 캠퍼스의 문제 찾기" 과제를 스스로 해내도록 돕는 소크라테스식 학습 코치입니다.',
        STAGE_INSTRUCTIONS[stage as Stage],
        '',
        '[필수 응답 규칙]',
        '1. 반드시 한국어로 답하세요.',
        '2. 답변 길이는 반드시 다섯 문장(5문장) 이내로 작성하세요.',
        '3. 과제 문장, 문제 정의, 원인 정리, 해결안, 성찰문을 대신 써 주지 마세요.',
        '4. 학생의 생각을 확장하거나 구체화할 수 있는 질문이나 관점 힌트를 제시해 학생이 스스로 생각하도록 도우세요.',
        '5. 불필요한 마크다운 기호(#, **, 목록 기호 등) 없이 자연스럽고 읽기 쉬운 평문 문장으로 답하세요.',
      ].join('\n');

      const prompt = [
        `학생 코드: ${studentCode}`,
        `현재 단계: ${stage}`,
        '',
        '[최근 대화 맥락]',
        historyContext,
        '',
        '[학생의 현재 질문]',
        question,
      ].join('\n');

      const response = await ai.models.generateContent({
        model: 'gemini-4-hydrogen',
        contents: prompt,
        config: {
          systemInstruction,
          thinkingConfig: {
            thinkingLevel: ThinkingLevel.LOW,
          },
        },
      });

      const replyText = (response.text ?? '').trim();
      if (!replyText) {
        res.status(502).json({ error: 'AI 응답이 비어 있습니다. 잠시 후 다시 시도해 주세요.' });
        return;
      }

      res.json({ reply: replyText });
    } catch (error) {
      const apiStatus =
        typeof error === 'object' && error !== null && 'status' in error
          ? Number((error as { status?: unknown }).status)
          : 500;
      const message = error instanceof Error ? error.message : '알 수 없는 오류가 발생했습니다.';
      console.error('Gemini API error:', { status: apiStatus, message });

      if (
        apiStatus === 401 ||
        apiStatus === 403 ||
        message.includes('PERMISSION_DENIED') ||
        message.includes('API_KEY_INVALID')
      ) {
        res.status(401).json({
          error: 'Gemini API 키 인증에 실패했습니다. Settings > Secrets의 GEMINI_API_KEY를 확인해 주세요.',
        });
        return;
      }
      if (apiStatus === 429 || message.includes('RESOURCE_EXHAUSTED')) {
        res.status(429).json({
          error: '요청 한도를 초과했습니다. 잠시 후 다시 시도해 주세요.',
        });
        return;
      }
      if (apiStatus === 404 || message.includes('NOT_FOUND')) {
        res.status(404).json({
          error: '요청한 Gemini 모델을 찾을 수 없습니다.',
        });
        return;
      }
      res.status(500).json({
        error: `AI 답변을 생성하는 중 문제가 발생했습니다 (${apiStatus}). 잠시 후 다시 시도해 주세요.`,
      });
    }
  });

  if (process.env.NODE_ENV !== 'production') {
    const { createServer } = await import('vite');
    const vite = await createServer({
      server: { middlewareMode: true },
      appType: 'spa',
    });
    app.use(vite.middlewares);
  } else {
    const distDir = path.resolve(__dirname, 'dist');
    app.use(express.static(distDir));
    app.get('/{*splat}', (_req: Request, res: Response) => {
      res.sendFile(path.join(distDir, 'index.html'));
    });
  }

  app.listen(PORT, '0.0.0.0', () => {
    console.log(`Server running on http://0.0.0.0:${PORT}`);
  });
}

startServer().catch((err) => {
  console.error('Failed to start server:', err);
  process.exit(1);
});
