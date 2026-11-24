export type ProblemStage = '문제 발견' | '원인 분석' | '해결안 탐색' | '검토';

export type SessionStage = ProblemStage | '최종 제출' | '제출 완료';

export interface StageGuide {
  id: ProblemStage;
  stepNumber: number;
  title: string;
  subtitle: string;
  guidingQuestions: string[];
  starterPrompts: string[];
}

export const PROBLEM_STAGES: StageGuide[] = [
  {
    id: '문제 발견',
    stepNumber: 1,
    title: '문제 발견',
    subtitle: '캠퍼스에서 반복되는 불편이나 개선이 필요한 상황을 구체적으로 포착합니다.',
    guidingQuestions: [
      '최근 캠퍼스(강의실, 도서관, 식당, 이동 동선 등)에서 겪은 가장 큰 불편은 무엇인가요?',
      '그 문제는 주로 언제, 어느 공간에서, 누구에게 발생하나요?',
    ],
    starterPrompts: [
      '캠퍼스에서 매일 겪는 작은 불편을 문제로 정리하려면 어떤 점을 먼저 봐야 할까요?',
      '내가 떠올린 불편이 다른 학생들에게도 공통된 문제인지 어떻게 확인할 수 있을까요?',
    ],
  },
  {
    id: '원인 분석',
    stepNumber: 2,
    title: '원인 분석',
    subtitle: '문제의 겉모습이 아니라 왜 계속 반복되는지 근본 원인을 따져 봅니다.',
    guidingQuestions: [
      '이 문제가 생기는 직접적인 이유와 숨은 구조적 원인은 무엇일까요?',
      '지금까지 해결되지 않은 이유나 이해관계자 간의 제약은 무엇인가요?',
    ],
    starterPrompts: [
      '이 문제의 겉으로 드러난 현상과 진짜 원인을 어떻게 구분할 수 있을까요?',
      '학생 개인의 습관 문제인지 학교 시스템의 문제인지 어떤 기준으로 살펴볼까요?',
    ],
  },
  {
    id: '해결안 탐색',
    stepNumber: 3,
    title: '해결안 탐색',
    subtitle: '원인을 겨냥한 현실적이고 실행 가능한 대안을 여러 각도에서 모색합니다.',
    guidingQuestions: [
      '앞에서 찾은 핵심 원인 중 가장 먼저 건드릴 수 있는 지점은 어디인가요?',
      '예산이나 규정을 고려할 때 이번 학기에 시도해 볼 수 있는 방법은 무엇일까요?',
    ],
    starterPrompts: [
      '아이디어가 너무 막연한데, 캠퍼스에 실제로 적용할 수 있게 좁히려면 무엇을 물어야 할까요?',
      '큰 비용을 들이지 않고 시범적으로 해볼 수 있는 대안의 방향을 생각해 보고 싶어요.',
    ],
  },
  {
    id: '검토',
    stepNumber: 4,
    title: '검토',
    subtitle: '내가 세운 해결안의 한계, 예상 부작용, 실행 조건을 비판적으로 점검합니다.',
    guidingQuestions: [
      '이 해결안을 실행했을 때 오히려 불편해지거나 소외되는 사람은 없을까요?',
      '학교 부서나 학생회가 실제로 움직이게 하려면 어떤 근거가 필요할까요?',
    ],
    starterPrompts: [
      '내 해결안에서 가장 약한 부분이나 현실적인 걸림돌은 무엇인지 스스로 점검하고 싶어요.',
      '이 해결안이 일회성으로 끝나지 않고 유지되려면 어떤 조건이 필요할까요?',
    ],
  },
];

export interface ChatLog {
  id: string;
  studentCode: string;
  stage: ProblemStage;
  sequence: number;
  question: string;
  aiReplySummary: string;
  aiReplyFull: string;
  createdAt: Date | null;
}

export interface Submission {
  id: string;
  studentCode: string;
  foundProblem: string;
  solution: string;
  reflection: string;
  submittedAt: Date | null;
}

export interface StudentSession {
  studentCode: string;
  currentStage: SessionStage;
  updatedAt: Date | null;
}
