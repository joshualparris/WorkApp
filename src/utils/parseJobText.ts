import { JobRecord } from '../types';

const findLineValue = (text: string, label: string) => {
  const regex = new RegExp(`${label}[:\-]?\s*(.+)`, 'i');
  const match = text.match(regex);
  return match?.[1]?.trim() ?? '';
};

export const parseJobText = (rawText: string, profileTarget: JobRecord['profileTarget']): Partial<JobRecord> => {
  const normalized = rawText.replace(/\r\n/g, '\n').trim();
  const lines = normalized.split('\n').map((line) => line.trim()).filter(Boolean);
  const urlMatch = rawText.match(/https?:\/\/[^\s]+/i);
  const title = lines[0] || 'Imported job';
  const employer = findLineValue(rawText, 'employer') || findLineValue(rawText, 'company') || 'Unknown employer';
  const location = findLineValue(rawText, 'location') || 'Dubbo NSW';
  const postedDate = findLineValue(rawText, 'posted') || new Date().toISOString().slice(0, 10);
  const closingDate = findLineValue(rawText, 'closing') || '';
  const payRate = findLineValue(rawText, 'pay') || findLineValue(rawText, 'salary') || '';
  const description = lines.slice(1, 6).join(' ');
  const requirements = findLineValue(rawText, 'requirements') || '';
  return {
    title,
    employer,
    location,
    source: 'Manual paste',
    sourceDetail: 'Paste import',
    description: `${description} ${rawText}`.trim(),
    url: urlMatch?.[0] ?? '',
    payRate,
    salaryText: payRate,
    postedDate,
    closingDate,
    requirements,
    profileTarget,
    workType: 'Unknown',
    hours: '',
    daysRequired: '',
    shiftPattern: '',
    distanceFromDubbo: '',
    nursingType: '',
    exclusionsDetected: [],
    importedText: rawText,
    notes: 'Imported from pasted job alert text.',
  };
};
