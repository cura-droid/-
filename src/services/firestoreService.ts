import {
  addDoc,
  collection,
  doc,
  getDoc,
  getDocs,
  onSnapshot,
  query,
  serverTimestamp,
  setDoc,
  Timestamp,
  where,
  writeBatch,
  type Unsubscribe,
} from 'firebase/firestore';
import { db, handleFirestoreError, OperationType } from '../firebase';
import type { ChatLog, ProblemStage, SessionStage, StudentSession, Submission } from '../types';

export function toSessionDocId(studentCode: string): string {
  const bytes = new TextEncoder().encode(studentCode.trim());
  const hex = Array.from(bytes)
    .map((b) => b.toString(16).padStart(2, '0'))
    .join('');
  return `s_${hex}`;
}

function truncateCodePoints(text: string, maxLength: number): string {
  return Array.from(text).slice(0, maxLength).join('');
}

function toDate(val: unknown): Date | null {
  if (val instanceof Timestamp) {
    return val.toDate();
  }
  if (val && typeof val === 'object' && 'toDate' in val && typeof (val as { toDate: () => Date }).toDate === 'function') {
    return (val as { toDate: () => Date }).toDate();
  }
  return null;
}

export async function getOrCreateStudentSession(studentCode: string): Promise<StudentSession> {
  const cleanCode = truncateCodePoints(studentCode.trim(), 20);
  const docId = toSessionDocId(cleanCode);
  const path = `studentSessions/${docId}`;
  const docRef = doc(db, 'studentSessions', docId);

  try {
    const snap = await getDoc(docRef);
    if (snap.exists()) {
      const data = snap.data();
      return {
        studentCode: String(data.studentCode ?? cleanCode),
        currentStage: (data.currentStage as SessionStage) ?? '문제 발견',
        updatedAt: toDate(data.updatedAt),
      };
    }

    await setDoc(docRef, {
      studentCode: cleanCode,
      currentStage: '문제 발견',
      updatedAt: serverTimestamp(),
    });

    return {
      studentCode: cleanCode,
      currentStage: '문제 발견',
      updatedAt: new Date(),
    };
  } catch (error) {
    handleFirestoreError(error, OperationType.WRITE, path);
  }
}

export async function updateStudentSessionStage(
  studentCode: string,
  currentStage: SessionStage
): Promise<void> {
  const cleanCode = truncateCodePoints(studentCode.trim(), 20);
  const docId = toSessionDocId(cleanCode);
  const path = `studentSessions/${docId}`;
  const docRef = doc(db, 'studentSessions', docId);

  try {
    await setDoc(
      docRef,
      {
        studentCode: cleanCode,
        currentStage,
        updatedAt: serverTimestamp(),
      },
      { merge: true }
    );
  } catch (error) {
    handleFirestoreError(error, OperationType.UPDATE, path);
  }
}

export function subscribeStudentChatLogs(
  studentCode: string,
  onData: (logs: ChatLog[]) => void,
  onError?: (err: Error) => void
): Unsubscribe {
  const cleanCode = truncateCodePoints(studentCode.trim(), 20);
  const path = 'chatLogs';
  const q = query(collection(db, 'chatLogs'), where('studentCode', '==', cleanCode));

  return onSnapshot(
    q,
    (snapshot) => {
      const items: ChatLog[] = snapshot.docs.map((d) => {
        const data = d.data();
        return {
          id: d.id,
          studentCode: String(data.studentCode ?? ''),
          stage: (data.stage as ProblemStage) ?? '문제 발견',
          sequence: Number(data.sequence ?? 1),
          question: String(data.question ?? ''),
          aiReplySummary: String(data.aiReplySummary ?? ''),
          aiReplyFull: String(data.aiReplyFull ?? data.aiReplySummary ?? ''),
          createdAt: toDate(data.createdAt),
        };
      });
      items.sort((a, b) => a.sequence - b.sequence);
      onData(items);
    },
    (error) => {
      try {
        handleFirestoreError(error, OperationType.LIST, path);
      } catch (wrapped) {
        if (onError && wrapped instanceof Error) {
          onError(wrapped);
        }
      }
    }
  );
}

export function subscribeStudentSubmission(
  studentCode: string,
  onData: (submission: Submission | null) => void,
  onError?: (err: Error) => void
): Unsubscribe {
  const cleanCode = truncateCodePoints(studentCode.trim(), 20);
  const docId = toSessionDocId(cleanCode);
  const path = `submissions/${docId}`;

  return onSnapshot(
    doc(db, 'submissions', docId),
    (snapshot) => {
      if (!snapshot.exists()) {
        onData(null);
        return;
      }
      const data = snapshot.data();
      onData({
        id: snapshot.id,
        studentCode: String(data.studentCode ?? cleanCode),
        foundProblem: String(data.foundProblem ?? ''),
        solution: String(data.solution ?? ''),
        reflection: String(data.reflection ?? ''),
        submittedAt: toDate(data.submittedAt),
      });
    },
    (error) => {
      try {
        handleFirestoreError(error, OperationType.GET, path);
      } catch (wrapped) {
        if (onError && wrapped instanceof Error) {
          onError(wrapped);
        }
      }
    }
  );
}

export async function saveChatLog(params: {
  studentCode: string;
  stage: ProblemStage;
  sequence: number;
  question: string;
  aiReplyFull: string;
}): Promise<void> {
  const path = 'chatLogs';
  const cleanCode = truncateCodePoints(params.studentCode.trim(), 20);
  const cleanQuestion = truncateCodePoints(params.question.trim(), 2000);
  const cleanReplyFull = truncateCodePoints(params.aiReplyFull.trim(), 3000);
  const cleanReplySummary = truncateCodePoints(cleanReplyFull, 100);

  try {
    await addDoc(collection(db, 'chatLogs'), {
      studentCode: cleanCode,
      stage: params.stage,
      sequence: params.sequence,
      question: cleanQuestion,
      aiReplySummary: cleanReplySummary,
      aiReplyFull: cleanReplyFull,
      createdAt: serverTimestamp(),
    });
  } catch (error) {
    handleFirestoreError(error, OperationType.CREATE, path);
  }
}

export async function saveSubmission(params: {
  studentCode: string;
  foundProblem: string;
  solution: string;
  reflection: string;
}): Promise<void> {
  const cleanCode = truncateCodePoints(params.studentCode.trim(), 20);
  const docId = toSessionDocId(cleanCode);
  const path = `submissions/${docId}`;

  try {
    await setDoc(doc(db, 'submissions', docId), {
      studentCode: cleanCode,
      foundProblem: truncateCodePoints(params.foundProblem.trim(), 3000),
      solution: truncateCodePoints(params.solution.trim(), 3000),
      reflection: truncateCodePoints(params.reflection.trim(), 1000),
      submittedAt: serverTimestamp(),
    });
    await updateStudentSessionStage(cleanCode, '제출 완료');
  } catch (error) {
    handleFirestoreError(error, OperationType.WRITE, path);
  }
}

export function subscribeAllChatLogs(
  onData: (logs: ChatLog[]) => void,
  onError?: (err: Error) => void
): Unsubscribe {
  const path = 'chatLogs';
  return onSnapshot(
    collection(db, 'chatLogs'),
    (snapshot) => {
      const items: ChatLog[] = snapshot.docs.map((d) => {
        const data = d.data();
        return {
          id: d.id,
          studentCode: String(data.studentCode ?? ''),
          stage: (data.stage as ProblemStage) ?? '문제 발견',
          sequence: Number(data.sequence ?? 1),
          question: String(data.question ?? ''),
          aiReplySummary: String(data.aiReplySummary ?? ''),
          aiReplyFull: String(data.aiReplyFull ?? data.aiReplySummary ?? ''),
          createdAt: toDate(data.createdAt),
        };
      });
      items.sort((a, b) => {
        const codeCmp = a.studentCode.localeCompare(b.studentCode, 'ko');
        if (codeCmp !== 0) return codeCmp;
        return a.sequence - b.sequence;
      });
      onData(items);
    },
    (error) => {
      try {
        handleFirestoreError(error, OperationType.LIST, path);
      } catch (wrapped) {
        if (onError && wrapped instanceof Error) {
          onError(wrapped);
        }
      }
    }
  );
}

export function subscribeAllSubmissions(
  onData: (submissions: Submission[]) => void,
  onError?: (err: Error) => void
): Unsubscribe {
  const path = 'submissions';
  return onSnapshot(
    collection(db, 'submissions'),
    (snapshot) => {
      const items: Submission[] = snapshot.docs.map((d) => {
        const data = d.data();
        return {
          id: d.id,
          studentCode: String(data.studentCode ?? ''),
          foundProblem: String(data.foundProblem ?? ''),
          solution: String(data.solution ?? ''),
          reflection: String(data.reflection ?? ''),
          submittedAt: toDate(data.submittedAt),
        };
      });
      items.sort((a, b) => {
        const timeA = a.submittedAt?.getTime() ?? 0;
        const timeB = b.submittedAt?.getTime() ?? 0;
        return timeB - timeA;
      });
      onData(items);
    },
    (error) => {
      try {
        handleFirestoreError(error, OperationType.LIST, path);
      } catch (wrapped) {
        if (onError && wrapped instanceof Error) {
          onError(wrapped);
        }
      }
    }
  );
}

export async function clearAllRecords(): Promise<void> {
  const collections = ['chatLogs', 'submissions', 'studentSessions'] as const;
  const allRefs: ReturnType<typeof doc>[] = [];

  for (const colName of collections) {
    try {
      const snap = await getDocs(collection(db, colName));
      snap.docs.forEach((d) => allRefs.push(d.ref));
    } catch (error) {
      handleFirestoreError(error, OperationType.LIST, colName);
    }
  }

  const chunkSize = 400;
  for (let i = 0; i < allRefs.length; i += chunkSize) {
    const batch = writeBatch(db);
    const slice = allRefs.slice(i, i + chunkSize);
    slice.forEach((ref) => batch.delete(ref));
    try {
      await batch.commit();
    } catch (error) {
      handleFirestoreError(error, OperationType.DELETE, 'batch-clear');
    }
  }
}
