import { useEffect, useRef, useState, type FormEvent, type KeyboardEvent } from 'react';
import { ArrowRight, Check, Send, RotateCcw } from 'lucide-react';
import {
  PROBLEM_STAGES,
  type ChatLog,
  type ProblemStage,
  type SessionStage,
  type Submission,
} from '../types';
import { formatKoreanDateTime } from '../utils/csv';

interface StudentWorkspaceProps {
  studentCode: string;
  currentStage: SessionStage;
  chatLogs: ChatLog[];
  submission: Submission | null;
  onChangeStage: (nextStage: SessionStage) => Promise<void>;
  onSendQuestion: (stage: ProblemStage, question: string) => Promise<void>;
  onSubmitAssignment: (data: {
    foundProblem: string;
    solution: string;
    reflection: string;
  }) => Promise<void>;
  onChangeStudentCode: () => void;
}

const STAGE_ORDER: SessionStage[] = ['문제 발견', '원인 분석', '해결안 탐색', '검토', '최종 제출'];

export function StudentWorkspace({
  studentCode,
  currentStage,
  chatLogs,
  submission,
  onChangeStage,
  onSendQuestion,
  onSubmitAssignment,
  onChangeStudentCode,
}: StudentWorkspaceProps) {
  const [questionInput, setQuestionInput] = useState('');
  const [isSending, setIsSending] = useState(false);
  const [chatError, setChatError] = useState<string | null>(null);
  const [pendingQuestion, setPendingQuestion] = useState<string | null>(null);

  const [foundProblem, setFoundProblem] = useState(submission?.foundProblem ?? '');
  const [solution, setSolution] = useState(submission?.solution ?? '');
  const [reflection, setReflection] = useState(submission?.reflection ?? '');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [submitError, setSubmitError] = useState<string | null>(null);
  const [submitSuccess, setSubmitSuccess] = useState(false);

  const memoStorageKey = `campus_memo_${studentCode}`;
  const [memo, setMemo] = useState<string>(() => {
    try {
      return localStorage.getItem(memoStorageKey) ?? '';
    } catch {
      return '';
    }
  });

  const chatEndRef = useRef<HTMLDivElement | null>(null);

  useEffect(() => {
    if (submission) {
      setFoundProblem(submission.foundProblem);
      setSolution(submission.solution);
      setReflection(submission.reflection);
    }
  }, [submission]);

  useEffect(() => {
    try {
      localStorage.setItem(memoStorageKey, memo);
    } catch {
      // Ignore storage quota errors
    }
  }, [memo, memoStorageKey]);

  useEffect(() => {
    chatEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [chatLogs.length, pendingQuestion]);

  const isSubmissionView = currentStage === '최종 제출' || currentStage === '제출 완료';
  const activeStageIndex = isSubmissionView
    ? 4
    : Math.max(0, PROBLEM_STAGES.findIndex((s) => s.id === currentStage));
  const activeGuide = PROBLEM_STAGES[Math.min(activeStageIndex, PROBLEM_STAGES.length - 1)];

  const handleNextStage = async () => {
    if (currentStage === '문제 발견') await onChangeStage('원인 분석');
    else if (currentStage === '원인 분석') await onChangeStage('해결안 탐색');
    else if (currentStage === '해결안 탐색') await onChangeStage('검토');
    else if (currentStage === '검토') await onChangeStage('최종 제출');
  };

  const getNextButtonLabel = (): string => {
    if (currentStage === '검토') return '다음 단계 (최종 제출)';
    return '다음 단계';
  };

  const handleAskSubmit = async (e?: FormEvent) => {
    e?.preventDefault();
    if (isSubmissionView) return;
    const trimmed = questionInput.trim();
    if (!trimmed || isSending) return;

    setChatError(null);
    setIsSending(true);
    setPendingQuestion(trimmed);
    setQuestionInput('');

    try {
      await onSendQuestion(activeGuide.id, trimmed);
    } catch (err) {
      setQuestionInput(trimmed);
      setChatError(err instanceof Error ? err.message : '질문을 전송하지 못했습니다.');
    } finally {
      setPendingQuestion(null);
      setIsSending(false);
    }
  };

  const handleTextareaKeyDown = (e: KeyboardEvent<HTMLTextAreaElement>) => {
    if (e.key === 'Enter' && !e.shiftKey && !e.nativeEvent.isComposing) {
      e.preventDefault();
      void handleAskSubmit();
    }
  };

  const handleFinalSubmit = async (e: FormEvent) => {
    e.preventDefault();
    const cleanProblem = foundProblem.trim();
    const cleanSolution = solution.trim();
    const cleanReflection = reflection.trim();

    if (!cleanProblem || !cleanSolution || !cleanReflection) {
      setSubmitError('찾은 문제, 해결안, 성찰 한 줄을 모두 작성해 주세요.');
      return;
    }

    setSubmitError(null);
    setSubmitSuccess(false);
    setIsSubmitting(true);
    try {
      await onSubmitAssignment({
        foundProblem: cleanProblem,
        solution: cleanSolution,
        reflection: cleanReflection,
      });
      setSubmitSuccess(true);
    } catch (err) {
      setSubmitError(err instanceof Error ? err.message : '제출 중 오류가 발생했습니다.');
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <main className="max-w-6xl mx-auto px-4 sm:px-6 py-5 sm:py-7 space-y-6">
      {/* Stage Progress Bar */}
      <section
        aria-label="문제해결 진행 단계"
        className="bg-white border border-slate-200 rounded-xl p-4 sm:p-5 space-y-4"
      >
        <div className="flex flex-wrap items-center justify-between gap-3">
          <div className="flex flex-wrap items-center gap-x-2.5 gap-y-1 text-sm">
            <span className="font-mono font-semibold text-slate-900 tabular-nums">
              학생 코드 {studentCode}
            </span>
            <span className="text-slate-300" aria-hidden="true">
              /
            </span>
            <span className="text-slate-600">
              지금 단계:{' '}
              <strong className="font-semibold text-blue-700">
                {currentStage === '제출 완료'
                  ? '최종 제출 완료'
                  : isSubmissionView
                    ? '최종 제출'
                    : `${activeGuide.stepNumber}단계 · ${activeGuide.title}`}
              </strong>
            </span>
            <button
              type="button"
              onClick={onChangeStudentCode}
              className="ml-1 inline-flex items-center gap-1 text-xs text-slate-500 hover:text-slate-900 underline underline-offset-4 whitespace-nowrap"
            >
              <RotateCcw className="w-3 h-3" aria-hidden="true" />
              <span>코드 바꾸기</span>
            </button>
          </div>

          {!isSubmissionView && (
            <button
              type="button"
              onClick={() => void handleNextStage()}
              className="min-h-[40px] px-4 py-2 inline-flex items-center gap-2 text-sm font-semibold text-white bg-blue-700 rounded-lg hover:bg-blue-800 transition-colors whitespace-nowrap shrink-0"
            >
              <span>{getNextButtonLabel()}</span>
              <ArrowRight className="w-4 h-4 shrink-0" aria-hidden="true" />
            </button>
          )}
        </div>

        {/* Interactive Stepper */}
        <nav className="flex items-center gap-1.5 overflow-x-auto pb-1" aria-label="단계 이동">
          {STAGE_ORDER.map((stageName, idx) => {
            const isCurrent =
              (stageName === '최종 제출' && isSubmissionView) || stageName === currentStage;
            const isCompleted = idx < activeStageIndex || currentStage === '제출 완료';
            return (
              <button
                key={stageName}
                type="button"
                onClick={() => void onChangeStage(stageName)}
                className={`min-h-[40px] px-3 py-1.5 rounded-lg text-xs sm:text-sm font-medium transition-colors whitespace-nowrap shrink-0 flex items-center gap-1.5 ${
                  isCurrent
                    ? 'bg-slate-900 text-white'
                    : isCompleted
                      ? 'bg-slate-100 text-slate-800 hover:bg-slate-200'
                      : 'bg-white text-slate-500 border border-slate-200 hover:text-slate-800'
                }`}
              >
                <span className="font-mono text-xs tabular-nums">
                  {isCompleted && !isCurrent ? (
                    <Check className="w-3.5 h-3.5 inline" aria-hidden="true" />
                  ) : (
                    `0${idx + 1}`
                  )}
                </span>
                <span>{stageName}</span>
              </button>
            );
          })}
        </nav>
      </section>

      {/* Main Content: Stage 1~4 Chat Workspace OR Final Submission */}
      {!isSubmissionView ? (
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-start">
          {/* Left Zone: Current Stage Guide & Scratchpad */}
          <aside className="lg:col-span-5 space-y-5">
            <div className="bg-white border border-slate-200 rounded-xl p-5 sm:p-6 space-y-5">
              <div className="space-y-1.5">
                <p className="text-xs font-mono text-blue-700 tabular-nums">
                  STEP 0{activeGuide.stepNumber} / 04
                </p>
                <h2 className="text-xl font-bold text-slate-900">{activeGuide.title}</h2>
                <p className="text-sm text-slate-600 leading-relaxed">{activeGuide.subtitle}</p>
              </div>

              <div className="border-t border-slate-100 pt-4 space-y-2.5">
                <h3 className="text-xs font-semibold text-slate-700">스스로 생각해 볼 질문</h3>
                <ul className="space-y-2 text-sm text-slate-700 leading-relaxed">
                  {activeGuide.guidingQuestions.map((q, idx) => (
                    <li key={idx} className="flex items-start gap-2">
                      <span className="font-mono text-xs text-slate-400 mt-1 tabular-nums">
                        {idx + 1}.
                      </span>
                      <span>{q}</span>
                    </li>
                  ))}
                </ul>
              </div>

              <div className="border-t border-slate-100 pt-4 space-y-2">
                <h3 className="text-xs font-semibold text-slate-700">AI에게 이렇게 물어보세요</h3>
                <div className="space-y-2">
                  {activeGuide.starterPrompts.map((promptText, idx) => (
                    <button
                      key={idx}
                      type="button"
                      onClick={() => setQuestionInput(promptText)}
                      className="w-full text-left text-xs sm:text-sm text-slate-700 bg-slate-50 hover:bg-slate-100 border border-slate-200 rounded-lg px-3.5 py-2.5 transition-colors leading-relaxed"
                    >
                      “{promptText}”
                    </button>
                  ))}
                </div>
              </div>

              <div className="border-t border-slate-100 pt-4 space-y-2">
                <label htmlFor="stage-memo" className="block text-xs font-semibold text-slate-700">
                  내 생각 메모 (최종 제출할 때 참고할 수 있어요)
                </label>
                <textarea
                  id="stage-memo"
                  rows={3}
                  value={memo}
                  onChange={(e) => setMemo(e.target.value)}
                  placeholder="대화하면서 떠오른 핵심 문제나 아이디어를 간단히 적어 두세요."
                  className="w-full px-3 py-2 text-sm bg-slate-50 border border-slate-200 rounded-lg text-slate-900 placeholder:text-slate-400 focus:outline-none focus:ring-2 focus:ring-blue-600 focus:bg-white"
                />
              </div>

              <div className="pt-1 flex justify-end lg:hidden">
                <button
                  type="button"
                  onClick={() => void handleNextStage()}
                  className="w-full min-h-[44px] px-4 py-2.5 inline-flex items-center justify-center gap-2 text-sm font-semibold text-white bg-blue-700 rounded-lg hover:bg-blue-800 transition-colors"
                >
                  <span>{getNextButtonLabel()}</span>
                  <ArrowRight className="w-4 h-4" aria-hidden="true" />
                </button>
              </div>
            </div>
          </aside>

          {/* Right Zone: Gemini Socratic Chat */}
          <section
            aria-label="AI 코치 대화창"
            className="lg:col-span-7 bg-white border border-slate-200 rounded-xl flex flex-col h-[560px] sm:h-[620px]"
          >
            <div className="px-5 py-3.5 border-b border-slate-200 flex items-center justify-between gap-4">
              <div>
                <h2 className="text-sm font-semibold text-slate-900">AI 탐구 코치 대화창</h2>
                <p className="text-xs text-slate-500">
                  AI는 답을 대신 써 주지 않고 5문장 이내로 생각할 방향을 안내합니다.
                </p>
              </div>
              <span className="text-xs font-mono text-slate-500 tabular-nums whitespace-nowrap">
                질문 {chatLogs.length}건
              </span>
            </div>

            <div className="flex-1 overflow-y-auto px-4 sm:px-5 py-4 space-y-5 bg-slate-50/50">
              {chatLogs.length === 0 && !pendingQuestion && (
                <div className="h-full flex flex-col items-center justify-center text-center px-4 py-10 space-y-2">
                  <p className="text-sm font-medium text-slate-800">
                    아직 나눈 대화가 없습니다.
                  </p>
                  <p className="text-xs sm:text-sm text-slate-500 max-w-md leading-relaxed">
                    현재 단계({activeGuide.title})에서 떠오른 생각이나 막히는 부분을 아래 입력창에 적어 AI에게 질문해 보세요.
                  </p>
                </div>
              )}

              {chatLogs.map((log) => (
                <div key={log.id} className="space-y-2.5">
                  <div className="flex items-center justify-center gap-2 text-xs text-slate-400 font-mono tabular-nums">
                    <span>{log.stage}</span>
                    <span aria-hidden="true">·</span>
                    <span>순번 {log.sequence}</span>
                    <span aria-hidden="true">·</span>
                    <span>{formatKoreanDateTime(log.createdAt)}</span>
                  </div>

                  {/* Student Question */}
                  <div className="flex justify-end">
                    <div className="max-w-[85%] bg-slate-900 text-white rounded-xl rounded-tr-xs px-4 py-3 text-sm leading-relaxed whitespace-pre-wrap">
                      {log.question}
                    </div>
                  </div>

                  {/* AI Reply */}
                  <div className="flex justify-start">
                    <div className="max-w-[88%] bg-white border border-slate-200 text-slate-800 rounded-xl rounded-tl-xs px-4 py-3 text-sm leading-relaxed whitespace-pre-wrap">
                      {log.aiReplyFull}
                    </div>
                  </div>
                </div>
              ))}

              {pendingQuestion && (
                <div className="space-y-2.5">
                  <div className="flex justify-end">
                    <div className="max-w-[85%] bg-slate-900 text-white rounded-xl rounded-tr-xs px-4 py-3 text-sm leading-relaxed whitespace-pre-wrap">
                      {pendingQuestion}
                    </div>
                  </div>
                  <div className="flex justify-start">
                    <div className="bg-white border border-slate-200 text-slate-500 rounded-xl rounded-tl-xs px-4 py-3 text-sm">
                      질문을 읽고 생각할 거리를 정리하는 중입니다...
                    </div>
                  </div>
                </div>
              )}

              <div ref={chatEndRef} />
            </div>

            {chatError && (
              <div
                role="alert"
                className="mx-4 mt-3 text-xs sm:text-sm text-red-700 bg-red-50 border border-red-200 rounded-lg px-3.5 py-2"
              >
                {chatError}
              </div>
            )}

            <form
              onSubmit={handleAskSubmit}
              className="p-3 sm:p-4 border-t border-slate-200 bg-white rounded-b-xl flex flex-col sm:flex-row gap-2.5"
            >
              <textarea
                rows={2}
                value={questionInput}
                onChange={(e) => setQuestionInput(e.target.value)}
                onKeyDown={handleTextareaKeyDown}
                placeholder={`${activeGuide.title} 단계에 대한 질문이나 생각을 입력하세요...`}
                maxLength={2000}
                disabled={isSending}
                className="flex-1 px-3.5 py-2.5 text-sm bg-slate-50 border border-slate-300 rounded-lg text-slate-900 placeholder:text-slate-400 focus:outline-none focus:ring-2 focus:ring-blue-600 focus:bg-white resize-none disabled:opacity-60"
              />
              <button
                type="submit"
                disabled={isSending || !questionInput.trim()}
                className="min-h-[44px] px-4 py-2.5 inline-flex items-center justify-center gap-2 text-sm font-semibold text-white bg-blue-700 rounded-lg hover:bg-blue-800 disabled:opacity-50 disabled:cursor-not-allowed transition-colors whitespace-nowrap shrink-0"
              >
                <span>{isSending ? '답변 생성 중' : '질문 보내기'}</span>
                <Send className="w-4 h-4 shrink-0" aria-hidden="true" />
              </button>
            </form>
          </section>
        </div>
      ) : (
        /* Final Submission View */
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-start">
          <section className="lg:col-span-7 bg-white border border-slate-200 rounded-xl p-5 sm:p-8 space-y-6">
            <div className="space-y-1.5">
              <p className="text-xs font-mono text-blue-700">FINAL SUBMISSION</p>
              <h2 className="text-xl sm:text-2xl font-bold text-slate-900">
                탐구 결과 최종 제출
              </h2>
              <p className="text-sm text-slate-600">
                4단계 탐구를 바탕으로 내가 정리한 캠퍼스의 문제, 해결안, 성찰 한 줄을 작성해 제출하세요.
              </p>
            </div>

            {submission && (
              <div className="bg-emerald-50 border border-emerald-200 rounded-lg px-4 py-3 text-sm text-emerald-900 flex items-center justify-between gap-3">
                <span className="font-medium">
                  제출이 저장되었습니다.
                </span>
                <span className="text-xs font-mono text-emerald-700 tabular-nums">
                  {formatKoreanDateTime(submission.submittedAt)}
                </span>
              </div>
            )}

            <form onSubmit={handleFinalSubmit} className="space-y-5">
              <div className="space-y-2">
                <label htmlFor="found-problem" className="block text-sm font-semibold text-slate-800">
                  1. 찾은 문제
                </label>
                <textarea
                  id="found-problem"
                  rows={4}
                  value={foundProblem}
                  onChange={(e) => setFoundProblem(e.target.value)}
                  maxLength={3000}
                  placeholder="우리 캠퍼스에서 발견한 문제와 핵심 원인을 구체적으로 적어 주세요."
                  className="w-full px-3.5 py-2.5 text-sm bg-white border border-slate-300 rounded-lg text-slate-900 placeholder:text-slate-400 focus:outline-none focus:ring-2 focus:ring-blue-600 focus:border-blue-600"
                />
              </div>

              <div className="space-y-2">
                <label htmlFor="solution-text" className="block text-sm font-semibold text-slate-800">
                  2. 해결안
                </label>
                <textarea
                  id="solution-text"
                  rows={4}
                  value={solution}
                  onChange={(e) => setSolution(e.target.value)}
                  maxLength={3000}
                  placeholder="검토 단계를 거쳐 다듬은 실행 가능한 해결안을 적어 주세요."
                  className="w-full px-3.5 py-2.5 text-sm bg-white border border-slate-300 rounded-lg text-slate-900 placeholder:text-slate-400 focus:outline-none focus:ring-2 focus:ring-blue-600 focus:border-blue-600"
                />
              </div>

              <div className="space-y-2">
                <label htmlFor="reflection-line" className="block text-sm font-semibold text-slate-800">
                  3. 성찰 한 줄
                </label>
                <input
                  id="reflection-line"
                  type="text"
                  value={reflection}
                  onChange={(e) => setReflection(e.target.value)}
                  maxLength={1000}
                  placeholder="이번 탐구 과정을 통해 새롭게 알게 되거나 느낀 점을 한 줄로 적어 주세요."
                  className="w-full min-h-[44px] px-3.5 py-2.5 text-sm bg-white border border-slate-300 rounded-lg text-slate-900 placeholder:text-slate-400 focus:outline-none focus:ring-2 focus:ring-blue-600 focus:border-blue-600"
                />
              </div>

              {submitError && (
                <div role="alert" className="text-sm text-red-700 bg-red-50 border border-red-200 rounded-lg px-3.5 py-2.5">
                  {submitError}
                </div>
              )}

              {submitSuccess && (
                <div role="status" className="text-sm text-emerald-800 bg-emerald-50 border border-emerald-200 rounded-lg px-3.5 py-2.5">
                  성공적으로 제출되었습니다. 교수자 화면에서도 확인할 수 있습니다.
                </div>
              )}

              <div className="flex flex-wrap items-center justify-between gap-3 pt-2">
                <button
                  type="button"
                  onClick={() => void onChangeStage('검토')}
                  className="min-h-[44px] px-4 py-2.5 text-sm font-medium text-slate-700 bg-slate-100 rounded-lg hover:bg-slate-200 transition-colors whitespace-nowrap"
                >
                  검토 단계로 돌아가기
                </button>
                <button
                  type="submit"
                  disabled={isSubmitting}
                  className="min-h-[44px] px-6 py-2.5 text-sm font-semibold text-white bg-blue-700 rounded-lg hover:bg-blue-800 disabled:opacity-60 transition-colors whitespace-nowrap"
                >
                  {isSubmitting
                    ? '제출 저장 중...'
                    : submission
                      ? '제출 내용 수정 저장'
                      : '과제 최종 제출하기'}
                </button>
              </div>
            </form>
          </section>

          {/* Right: Reference of Student's Memo & Chat History */}
          <aside className="lg:col-span-5 bg-white border border-slate-200 rounded-xl p-5 sm:p-6 space-y-4">
            <h3 className="text-sm font-semibold text-slate-900">내 탐구 기록 요약</h3>

            {memo.trim() && (
              <div className="bg-slate-50 border border-slate-200 rounded-lg p-3.5 space-y-1">
                <p className="text-xs font-semibold text-slate-700">내가 적은 메모</p>
                <p className="text-sm text-slate-700 whitespace-pre-wrap leading-relaxed">{memo}</p>
              </div>
            )}

            <div className="space-y-3 max-h-[420px] overflow-y-auto pr-1">
              {chatLogs.length === 0 ? (
                <p className="text-sm text-slate-500">아직 기록된 AI 대화가 없습니다.</p>
              ) : (
                chatLogs.map((log) => (
                  <div
                    key={log.id}
                    className="border border-slate-200 rounded-lg p-3 space-y-1.5 text-xs sm:text-sm"
                  >
                    <div className="text-xs font-mono text-slate-400 tabular-nums">
                      {log.stage} · 순번 {log.sequence}
                    </div>
                    <p className="font-medium text-slate-900">Q. {log.question}</p>
                    <p className="text-slate-600 leading-relaxed">A. {log.aiReplyFull}</p>
                  </div>
                ))
              )}
            </div>
          </aside>
        </div>
      )}
    </main>
  );
}
