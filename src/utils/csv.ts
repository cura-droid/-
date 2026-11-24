import type { ChatLog, Submission } from '../types';

export function formatKoreanDateTime(date: Date | null): string {
  if (!date) return '-';
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, '0');
  const day = String(date.getDate()).padStart(2, '0');
  const hours = String(date.getHours()).padStart(2, '0');
  const minutes = String(date.getMinutes()).padStart(2, '0');
  const seconds = String(date.getSeconds()).padStart(2, '0');
  return `${year}-${month}-${day} ${hours}:${minutes}:${seconds}`;
}

function escapeCsvCell(value: string | number): string {
  let str = String(value ?? '');
  if (/^[=+\-@\t\r]/.test(str)) {
    str = `'${str}`;
  }
  const escaped = str.replace(/"/g, '""');
  return `"${escaped}"`;
}

function downloadUtf8BomCsv(filename: string, headers: string[], rows: (string | number)[][]): void {
  const headerLine = headers.map(escapeCsvCell).join(',');
  const dataLines = rows.map((row) => row.map(escapeCsvCell).join(','));
  const csvContent = '\uFEFF' + [headerLine, ...dataLines].join('\r\n');

  const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
  const url = URL.createObjectURL(blob);
  const link = document.createElement('a');
  link.href = url;
  link.download = filename;
  link.style.display = 'none';
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
  URL.revokeObjectURL(url);
}

export function exportChatLogsCsv(logs: ChatLog[]): void {
  const headers = [
    '학생 번호',
    '문제해결 단계',
    '순번',
    '학생 질문 원문',
    'AI 답 요약(앞 100자)',
    '시각',
  ];
  const rows = logs.map((log) => [
    log.studentCode,
    log.stage,
    log.sequence,
    log.question,
    log.aiReplySummary,
    formatKoreanDateTime(log.createdAt),
  ]);
  downloadUtf8BomCsv('1차과제_대화기록 랄라라.csv', headers, rows);
}

export function exportSubmissionsCsv(submissions: Submission[]): void {
  const headers = ['학생 번호', '찾은 문제', '해결안', '성찰 한 줄', '제출 시각'];
  const rows = submissions.map((sub) => [
    sub.studentCode,
    sub.foundProblem,
    sub.solution,
    sub.reflection,
    formatKoreanDateTime(sub.submittedAt),
  ]);
  downloadUtf8BomCsv('1차과제_제출결과.csv', headers, rows);
}
