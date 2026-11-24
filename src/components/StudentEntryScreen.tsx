import { useState, type FormEvent } from 'react';
import { ArrowRight, AlertCircle } from 'lucide-react';

interface StudentEntryScreenProps {
  onStart: (studentCode: string) => Promise<void>;
  isLoading: boolean;
  error: string | null;
}

export function StudentEntryScreen({ onStart, isLoading, error }: StudentEntryScreenProps) {
  const [code, setCode] = useState('');
  const [validationError, setValidationError] = useState<string | null>(null);

  const handleSubmit = async (e: FormEvent) => {
    e.preventDefault();
    const trimmed = code.trim();
    if (!trimmed) {
      setValidationError('학생 코드를 입력해 주세요. (예: S01)');
      return;
    }
    if (Array.from(trimmed).length > 20) {
      setValidationError('학생 코드는 20자 이내로 입력해 주세요.');
      return;
    }
    setValidationError(null);
    await onStart(trimmed);
  };

  return (
    <main className="max-w-5xl mx-auto px-4 sm:px-6 py-8 sm:py-16">
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 lg:gap-12 items-start">
        {/* Left: Assignment Brief & Public Notice */}
        <section className="lg:col-span-7 space-y-6">
          <div className="space-y-3">
            <p className="text-xs font-medium text-blue-700 tracking-wide">
              대학생 문제탐구 활동
            </p>
            <h1 className="text-3xl sm:text-4xl font-bold text-slate-900 tracking-tight leading-tight [text-wrap:balance]">
              우리 캠퍼스의 문제 찾기
            </h1>
            <p className="text-base text-slate-600 leading-relaxed max-w-xl">
              캠퍼스 생활에서 마주하는 불편을 그냥 지나치지 않고, AI 코치와 대화하며 스스로 문제를 정의하고 해결안까지 정리해 보는 4단계 탐구 과제입니다.
            </p>
          </div>

          <div className="border-t border-slate-200 pt-5 space-y-3">
            <h2 className="text-sm font-semibold text-slate-900">진행 순서</h2>
            <ol className="grid grid-cols-2 sm:grid-cols-4 gap-3 text-sm">
              <li className="bg-white border border-slate-200 rounded-lg p-3">
                <span className="block text-xs font-mono text-slate-400 tabular-nums">01</span>
                <span className="font-medium text-slate-900">문제 발견</span>
              </li>
              <li className="bg-white border border-slate-200 rounded-lg p-3">
                <span className="block text-xs font-mono text-slate-400 tabular-nums">02</span>
                <span className="font-medium text-slate-900">원인 분석</span>
              </li>
              <li className="bg-white border border-slate-200 rounded-lg p-3">
                <span className="block text-xs font-mono text-slate-400 tabular-nums">03</span>
                <span className="font-medium text-slate-900">해결안 탐색</span>
              </li>
              <li className="bg-white border border-slate-200 rounded-lg p-3">
                <span className="block text-xs font-mono text-slate-400 tabular-nums">04</span>
                <span className="font-medium text-slate-900">검토 및 제출</span>
              </li>
            </ol>
          </div>

          {/* Mandatory Notice */}
          <div
            role="note"
            className="bg-amber-50/80 border border-amber-300 rounded-xl p-4 sm:p-5 flex items-start gap-3"
          >
            <AlertCircle className="w-5 h-5 text-amber-700 shrink-0 mt-0.5" aria-hidden="true" />
            <div className="space-y-1">
              <p className="text-sm font-semibold text-slate-900">안내 사항</p>
              <p className="text-sm text-slate-800 leading-relaxed">
                입력한 내용은 수업 분석에 쓰이고 다른 사람도 볼 수 있습니다. 개인 이야기는 적지 마세요.
              </p>
            </div>
          </div>
        </section>

        {/* Right: Student Code Entry Form */}
        <section className="lg:col-span-5">
          <form
            onSubmit={handleSubmit}
            className="bg-white border border-slate-200 rounded-xl p-6 sm:p-8 space-y-6 shadow-xs"
          >
            <div className="space-y-1.5">
              <h2 className="text-xl font-semibold text-slate-900">학생 코드 입력</h2>
              <p className="text-sm text-slate-600">
                로그인 없이 부여받은 학생 코드만 입력하면 바로 시작할 수 있습니다.
              </p>
            </div>

            <div className="space-y-2">
              <label htmlFor="student-code-input" className="block text-sm font-medium text-slate-800">
                학생 코드
              </label>
              <input
                id="student-code-input"
                type="text"
                value={code}
                onChange={(e) => {
                  setCode(e.target.value);
                  if (validationError) setValidationError(null);
                }}
                placeholder="예: S01"
                maxLength={20}
                autoComplete="off"
                className="w-full min-h-[44px] px-3.5 py-2.5 text-base font-mono bg-white border border-slate-300 rounded-lg text-slate-900 placeholder:text-slate-400 focus:outline-none focus:ring-2 focus:ring-blue-600 focus:border-blue-600"
              />
              <p className="text-xs text-slate-500">
                이름과 학번은 입력하지 마세요. 같은 코드로 다시 접속하면 기존 기록이 이어집니다.
              </p>
            </div>

            {(validationError || error) && (
              <div role="alert" className="text-sm text-red-700 bg-red-50 border border-red-200 rounded-lg px-3.5 py-2.5">
                {validationError || error}
              </div>
            )}

            <button
              type="submit"
              disabled={isLoading}
              className="w-full min-h-[44px] px-4 py-2.5 inline-flex items-center justify-center gap-2 text-sm font-semibold text-white bg-blue-700 rounded-lg hover:bg-blue-800 disabled:opacity-60 disabled:cursor-not-allowed transition-colors whitespace-nowrap"
            >
              <span>{isLoading ? '기록 불러오는 중...' : '과제 시작하기'}</span>
              <ArrowRight className="w-4 h-4 shrink-0" aria-hidden="true" />
            </button>
          </form>
        </section>
      </div>
    </main>
  );
}
