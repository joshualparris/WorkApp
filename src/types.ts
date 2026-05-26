export type ProfileTarget = 'josh' | 'kristy';

export const PROFILE_LABELS: Record<ProfileTarget, string> = {
  josh: 'Josh',
  kristy: 'Kristy',
};

export const JOB_STATUSES = [
  'New',
  'Shortlisted',
  'Asked Question',
  'Applied',
  'Interview',
  'Rejected',
  'Accepted',
  'Archived',
] as const;

export type JobStatus = (typeof JOB_STATUSES)[number];

export type JobFitLabel = 'Apply now' | 'Ask questions first' | 'Maybe' | 'Poor fit' | 'Avoid';

export type SourceKind = 'Manual paste' | 'CSV import' | 'Email alert' | 'Adzuna API' | 'Saved search' | 'Example';

export interface ScoreFactor {
  key: string;
  label: string;
  score: number;
  max: number;
  note: string;
}

export interface ScoreBreakdown {
  factors: ScoreFactor[];
  notes: string[];
  total: number;
  forcedAvoid: boolean;
  agedCareViolation: boolean;
}

export interface JobRecord {
  id: string;
  profileTarget: ProfileTarget;
  source: SourceKind | string;
  sourceDetail: string;
  title: string;
  employer: string;
  location: string;
  distanceFromDubbo: string;
  workType: string;
  hours: string;
  daysRequired: string;
  shiftPattern: string;
  payRate: string;
  salaryText: string;
  url: string;
  postedDate: string;
  closingDate: string;
  description: string;
  requirements: string;
  nursingType: string;
  exclusionsDetected: string[];
  matchScore: number;
  scoreBreakdown: ScoreBreakdown;
  fitLabel: JobFitLabel;
  fitReason: string;
  biggestConcern: string;
  nextAction: string;
  questionToAsk: string;
  status: JobStatus;
  viewed: boolean;
  importedText: string;
  createdAt: string;
  updatedAt: string;
  notes: string;
}

export interface JobDraft {
  profileTarget: ProfileTarget;
  source: SourceKind | string;
  sourceDetail: string;
  title: string;
  employer: string;
  location: string;
  workType: string;
  hours: string;
  daysRequired: string;
  shiftPattern: string;
  payRate: string;
  salaryText: string;
  url: string;
  postedDate: string;
  closingDate: string;
  description: string;
  requirements: string;
  importedText: string;
}

export interface ProfileSettings {
  radiusKm: number;
  joshWeeklyIncomeTarget: number;
  joshEmergencyCashflow: boolean;
  joshApprovedAfternoonShift: boolean;
  kristyAllowAgedCareOverride: boolean;
}

export interface SearchQuery {
  profileTarget: ProfileTarget;
  query: string;
  priority: 'High' | 'Medium';
}

export interface ApplicationDrafts {
  enquiryEmail: string;
  applicationEmail: string;
  resumeAlignment: string[];
  interviewPrep: string[];
  acceptanceQuestions: string[];
}
