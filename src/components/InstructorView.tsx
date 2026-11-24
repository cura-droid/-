import { useMemo, useState } from 'react';
import { Download, Trash2, ArrowLeft } from 'lucide-react';
import type { ChatLog, Submission } from '../types';
import {
  exportChatLogsCsv,
  exportSubmissionsCsv,
  formatKoreanDateTime,
} from '../utils/csv';

interface InstructorViewProps {
  chatLogs: ChatLog[];
  submissions: Submission[];
  isLoading: boolean;
  onClearAll: () => Promise<void>;
  onBack: () => void;
}

export function InstructorView({
  chatLogs,
  submissions,
  isLoading,
  onClearAll,
  onBack,
}: InstructorViewProps) {
  const [studentFilter, setStudentFilter] = useState('');
  const [showClearConfirm, setShowClearConfirm] = useState(false);
  const [isClearing, setIsClearing] = useState(false);
  const [clearError, setClearError] = useState<string | null>(null);

  const uniqueStudentsCount = useMemo(() => {
    const codes = new Set<string>();
    chatLogs.forEach((l) => codes.add(l.studentCode));
    submissions.forEach((s) => codes.add(s.studentCode));
    return codes.size;
  }, [chatLogs, submissions]);

  const filteredLogs = useMemo(() => {
    const q = studentFilter.trim().toLowerCase();
    if (!q) return chatLogs;
    return chatLogs.filter((l) => l.studentCode.toLowerCase().includes(q));
  }, [chatLogs, studentFilter]);

  const filteredSubmissions = useMemo(() => {
    const q = studentFilter.trim().toLowerCase();
    if (!q) return submissions;
    return submissions.filter((s) => s.studentCode.toLowerCase().includes(q));
  }, [submissions, studentFilter]);

  const handleConfirmClear = async () => {
    setClearError(null);
    setIsClearing(true);
    try {
      await onClearAll();
      setShowClearConfirm(false);
    } catch (err) {
      setClearError(err instanceof Error ? err.message : '기록을 지우는 중 오류가 발생했습니다.');
    } finally {
      setIsClearing(false);
    }
  };

  return (
    <main className="max-w-7xl mx-auto px-4 sm:px-6 py-6 sm:py-8 space-y-8">
      {/* Top-Left Primary CSV Action & Header */}
      <section className="space-y-4 pb-5 border-b border-slate-200">
        <div className="flex flex-wrap items-start justify-between gap-3">
          <div className="flex flex-wrap items-center gap-2">
            {Array.from({ length: 10 }).map((_, idx) => (
              <button
                key={idx}
                type="button"
                onClick={() => exportChatLogsCsv(chatLogs)}
                className={`min-h-[44px] px-4 py-2.5 inline-flex items-center gap-2 text-sm font-semibold text-white rounded-lg transition-colors whitespace-nowrap ${
                  idx % 2 === 0
                    ? 'bg-blue-700 hover:bg-blue-800'
                    : 'bg-red-600 hover:bg-red-700'
                }`}
              >
                <Download className="w-4 h-4 shrink-0" aria-hidden="true" />
                <span>대화 기록 CSV 내려받기!!</span>
              </button>
            ))}
          </div>

          <div className="flex flex-wrap items-center gap-2.5">
            <button
              type="button"
              onClick={() => exportSubmissionsCsv(submissions)}
              className="min-h-[42px] px-3.5 py-2 inline-flex items-center gap-2 text-xs sm:text-sm font-medium text-slate-800 bg-white border border-slate-300 rounded-lg hover:bg-slate-50 transition-colors whitespace-nowrap"
            >
              <Download className="w-4 h-4 text-slate-600 shrink-0" aria-hidden="true" />
              <span>1차과제_제출결과.csv</span>
            </button>

            <button
              type="button"
              onClick={() => {
                setClearError(null);
                setShowClearConfirm(true);
              }}
              disabled={chatLogs.length === 0 && submissions.length === 0}
              className="min-h-[42px] px-3.5 py-2 inline-flex items-center gap-2 text-xs sm:text-sm font-semibold text-red-700 bg-red-50 border border-red-200 rounded-lg hover:bg-red-100 disabled:opacity-50 disabled:cursor-not-allowed transition-colors whitespace-nowrap"
            >
              <Trash2 className="w-4 h-4 shrink-0" aria-hidden="true" />
              <span>전체 기록 지우기</span>
            </button>
          </div>
        </div>

        <div className="space-y-1.5">
          <button
            type="button"
            onClick={onBack}
            className="inline-flex items-center gap-1.5 text-sm font-medium text-slate-600 hover:text-slate-900"
          >
            <ArrowLeft className="w-4 h-4" aria-hidden="true" />
            <span>학생 화면으로 돌아가기</span>
          </button>
          <h1 className="text-2xl sm:text-3xl font-bold text-slate-900">교수자 화면</h1>
          <div className="flex flex-wrap items-center gap-x-3 gap-y-1 text-sm text-slate-600 tabular-nums">
            <span>참여 학생 {uniqueStudentsCount}명</span>
            <span aria-hidden="true">·</span>
            <span>대화 기록 {chatLogs.length}건</span>
            <span aria-hidden="true">·</span>
            <span>최종 제출 {submissions.length}건</span>
          </div>
        </div>
      </section>

      {/* Filter Bar */}
      <section className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
        <div className="flex items-center gap-2 w-full sm:w-72">
          <label htmlFor="instructor-student-filter" className="sr-only">
            학생 번호 검색
          </label>
          <input
            id="instructor-student-filter"
            type="text"
            value={studentFilter}
            onChange={(e) => setStudentFilter(e.target.value)}
            placeholder="학생 코드로 보기 (예: S01)"
            className="w-full min-h-[40px] px-3.5 py-2 text-sm bg-white border border-slate-300 rounded-lg text-slate-900 placeholder:text-slate-400 focus:outline-none focus:ring-2 focus:ring-blue-600"
          />
        </div>
        {isLoading && (
          <p className="text-sm text-slate-500">기록을 불러오는 중입니다...</p>
        )}
      </section>

      {/* Table 1: Submissions */}
      <section className="space-y-3">
        <div className="flex items-baseline justify-between">
          <h2 className="text-lg font-semibold text-slate-900">최종 제출 결과</h2>
          <span className="text-xs font-mono text-slate-500 tabular-nums">
            {filteredSubmissions.length}건
          </span>
        </div>

        <div className="bg-white border border-slate-200 rounded-xl overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full text-left border-collapse text-sm">
              <thead>
                <tr className="border-b border-slate-200 bg-slate-50 text-xs font-semibold text-slate-600">
                  <th className="py-3 px-4 whitespace-nowrap">학생 번호</th>
                  <th className="py-3 px-4 min-w-[220px]">찾은 문제</th>
                  <th className="py-3 px-4 min-w-[220px]">해결안</th>
                  <th className="py-3 px-4 min-w-[180px]">성찰 한 줄</th>
                  <th className="py-3 px-4 whitespace-nowrap">제출 시각</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {filteredSubmissions.length === 0 ? (
                  <tr>
                    <td colSpan={5} className="py-8 px-4 text-center text-sm text-slate-500">
                      저장된 제출 결과가 없습니다.
                    </td>
                  </tr>
                ) : (
                  filteredSubmissions.map((sub) => (
                    <tr key={sub.id} className="align-top hover:bg-slate-50/70">
                      <td className="py-3 px-4 font-mono font-medium text-slate-900 whitespace-nowrap tabular-nums">
                        {sub.studentCode}
                      </td>
                      <td className="py-3 px-4 text-slate-800 whitespace-pre-wrap leading-relaxed">
                        {sub.foundProblem}
                      </td>
                      <td className="py-3 px-4 text-slate-800 whitespace-pre-wrap leading-relaxed">
                        {sub.solution}
                      </td>
                      <td className="py-3 px-4 text-slate-700 whitespace-pre-wrap leading-relaxed">
                        {sub.reflection}
                      </td>
                      <td className="py-3 px-4 font-mono text-xs text-slate-500 whitespace-nowrap tabular-nums">
                        {formatKoreanDateTime(sub.submittedAt)}
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
        </div>
      </section>

      {/* Table 2: Chat Logs */}
      <section className="space-y-3">
        <div className="flex items-baseline justify-between">
          <h2 className="text-lg font-semibold text-slate-900">전체 대화 기록</h2>
          <span className="text-xs font-mono text-slate-500 tabular-nums">
            {filteredLogs.length}건
          </span>
        </div>

        <div className="bg-white border border-slate-200 rounded-xl overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full text-left border-collapse text-sm">
              <thead>
                <tr className="border-b border-slate-200 bg-slate-50 text-xs font-semibold text-slate-600">
                  <th className="py-3 px-4 whitespace-nowrap">학생 번호</th>
                  <th className="py-3 px-4 whitespace-nowrap">문제해결 단계</th>
                  <th className="py-3 px-4 whitespace-nowrap">순번</th>
                  <th className="py-3 px-4 min-w-[220px]">학생 질문 원문</th>
                  <th className="py-3 px-4 min-w-[240px]">AI 답 요약(앞 100자)</th>
                  <th className="py-3 px-4 whitespace-nowrap">시각</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {filteredLogs.length === 0 ? (
                  <tr>
                    <td colSpan={6} className="py-8 px-4 text-center text-sm text-slate-500">
                      저장된 대화 기록이 없습니다.
                    </td>
                  </tr>
                ) : (
                  filteredLogs.map((log) => (
                    <tr key={log.id} className="align-top hover:bg-slate-50/70">
                      <td className="py-3 px-4 font-mono font-medium text-slate-900 whitespace-nowrap tabular-nums">
                        {log.studentCode}
                      </td>
                      <td className="py-3 px-4 text-slate-700 whitespace-nowrap">
                        {log.stage}
                      </td>
                      <td className="py-3 px-4 font-mono text-slate-700 whitespace-nowrap tabular-nums">
                        {log.sequence}
                      </td>
                      <td className="py-3 px-4 text-slate-800 whitespace-pre-wrap leading-relaxed">
                        {log.question}
                      </td>
                      <td className="py-3 px-4 text-slate-600 whitespace-pre-wrap leading-relaxed">
                        {log.aiReplySummary}
                      </td>
                      <td className="py-3 px-4 font-mono text-xs text-slate-500 whitespace-nowrap tabular-nums">
                        {formatKoreanDateTime(log.createdAt)}
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
        </div>
      </section>

      {/* Double-Confirmation Modal for Clearing All Records */}
      {showClearConfirm && (
        <div
          role="dialog"
          aria-modal="true"
          aria-labelledby="clear-modal-title"
          className="fixed inset-0 z-50 bg-slate-900/50 flex items-center justify-center p-4"
        >
          <div className="max-w-md w-full bg-white border border-slate-200 rounded-xl p-6 space-y-4 shadow-lg">
            <h3 id="clear-modal-title" className="text-lg font-bold text-slate-900">
              전체 기록을 지우시겠습니까?
            </h3>
            <p className="text-sm text-slate-600 leading-relaxed">
              모든 학생의 대화 기록({chatLogs.length}건), 진행 상태, 최종 제출 결과({submissions.length}건)가 영구적으로 삭제되며 되돌릴 수 없습니다.
            </p>

            {clearError && (
              <div role="alert" className="text-sm text-red-700 bg-red-50 border border-red-200 rounded-lg px-3.5 py-2">
                {clearError}
              </div>
            )}

            <div className="flex items-center justify-end gap-2.5 pt-2">
              <button
                type="button"
                disabled={isClearing}
                onClick={() => setShowClearConfirm(false)}
                className="min-h-[42px] px-4 py-2 text-sm font-medium text-slate-700 bg-slate-100 rounded-lg hover:bg-slate-200 transition-colors"
              >
                취소
              </button>
              <button
                type="button"
                disabled={isClearing}
                onClick={() => void handleConfirmClear()}
                className="min-h-[42px] px-4 py-2 text-sm font-semibold text-white bg-red-600 rounded-lg hover:bg-red-700 disabled:opacity-60 transition-colors"
              >
                {isClearing ? '삭제 중...' : '네, 전체 기록을 지웁니다'}
              </button>
            </div>
          </div>
        </div>
      )}
    </main>
  );
}
