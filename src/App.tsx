import { useEffect, useState } from 'react';
import {
  clearAllRecords,
  getOrCreateStudentSession,
  saveChatLog,
  saveSubmission,
  subscribeAllChatLogs,
  subscribeAllSubmissions,
  subscribeStudentChatLogs,
  subscribeStudentSubmission,
  updateStudentSessionStage,
} from './services/firestoreService';
import { StudentEntryScreen } from './components/StudentEntryScreen';
import { StudentWorkspace } from './components/StudentWorkspace';
import { InstructorView } from './components/InstructorView';
import type { ChatLog, ProblemStage, SessionStage, Submission } from './types';

const STORAGE_CODE_KEY = 'campus_problem_student_code';

type AppMode = 'student' | 'instructor';

export default function App() {
  const [mode, setMode] = useState<AppMode>('student');
  const [studentCode, setStudentCode] = useState<string | null>(() => {
    try {
      const saved = localStorage.getItem(STORAGE_CODE_KEY);
      return saved && saved.trim() ? saved.trim() : null;
    } catch {
      return null;
    }
  });

  const [currentStage, setCurrentStage] = useState<SessionStage>('문제 발견');
  const [sessionLoading, setSessionLoading] = useState<boolean>(Boolean(studentCode));
  const [sessionError, setSessionError] = useState<string | null>(null);

  const [studentChatLogs, setStudentChatLogs] = useState<ChatLog[]>([]);
  const [studentSubmission, setStudentSubmission] = useState<Submission | null>(null);

  // Instructor state
  const [allChatLogs, setAllChatLogs] = useState<ChatLog[]>([]);
  const [allSubmissions, setAllSubmissions] = useState<Submission[]>([]);
  const [instructorLoading, setInstructorLoading] = useState<boolean>(false);

  // Restore student session when studentCode is present
  useEffect(() => {
    if (!studentCode) {
      setSessionLoading(false);
      setStudentChatLogs([]);
      setStudentSubmission(null);
      setCurrentStage('문제 발견');
      return;
    }

    let cancelled = false;
    setSessionLoading(true);
    setSessionError(null);

    getOrCreateStudentSession(studentCode)
      .then((session) => {
        if (cancelled) return;
        setCurrentStage(session.currentStage);
        setSessionLoading(false);
      })
      .catch((err) => {
        if (cancelled) return;
        console.error(err);
        setSessionError('학생 기록을 불러오는 중 오류가 발생했습니다. 다시 시도해 주세요.');
        setSessionLoading(false);
      });

    const unsubLogs = subscribeStudentChatLogs(
      studentCode,
      (logs) => {
        setStudentChatLogs(logs);
      },
      (err) => {
        console.error(err);
      }
    );

    const unsubSub = subscribeStudentSubmission(
      studentCode,
      (sub) => {
        setStudentSubmission(sub);
      },
      (err) => {
        console.error(err);
      }
    );

    return () => {
      cancelled = true;
      unsubLogs();
      unsubSub();
    };
  }, [studentCode]);

  // Subscribe to all records when Instructor View is active
  useEffect(() => {
    if (mode !== 'instructor') return;

    setInstructorLoading(true);
    let logsLoaded = false;
    let subsLoaded = false;

    const markReady = () => {
      if (logsLoaded && subsLoaded) {
        setInstructorLoading(false);
      }
    };

    const unsubAllLogs = subscribeAllChatLogs(
      (logs) => {
        setAllChatLogs(logs);
        logsLoaded = true;
        markReady();
      },
      (err) => {
        console.error(err);
        setInstructorLoading(false);
      }
    );

    const unsubAllSubs = subscribeAllSubmissions(
      (subs) => {
        setAllSubmissions(subs);
        subsLoaded = true;
        markReady();
      },
      (err) => {
        console.error(err);
        setInstructorLoading(false);
      }
    );

    return () => {
      unsubAllLogs();
      unsubAllSubs();
    };
  }, [mode]);

  const handleStartWithCode = async (code: string) => {
    setSessionError(null);
    setSessionLoading(true);
    try {
      const session = await getOrCreateStudentSession(code);
      try {
        localStorage.setItem(STORAGE_CODE_KEY, session.studentCode);
      } catch {
        // Ignore storage error
      }
      setStudentCode(session.studentCode);
      setCurrentStage(session.currentStage);
    } catch (err) {
      console.error(err);
      setSessionError('학생 세션을 시작하지 못했습니다. 잠시 후 다시 시도해 주세요.');
      setSessionLoading(false);
    }
  };

  const handleResetStudentCode = () => {
    try {
      localStorage.removeItem(STORAGE_CODE_KEY);
    } catch {
      // Ignore
    }
    setStudentCode(null);
    setStudentChatLogs([]);
    setStudentSubmission(null);
    setCurrentStage('문제 발견');
    setSessionError(null);
  };

  const handleChangeStage = async (nextStage: SessionStage) => {
    if (!studentCode) return;
    const prevStage = currentStage;
    setCurrentStage(nextStage);
    try {
      await updateStudentSessionStage(studentCode, nextStage);
    } catch (err) {
      setCurrentStage(prevStage);
      console.error(err);
    }
  };

  const handleSendQuestion = async (stage: ProblemStage, question: string) => {
    if (!studentCode) return;

    const history = studentChatLogs.slice(-6).map((log) => ({
      stage: log.stage,
      question: log.question,
      aiReply: log.aiReplyFull,
    }));

    const response = await fetch('/api/chat', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        studentCode,
        stage,
        question,
        history,
      }),
    });

    const payload = (await response.json()) as { reply?: string; error?: string };
    if (!response.ok || !payload.reply) {
      throw new Error(payload.error || 'AI 답변을 가져오지 못했습니다.');
    }

    const nextSequence =
      studentChatLogs.length > 0
        ? Math.max(...studentChatLogs.map((l) => l.sequence)) + 1
        : 1;

    await saveChatLog({
      studentCode,
      stage,
      sequence: nextSequence,
      question,
      aiReplyFull: payload.reply,
    });
  };

  const handleSubmitAssignment = async (data: {
    foundProblem: string;
    solution: string;
    reflection: string;
  }) => {
    if (!studentCode) return;
    await saveSubmission({
      studentCode,
      foundProblem: data.foundProblem,
      solution: data.solution,
      reflection: data.reflection,
    });
    setCurrentStage('제출 완료');
  };

  const handleClearAllRecords = async () => {
    await clearAllRecords();
    try {
      if (studentCode) {
        localStorage.removeItem(`campus_memo_${studentCode}`);
      }
      localStorage.removeItem(STORAGE_CODE_KEY);
    } catch {
      // Ignore
    }
    setStudentCode(null);
    setStudentChatLogs([]);
    setStudentSubmission(null);
    setCurrentStage('문제 발견');
  };

  return (
    <div className="min-h-screen bg-slate-50 text-slate-900 flex flex-col">
      {/* Top Bar */}
      <header className="bg-white border-b border-slate-200">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 h-14 flex items-center justify-between gap-4">
          <button
            type="button"
            onClick={() => setMode('student')}
            className="text-base sm:text-lg font-bold tracking-tight text-slate-900 whitespace-nowrap shrink-0 text-left"
          >
            우리 캠퍼스의 문제 찾기
          </button>

          <div className="flex items-center gap-3 shrink-0">
            {mode === 'student' ? (
              <button
                type="button"
                onClick={() => setMode('instructor')}
                className="min-h-[38px] px-3.5 py-1.5 text-xs sm:text-sm font-medium text-slate-800 bg-slate-100 hover:bg-slate-200 rounded-lg transition-colors whitespace-nowrap shrink-0"
              >
                교수자 화면
              </button>
            ) : (
              <button
                type="button"
                onClick={() => setMode('student')}
                className="min-h-[38px] px-3.5 py-1.5 text-xs sm:text-sm font-medium text-white bg-slate-900 hover:bg-slate-800 rounded-lg transition-colors whitespace-nowrap shrink-0"
              >
                학생 화면
              </button>
            )}
          </div>
        </div>
      </header>

      {/* Main View */}
      <div className="flex-1">
        {mode === 'instructor' ? (
          <InstructorView
            chatLogs={allChatLogs}
            submissions={allSubmissions}
            isLoading={instructorLoading}
            onClearAll={handleClearAllRecords}
            onBack={() => setMode('student')}
          />
        ) : !studentCode ? (
          <StudentEntryScreen
            onStart={handleStartWithCode}
            isLoading={sessionLoading}
            error={sessionError}
          />
        ) : sessionLoading ? (
          <main className="max-w-6xl mx-auto px-4 sm:px-6 py-16 text-center">
            <p className="text-sm text-slate-600">
              학생 코드 <span className="font-mono font-semibold">{studentCode}</span>의 기록을 불러오는 중입니다...
            </p>
          </main>
        ) : (
          <StudentWorkspace
            studentCode={studentCode}
            currentStage={currentStage}
            chatLogs={studentChatLogs}
            submission={studentSubmission}
            onChangeStage={handleChangeStage}
            onSendQuestion={handleSendQuestion}
            onSubmitAssignment={handleSubmitAssignment}
            onChangeStudentCode={handleResetStudentCode}
          />
        )}
      </div>
    </div>
  );
}
