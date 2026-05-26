import { useEffect, useMemo, useState } from 'react';
import {
  Activity,
  AlertTriangle,
  Archive,
  BadgeCheck,
  Briefcase,
  CalendarClock,
  CheckCircle2,
  ClipboardList,
  Copy,
  Download,
  DollarSign,
  FileText,
  Filter,
  HeartPulse,
  HelpCircle,
  Inbox,
  Mail,
  MapPin,
  Plus,
  Radar,
  RefreshCw,
  Save,
  Search,
  Send,
  Settings,
  ShieldCheck,
  SlidersHorizontal,
  Trash2,
  Upload,
  UserRound,
  XCircle,
  type LucideIcon,
} from 'lucide-react';
import {
  joshAvoid,
  joshGoodCategories,
  joshResumeEvidence,
  joshStrengths,
  kristyAvoid,
  kristyPreferred,
  kristyResumeEvidence,
  searchQueries,
  sourcePipeline,
} from './data/content';
import {
  createJobFromDraft,
  confidenceSummary,
  defaultSettings,
  emptyDraft,
  estimateWeeklyIncome,
  isClosingSoon,
  makeApplicationDrafts,
  makeDedupeKey,
  parseJobText,
  parsePayEstimate,
  scoreJob,
} from './data/scoring';
import { checkJobIntegrations, queryAdzunaJobs, refreshJobPack } from './data/adzuna';
import {
  JOB_STATUSES,
  JobDraft,
  JobFitLabel,
  JobRecord,
  JobStatus,
  PROFILE_LABELS,
  ProfileSettings,
  ProfileTarget,
} from './types';

const JOBS_KEY = 'dubbo-job-radar:jobs:v1';
const SETTINGS_KEY = 'dubbo-job-radar:settings:v1';
const AGENCY_LEADS_KEY = 'dubbo-job-radar:agency-leads:v1';

type ViewId = 'dashboard' | 'inbox' | 'tracker' | 'helper' | 'cashflow' | 'settings';
type TargetFilter = 'all' | ProfileTarget;
type AgencyLead = {
  id: string;
  agency: string;
  contact: string;
  phoneEmail: string;
  joshRelevance: string;
  kristyRelevance: string;
  lastContact: string;
  nextFollowUp: string;
  notes: string;
};
type RefreshTarget = 'all' | ProfileTarget;

interface Filters {
  target: TargetFilter;
  scoreAbove80: boolean;
  thursdayFriday: boolean;
  notAgedCare: boolean;
  dayShiftOnly: boolean;
  dubboOnly: boolean;
  closingSoon: boolean;
  notViewed: boolean;
}

const initialFilters: Filters = {
  target: 'all',
  scoreAbove80: false,
  thursdayFriday: false,
  notAgedCare: false,
  dayShiftOnly: false,
  dubboOnly: false,
  closingSoon: false,
  notViewed: false,
};

const fitStyles: Record<JobFitLabel, string> = {
  'Apply now': 'border-emerald-600 bg-emerald-50 text-emerald-800',
  'Ask questions first': 'border-amber-500 bg-amber-50 text-amber-800',
  Maybe: 'border-slate-400 bg-slate-100 text-slate-700',
  'Poor fit': 'border-rose-300 bg-rose-50 text-rose-700',
  Avoid: 'border-red-600 bg-red-50 text-red-800',
};

const scoreBarStyles = (score: number) => {
  if (score >= 82) return 'bg-emerald-600';
  if (score >= 66) return 'bg-amber-500';
  if (score >= 50) return 'bg-sky-500';
  if (score >= 30) return 'bg-rose-400';
  return 'bg-red-600';
};

const targetStyles: Record<ProfileTarget, string> = {
  josh: 'bg-sky-50 text-sky-800 border-sky-200',
  kristy: 'bg-fuchsia-50 text-fuchsia-800 border-fuchsia-200',
};

const navItems: Array<{ id: ViewId; label: string; icon: LucideIcon }> = [
  { id: 'dashboard', label: 'Radar', icon: Radar },
  { id: 'inbox', label: 'Inbox', icon: Inbox },
  { id: 'tracker', label: 'Tracker', icon: ClipboardList },
  { id: 'helper', label: 'Helper', icon: Mail },
  { id: 'cashflow', label: 'Cashflow', icon: DollarSign },
  { id: 'settings', label: 'Settings', icon: Settings },
];

const loadJobs = (): JobRecord[] => {
  try {
    const value = localStorage.getItem(JOBS_KEY);
    return value ? (JSON.parse(value) as JobRecord[]).map((job) => scoreJob(job, defaultSettings)) : [];
  } catch {
    return [];
  }
};

const loadSettings = (): ProfileSettings => {
  try {
    const value = localStorage.getItem(SETTINGS_KEY);
    return value ? { ...defaultSettings, ...(JSON.parse(value) as Partial<ProfileSettings>) } : defaultSettings;
  } catch {
    return defaultSettings;
  }
};

const defaultAgencyLeads = (): AgencyLead[] =>
  [
    ['Programmed', 'High: day-shift bridge work', 'Low unless health admin appears'],
    ['Spinifex Recruiting', 'High: admin, ICT-adjacent, customer service, temp roles', 'Medium: health/admin leads'],
    ['Haynes People', 'Medium: temp/admin and carefully chosen bridge work', 'Low unless nursing admin appears'],
    ['Yilabara / Parent Pathways', 'Medium: family-aware employment support', 'Medium: family-aware return-to-work support'],
    ['Joblink Plus', 'Medium: local employment support and referrals', 'Medium: local employment support'],
    ['Sureway', 'Medium: local job leads and employer contacts', 'Medium: local job leads'],
    ['APM', 'Medium: employment services and employer contacts', 'Medium: employment services'],
    ['NSW Health / I Work for NSW', 'Low for Josh unless admin/ICT appears', 'High: casual pool, clinic, outpatient, child/family health'],
    ['Dubbo Regional Council', 'Medium: admin/customer/library/ICT leads', 'Low unless community health adjacent'],
  ].map(([agency, joshRelevance, kristyRelevance]) => ({
    id: makeAgencyId(agency),
    agency,
    contact: '',
    phoneEmail: '',
    joshRelevance,
    kristyRelevance,
    lastContact: '',
    nextFollowUp: '',
    notes: '',
  }));

function makeAgencyId(seed = 'agency'): string {
  return `${seed.toLowerCase().replace(/[^a-z0-9]+/g, '-')}-${Math.random().toString(36).slice(2, 7)}`;
}

function loadAgencyLeads(): AgencyLead[] {
  try {
    const value = localStorage.getItem(AGENCY_LEADS_KEY);
    return value ? (JSON.parse(value) as AgencyLead[]) : defaultAgencyLeads();
  } catch {
    return defaultAgencyLeads();
  }
}

const textBlob = (job: JobRecord) =>
  [
    job.title,
    job.employer,
    job.location,
    job.workType,
    job.hours,
    job.daysRequired,
    job.shiftPattern,
    job.payRate,
    job.salaryText,
    job.description,
    job.requirements,
  ]
    .join(' ')
    .toLowerCase();

const formatDate = (value: string) => {
  if (!value) return 'Not listed';
  const date = new Date(`${value}T00:00:00`);
  if (Number.isNaN(date.getTime())) return value;
  return new Intl.DateTimeFormat('en-AU', { day: 'numeric', month: 'short', year: 'numeric' }).format(date);
};

const todayIso = () => new Date().toISOString().slice(0, 10);

const statusOrder: JobStatus[] = ['New', 'Shortlisted', 'Asked Question', 'Applied', 'Interview', 'Accepted', 'Rejected', 'Archived'];

function daysSince(value: string): number {
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return 0;
  return Math.floor((Date.now() - date.getTime()) / (1000 * 60 * 60 * 24));
}

function isFollowUpDue(job: JobRecord): boolean {
  if (job.status === 'Asked Question') return daysSince(job.updatedAt || job.createdAt) >= 2;
  if (job.status === 'Applied') return daysSince(job.updatedAt || job.createdAt) >= 5;
  if (job.status === 'Interview') return daysSince(job.updatedAt || job.createdAt) >= 1;
  return false;
}

function followUpReason(job: JobRecord): string {
  if (job.status === 'Asked Question') return 'Question sent more than 2 days ago.';
  if (job.status === 'Applied') return 'Application has been sitting for 5+ days.';
  if (job.status === 'Interview') return 'Interview stage should be checked promptly.';
  return 'No follow-up needed yet.';
}

const CsvHeaderMap: Record<string, keyof JobDraft | 'profile'> = {
  profile: 'profile',
  profile_target: 'profile',
  target: 'profile',
  person: 'profile',
  source: 'source',
  source_detail: 'sourceDetail',
  title: 'title',
  job_title: 'title',
  position: 'title',
  employer: 'employer',
  company: 'employer',
  organisation: 'employer',
  organization: 'employer',
  location: 'location',
  work_type: 'workType',
  type: 'workType',
  hours: 'hours',
  days_required: 'daysRequired',
  days: 'daysRequired',
  shift_pattern: 'shiftPattern',
  roster: 'shiftPattern',
  pay: 'payRate',
  pay_rate: 'payRate',
  salary: 'salaryText',
  salary_text: 'salaryText',
  url: 'url',
  link: 'url',
  posted_date: 'postedDate',
  closing_date: 'closingDate',
  description: 'description',
  requirements: 'requirements',
};

function splitCsvLine(line: string): string[] {
  const cells: string[] = [];
  let current = '';
  let inQuotes = false;
  for (let index = 0; index < line.length; index += 1) {
    const char = line[index];
    const next = line[index + 1];
    if (char === '"' && inQuotes && next === '"') {
      current += '"';
      index += 1;
    } else if (char === '"') {
      inQuotes = !inQuotes;
    } else if (char === ',' && !inQuotes) {
      cells.push(current.trim());
      current = '';
    } else {
      current += char;
    }
  }
  cells.push(current.trim());
  return cells;
}

function csvToDrafts(csv: string, fallbackTarget: ProfileTarget): JobDraft[] {
  const lines = csv
    .split(/\r?\n/)
    .map((line) => line.trim())
    .filter(Boolean);
  if (lines.length < 2) return [];
  const headers = splitCsvLine(lines[0]).map((header) => header.toLowerCase().replace(/[^a-z0-9]+/g, '_'));
  return lines.slice(1).map((line) => {
    const cells = splitCsvLine(line);
    const draft: JobDraft = { ...emptyDraft, source: 'CSV import', profileTarget: fallbackTarget, importedText: line };
    headers.forEach((header, index) => {
      const mapped = CsvHeaderMap[header];
      if (!mapped) return;
      const value = cells[index] ?? '';
      if (mapped === 'profile') {
        draft.profileTarget = value.toLowerCase().includes('kristy') ? 'kristy' : value.toLowerCase().includes('josh') ? 'josh' : fallbackTarget;
      } else {
        (draft as unknown as Record<string, string>)[mapped] = value;
      }
    });
    if (!draft.description) draft.description = line;
    return draft;
  });
}

function downloadText(filename: string, content: string, type = 'text/plain') {
  const blob = new Blob([content], { type });
  const url = URL.createObjectURL(blob);
  const link = document.createElement('a');
  link.href = url;
  link.download = filename;
  link.click();
  URL.revokeObjectURL(url);
}

function csvEscape(value: string | number | boolean) {
  const text = String(value ?? '');
  return `"${text.replace(/"/g, '""')}"`;
}

function jobsToCsv(jobs: JobRecord[]): string {
  const headers = [
    'profile',
    'status',
    'score',
    'fitLabel',
    'title',
    'employer',
    'location',
    'workType',
    'daysRequired',
    'shiftPattern',
    'pay',
    'postedDate',
    'closingDate',
    'source',
    'url',
    'bestReason',
    'biggestConcern',
    'nextAction',
    'notes',
  ];
  const rows = jobs.map((job) =>
    [
      PROFILE_LABELS[job.profileTarget],
      job.status,
      job.matchScore,
      job.fitLabel,
      job.title,
      job.employer,
      job.location,
      job.workType,
      job.daysRequired,
      job.shiftPattern,
      job.payRate || job.salaryText,
      job.postedDate,
      job.closingDate,
      job.source,
      job.url,
      job.fitReason,
      job.biggestConcern,
      job.nextAction,
      job.notes,
    ].map(csvEscape)
  );
  return [headers.map(csvEscape), ...rows].map((row) => row.join(',')).join('\n');
}

function shortJobLine(job: JobRecord) {
  const closing = job.closingDate ? `, closes ${formatDate(job.closingDate)}` : '';
  return `${job.title} - ${job.employer} (${job.matchScore}/100, ${job.fitLabel}${closing})`;
}

function makeDailyBriefing(jobs: JobRecord[]): string {
  const active = jobs.filter((job) => job.status !== 'Archived');
  const topFor = (target: ProfileTarget) =>
    active
      .filter((job) => job.profileTarget === target)
      .sort((a, b) => b.matchScore - a.matchScore)
      .slice(0, 5);
  const closing = active.filter((job) => isClosingSoon(job)).sort((a, b) => b.matchScore - a.matchScore);
  const questions = active.filter((job) => job.fitLabel === 'Ask questions first').sort((a, b) => b.matchScore - a.matchScore);
  const lines = [
    `Dubbo Job Radar briefing - ${formatDate(todayIso())}`,
    '',
    'Josh top opportunities:',
    ...(topFor('josh').length ? topFor('josh').map((job, index) => `${index + 1}. ${shortJobLine(job)}`) : ['No Josh leads yet.']),
    '',
    'Kristy top opportunities:',
    ...(topFor('kristy').length ? topFor('kristy').map((job, index) => `${index + 1}. ${shortJobLine(job)}`) : ['No Kristy leads yet.']),
    '',
    'Closing within 3 days:',
    ...(closing.length ? closing.slice(0, 8).map((job) => `- ${shortJobLine(job)}`) : ['None listed.']),
    '',
    'Ask-before-applying queue:',
    ...(questions.length ? questions.slice(0, 8).map((job) => `- ${job.title}: ${job.questionToAsk}`) : ['No question-first jobs waiting.']),
  ];
  return lines.join('\n');
}

function makeEvidencePack(jobs: JobRecord[], settings: ProfileSettings): string {
  const active = jobs.filter((job) => job.status !== 'Archived');
  const contacted = jobs.filter((job) => ['Asked Question', 'Applied', 'Interview', 'Rejected', 'Accepted'].includes(job.status));
  const lines = [
    `# Dubbo Job Radar Evidence Pack - ${formatDate(todayIso())}`,
    '',
    `Josh income target: $${settings.joshWeeklyIncomeTarget}/week`,
    `Search radius: ${settings.radiusKm}km`,
    `Total leads: ${jobs.length}`,
    `Active leads: ${active.length}`,
    `Contacted/applied/interviewed: ${contacted.length}`,
    '',
    '## Applications And Contacts',
    '',
    ...(contacted.length
      ? contacted.map(
          (job) =>
            `- ${PROFILE_LABELS[job.profileTarget]} | ${job.status} | ${job.matchScore}/100 | ${job.title} | ${job.employer} | ${job.location} | ${job.url || 'No URL'}`
        )
      : ['No contacted or applied jobs yet.']),
    '',
    '## Active Shortlist',
    '',
    ...(active.length
      ? active
          .sort((a, b) => b.matchScore - a.matchScore)
          .map(
            (job) =>
              `- ${PROFILE_LABELS[job.profileTarget]} | ${job.fitLabel} | ${job.matchScore}/100 | ${job.title} | ${job.employer} | Next: ${job.nextAction}`
          )
      : ['No active jobs.']),
  ];
  return lines.join('\n');
}

function makeFollowUpMessage(job: JobRecord): string {
  const greeting = job.employer && job.employer !== 'Unknown employer' ? `Hi ${job.employer} team,` : 'Hi there,';
  const context =
    job.status === 'Asked Question'
      ? `I recently sent a question about the ${job.title} role and wanted to gently follow up.`
      : job.status === 'Interview'
        ? `Thank you again for discussing the ${job.title} role with me. I wanted to follow up on the next steps.`
        : `I recently applied for the ${job.title} role and wanted to check whether there are any updates or further details I can provide.`;

  const profileLine =
    job.profileTarget === 'josh'
      ? 'I am especially interested in whether the role can work around Thursday/Friday day-shift availability.'
      : 'I am especially interested in confirming the roster, setting, and family-friendly fit for the role.';

  return [greeting, '', context, profileLine, '', 'Kind regards,', PROFILE_LABELS[job.profileTarget] === 'Josh' ? 'Josh Parris' : 'Kristy Parris'].join('\n');
}

function App() {
  const [jobs, setJobs] = useState<JobRecord[]>(() => loadJobs());
  const [settings, setSettings] = useState<ProfileSettings>(() => loadSettings());
  const [view, setView] = useState<ViewId>('dashboard');
  const [filters, setFilters] = useState<Filters>(initialFilters);
  const [selectedJobId, setSelectedJobId] = useState('');
  const [notice, setNotice] = useState('');

  useEffect(() => {
    localStorage.setItem(JOBS_KEY, JSON.stringify(jobs));
  }, [jobs]);

  useEffect(() => {
    localStorage.setItem(SETTINGS_KEY, JSON.stringify(settings));
  }, [settings]);

  const selectedJob = useMemo(
    () => jobs.find((job) => job.id === selectedJobId) ?? jobs.find((job) => job.status !== 'Archived') ?? jobs[0],
    [jobs, selectedJobId]
  );

  const sortedJobs = useMemo(() => [...jobs].sort((a, b) => b.matchScore - a.matchScore), [jobs]);

  const filteredJobs = useMemo(() => {
    return sortedJobs.filter((job) => {
      const text = textBlob(job);
      if (filters.target !== 'all' && job.profileTarget !== filters.target) return false;
      if (filters.scoreAbove80 && job.matchScore < 80) return false;
      if (filters.thursdayFriday && !/(thursday|friday|thu|fri|2 days|two days)/i.test(text)) return false;
      if (filters.notAgedCare && job.profileTarget === 'kristy' && job.scoreBreakdown.agedCareViolation) return false;
      if (filters.dayShiftOnly && /(night|overnight|afternoon|evening|11pm|3pm)/i.test(text)) return false;
      if (filters.dubboOnly && !job.location.toLowerCase().includes('dubbo')) return false;
      if (filters.closingSoon && !isClosingSoon(job)) return false;
      if (filters.notViewed && job.viewed) return false;
      return true;
    });
  }, [filters, sortedJobs]);

  const updateSettings = (patch: Partial<ProfileSettings>) => {
    const next = { ...settings, ...patch };
    setSettings(next);
    setJobs((current) => current.map((job) => scoreJob(job, next)));
  };

  const upsertJob = (job: JobRecord) => {
    let selected = job.id;
    setJobs((current) => {
      const incomingKey = makeDedupeKey(job);
      const existing = current.find((item) => makeDedupeKey(item) === incomingKey);
      if (!existing) {
        setNotice('Job added and scored.');
        return [job, ...current];
      }
      selected = existing.id;
      setNotice('Duplicate lead updated and rescored.');
      return current.map((item) =>
        item.id === existing.id
          ? scoreJob(
              {
                ...job,
                id: existing.id,
                status: existing.status,
                notes: existing.notes,
                viewed: existing.viewed,
                createdAt: existing.createdAt,
                updatedAt: new Date().toISOString(),
              },
              settings
            )
          : item
      );
    });
    setSelectedJobId(selected);
  };

  const updateJob = (jobId: string, patch: Partial<JobRecord>) => {
    setJobs((current) =>
      current.map((job) => (job.id === jobId ? scoreJob({ ...job, ...patch, updatedAt: new Date().toISOString() }, settings) : job))
    );
  };

  const removeJob = (jobId: string) => {
    setJobs((current) => current.filter((job) => job.id !== jobId));
    if (selectedJobId === jobId) setSelectedJobId('');
  };

  const clearNotice = () => {
    if (notice) setNotice('');
  };

  const stats = useMemo(() => {
    const active = jobs.filter((job) => job.status !== 'Archived');
    return {
      total: jobs.length,
      newCount: jobs.filter((job) => job.status === 'New').length,
      closing: jobs.filter((job) => isClosingSoon(job)).length,
      inProgress: jobs.filter((job) => ['Shortlisted', 'Asked Question', 'Applied', 'Interview'].includes(job.status)).length,
      joshBest: active.filter((job) => job.profileTarget === 'josh').sort((a, b) => b.matchScore - a.matchScore).slice(0, 5),
      kristyBest: active.filter((job) => job.profileTarget === 'kristy').sort((a, b) => b.matchScore - a.matchScore).slice(0, 5),
      needsQuestion: active.filter((job) => job.fitLabel === 'Ask questions first'),
      followUps: active.filter((job) => isFollowUpDue(job)).sort((a, b) => b.matchScore - a.matchScore),
      recent: active.filter((job) => {
        const created = new Date(job.createdAt);
        return Date.now() - created.getTime() <= 1000 * 60 * 60 * 24;
      }),
    };
  }, [jobs]);

  return (
    <div className="min-h-screen bg-stone-50 text-slate-950">
      <header className="border-b border-slate-200 bg-white">
        <div className="mx-auto flex max-w-7xl flex-col gap-4 px-4 py-4 sm:px-6 lg:px-8">
          <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
            <div className="flex items-center gap-3">
              <div className="grid h-11 w-11 place-items-center rounded-lg border border-emerald-200 bg-emerald-50 text-emerald-700">
                <Radar className="h-6 w-6" aria-hidden="true" />
              </div>
              <div>
                <h1 className="text-2xl font-semibold tracking-normal text-slate-950">Dubbo Job Radar</h1>
                <p className="text-sm text-slate-600">Josh and Kristy Parris - Dubbo NSW - Local-first MVP</p>
              </div>
            </div>
            <div className="grid grid-cols-3 gap-2 text-center sm:flex">
              <Metric label="Leads" value={stats.total.toString()} />
              <Metric label="Closing" value={stats.closing.toString()} tone="amber" />
              <Metric label="Active" value={stats.inProgress.toString()} tone="sky" />
            </div>
          </div>
          <nav className="flex gap-2 overflow-x-auto pb-1">
            {navItems.map((item) => {
              const Icon = item.icon;
              const active = view === item.id;
              return (
                <button
                  key={item.id}
                  type="button"
                  onClick={() => {
                    setView(item.id);
                    clearNotice();
                  }}
                  className={`flex min-h-10 shrink-0 items-center gap-2 rounded-md border px-3 text-sm font-medium transition ${
                    active
                      ? 'border-emerald-600 bg-emerald-600 text-white'
                      : 'border-slate-200 bg-white text-slate-700 hover:border-slate-300 hover:bg-slate-50'
                  }`}
                >
                  <Icon className="h-4 w-4" aria-hidden="true" />
                  {item.label}
                </button>
              );
            })}
          </nav>
        </div>
      </header>

      <main className="mx-auto max-w-7xl px-4 py-5 sm:px-6 lg:px-8">
        {notice && (
          <div className="mb-4 flex items-center justify-between gap-3 rounded-md border border-emerald-200 bg-emerald-50 px-3 py-2 text-sm text-emerald-800">
            <span>{notice}</span>
            <button type="button" onClick={() => setNotice('')} className="rounded p-1 hover:bg-emerald-100" aria-label="Dismiss">
              <XCircle className="h-4 w-4" aria-hidden="true" />
            </button>
          </div>
        )}

        {view === 'dashboard' && (
          <Dashboard
            jobs={jobs}
            stats={stats}
            filters={filters}
            setFilters={setFilters}
            filteredJobs={filteredJobs}
            onStatus={updateJob}
            onSelect={(jobId) => {
              setSelectedJobId(jobId);
              setView('helper');
              updateJob(jobId, { viewed: true });
            }}
            onDelete={removeJob}
          />
        )}
        {view === 'inbox' && <InboxView settings={settings} upsertJob={upsertJob} />}
        {view === 'tracker' && <TrackerView jobs={jobs} updateJob={updateJob} onDelete={removeJob} onSelect={setSelectedJobId} />}
        {view === 'helper' && (
          <HelperView
            jobs={jobs}
            selectedJob={selectedJob}
            selectedJobId={selectedJob?.id ?? ''}
            setSelectedJobId={(jobId) => {
              setSelectedJobId(jobId);
              updateJob(jobId, { viewed: true });
            }}
            updateJob={updateJob}
          />
        )}
        {view === 'cashflow' && <CashflowView jobs={jobs} settings={settings} />}
        {view === 'settings' && (
          <SettingsView settings={settings} updateSettings={updateSettings} jobs={jobs} setJobs={setJobs} setNotice={setNotice} />
        )}
      </main>
    </div>
  );
}

function Metric({ label, value, tone = 'slate' }: { label: string; value: string; tone?: 'slate' | 'amber' | 'sky' }) {
  const classes = {
    slate: 'border-slate-200 bg-slate-50 text-slate-900',
    amber: 'border-amber-200 bg-amber-50 text-amber-900',
    sky: 'border-sky-200 bg-sky-50 text-sky-900',
  };
  return (
    <div className={`rounded-md border px-3 py-2 ${classes[tone]}`}>
      <div className="text-lg font-semibold leading-none">{value}</div>
      <div className="mt-1 text-xs">{label}</div>
    </div>
  );
}

function DailyBriefing({ jobs }: { jobs: JobRecord[] }) {
  const [copied, setCopied] = useState(false);
  const briefing = useMemo(() => makeDailyBriefing(jobs), [jobs]);
  const active = jobs.filter((job) => job.status !== 'Archived');
  const strongest = active.filter((job) => job.matchScore >= 82).length;
  const needsQuestion = active.filter((job) => job.fitLabel === 'Ask questions first').length;

  const copyBriefing = async () => {
    await navigator.clipboard?.writeText(briefing);
    setCopied(true);
    window.setTimeout(() => setCopied(false), 1800);
  };

  return (
    <section className="rounded-lg border border-slate-200 bg-white p-4">
      <div className="flex flex-col gap-3 lg:flex-row lg:items-center lg:justify-between">
        <div>
          <SectionTitle icon={ClipboardList} title="Morning Briefing" />
          <p className="mt-2 text-sm text-slate-600">
            {active.length} active leads, {strongest} strong fits, {needsQuestion} needing a question before applying.
          </p>
        </div>
        <div className="flex flex-wrap gap-2">
          <ActionButton icon={Copy} label={copied ? 'Copied' : 'Copy Briefing'} tone="slate" onClick={copyBriefing} />
          <ActionButton icon={Download} label="Download" tone="sky" onClick={() => downloadText(`dubbo-job-briefing-${todayIso()}.txt`, briefing)} />
        </div>
      </div>
      <pre className="mt-4 max-h-56 overflow-auto whitespace-pre-wrap rounded-md border border-slate-200 bg-slate-50 p-3 text-sm leading-6 text-slate-700">
        {briefing}
      </pre>
    </section>
  );
}

function Dashboard({
  jobs,
  stats,
  filters,
  setFilters,
  filteredJobs,
  onStatus,
  onSelect,
  onDelete,
}: {
  jobs: JobRecord[];
  stats: {
    joshBest: JobRecord[];
    kristyBest: JobRecord[];
    needsQuestion: JobRecord[];
    followUps: JobRecord[];
    recent: JobRecord[];
    closing: number;
    newCount: number;
  };
  filters: Filters;
  setFilters: (filters: Filters) => void;
  filteredJobs: JobRecord[];
  onStatus: (jobId: string, patch: Partial<JobRecord>) => void;
  onSelect: (jobId: string) => void;
  onDelete: (jobId: string) => void;
}) {
  return (
    <div className="space-y-6">
      <DailyBriefing jobs={jobs} />

      <section className="grid gap-4 lg:grid-cols-[1.2fr_0.8fr]">
        <div className="rounded-lg border border-slate-200 bg-white p-4">
          <div className="mb-4 flex items-center justify-between gap-3">
            <SectionTitle icon={BadgeCheck} title="Today's Best Josh Jobs" />
            <span className="text-sm text-slate-500">{stats.joshBest.length} matches</span>
          </div>
          <OpportunityList jobs={stats.joshBest} empty="No Josh leads imported yet." onStatus={onStatus} onSelect={onSelect} onDelete={onDelete} />
        </div>
        <div className="rounded-lg border border-slate-200 bg-white p-4">
          <div className="mb-4 flex items-center justify-between gap-3">
            <SectionTitle icon={HeartPulse} title="Today's Best Kristy Jobs" />
            <span className="text-sm text-slate-500">{stats.kristyBest.length} matches</span>
          </div>
          <OpportunityList jobs={stats.kristyBest} empty="No Kristy nursing leads imported yet." onStatus={onStatus} onSelect={onSelect} onDelete={onDelete} />
        </div>
      </section>

      <section className="grid gap-4 md:grid-cols-4">
        <SignalBox icon={CalendarClock} title="Urgent Closing Soon" value={stats.closing.toString()} tone="amber" />
        <SignalBox icon={Activity} title="New Since Yesterday" value={stats.recent.length.toString()} tone="sky" />
        <SignalBox icon={HelpCircle} title="Questions First" value={stats.needsQuestion.length.toString()} tone="rose" />
        <SignalBox icon={Mail} title="Follow Ups Due" value={stats.followUps.length.toString()} tone="violet" />
      </section>

      {stats.followUps.length > 0 && (
        <section className="rounded-lg border border-slate-200 bg-white p-4">
          <div className="mb-4 flex items-center justify-between gap-3">
            <SectionTitle icon={Mail} title="Follow-Up Queue" />
            <span className="text-sm text-slate-500">Use the Helper tab to copy a follow-up note</span>
          </div>
          <div className="space-y-3">
            {stats.followUps.slice(0, 5).map((job) => (
              <div key={job.id} className="rounded-md border border-slate-200 bg-slate-50 p-3">
                <div className="flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
                  <div>
                    <div className="font-medium text-slate-950">{job.title}</div>
                    <div className="text-sm text-slate-600">{job.employer} - {followUpReason(job)}</div>
                  </div>
                  <ActionButton icon={Mail} label="Open Helper" tone="slate" onClick={() => onSelect(job.id)} />
                </div>
              </div>
            ))}
          </div>
        </section>
      )}

      <section className="rounded-lg border border-slate-200 bg-white p-4">
        <div className="mb-4 flex flex-col gap-3 lg:flex-row lg:items-center lg:justify-between">
          <SectionTitle icon={Filter} title="Filtered Radar" />
          <FilterBar filters={filters} setFilters={setFilters} />
        </div>
        <OpportunityList jobs={filteredJobs} empty="No jobs match the active filters." onStatus={onStatus} onSelect={onSelect} onDelete={onDelete} />
      </section>
    </div>
  );
}

function SectionTitle({ icon: Icon, title }: { icon: LucideIcon; title: string }) {
  return (
    <div className="flex items-center gap-2">
      <Icon className="h-5 w-5 text-emerald-700" aria-hidden="true" />
      <h2 className="text-base font-semibold text-slate-950">{title}</h2>
    </div>
  );
}

function SignalBox({ icon: Icon, title, value, tone }: { icon: LucideIcon; title: string; value: string; tone: 'amber' | 'sky' | 'rose' | 'violet' }) {
  const classes = {
    amber: 'border-amber-200 bg-amber-50 text-amber-900',
    sky: 'border-sky-200 bg-sky-50 text-sky-900',
    rose: 'border-rose-200 bg-rose-50 text-rose-900',
    violet: 'border-violet-200 bg-violet-50 text-violet-900',
  };
  return (
    <div className={`flex items-center justify-between rounded-lg border p-4 ${classes[tone]}`}>
      <div>
        <div className="text-sm font-medium">{title}</div>
        <div className="mt-1 text-3xl font-semibold">{value}</div>
      </div>
      <Icon className="h-8 w-8 opacity-80" aria-hidden="true" />
    </div>
  );
}

function FilterBar({ filters, setFilters }: { filters: Filters; setFilters: (filters: Filters) => void }) {
  const toggle = (key: keyof Filters) => setFilters({ ...filters, [key]: !filters[key] });
  return (
    <div className="flex flex-wrap items-center gap-2">
      <select
        value={filters.target}
        onChange={(event) => setFilters({ ...filters, target: event.target.value as TargetFilter })}
        className="min-h-10 rounded-md border border-slate-300 bg-white px-3 text-sm"
        aria-label="Profile filter"
      >
        <option value="all">Josh + Kristy</option>
        <option value="josh">Josh</option>
        <option value="kristy">Kristy</option>
      </select>
      <FilterToggle label="80+" active={filters.scoreAbove80} onClick={() => toggle('scoreAbove80')} />
      <FilterToggle label="Thu/Fri" active={filters.thursdayFriday} onClick={() => toggle('thursdayFriday')} />
      <FilterToggle label="Not aged care" active={filters.notAgedCare} onClick={() => toggle('notAgedCare')} />
      <FilterToggle label="Day shift" active={filters.dayShiftOnly} onClick={() => toggle('dayShiftOnly')} />
      <FilterToggle label="Dubbo" active={filters.dubboOnly} onClick={() => toggle('dubboOnly')} />
      <FilterToggle label="Closing soon" active={filters.closingSoon} onClick={() => toggle('closingSoon')} />
      <FilterToggle label="Unviewed" active={filters.notViewed} onClick={() => toggle('notViewed')} />
    </div>
  );
}

function FilterToggle({ label, active, onClick }: { label: string; active: boolean; onClick: () => void }) {
  return (
    <button
      type="button"
      onClick={onClick}
      className={`min-h-10 rounded-md border px-3 text-sm font-medium ${
        active ? 'border-slate-900 bg-slate-900 text-white' : 'border-slate-300 bg-white text-slate-700 hover:bg-slate-50'
      }`}
    >
      {label}
    </button>
  );
}

function OpportunityList({
  jobs,
  empty,
  onStatus,
  onSelect,
  onDelete,
}: {
  jobs: JobRecord[];
  empty: string;
  onStatus: (jobId: string, patch: Partial<JobRecord>) => void;
  onSelect: (jobId: string) => void;
  onDelete: (jobId: string) => void;
}) {
  if (!jobs.length) {
    return (
      <div className="rounded-md border border-dashed border-slate-300 bg-slate-50 px-4 py-8 text-center text-sm text-slate-600">
        {empty}
      </div>
    );
  }
  return (
    <div className="space-y-3">
      {jobs.map((job) => (
        <JobCard key={job.id} job={job} onStatus={onStatus} onSelect={onSelect} onDelete={onDelete} />
      ))}
    </div>
  );
}

function JobCard({
  job,
  onStatus,
  onSelect,
  onDelete,
}: {
  job: JobRecord;
  onStatus: (jobId: string, patch: Partial<JobRecord>) => void;
  onSelect: (jobId: string) => void;
  onDelete?: (jobId: string) => void;
}) {
  const payEstimate = parsePayEstimate(job);
  const weekly = payEstimate.weekly;
  const confidence = confidenceSummary(job);
  return (
    <article className="rounded-lg border border-slate-200 bg-white p-4 shadow-sm">
      <div className="flex flex-col gap-3 lg:flex-row lg:items-start lg:justify-between">
        <div className="min-w-0">
          <div className="mb-2 flex flex-wrap items-center gap-2">
            <span className={`rounded-md border px-2 py-1 text-xs font-semibold ${targetStyles[job.profileTarget]}`}>
              {PROFILE_LABELS[job.profileTarget]}
            </span>
            <span className={`rounded-md border px-2 py-1 text-xs font-semibold ${fitStyles[job.fitLabel]}`}>{job.fitLabel}</span>
            <span className="rounded-md border border-slate-200 bg-slate-50 px-2 py-1 text-xs text-slate-600">{job.status}</span>
            {isClosingSoon(job) && <span className="rounded-md border border-amber-300 bg-amber-50 px-2 py-1 text-xs font-semibold text-amber-800">Closing soon</span>}
            {job.scoreBreakdown.agedCareViolation && (
              <span className="rounded-md border border-red-300 bg-red-50 px-2 py-1 text-xs font-semibold text-red-800">Aged care detected</span>
            )}
            <span className="rounded-md border border-slate-200 bg-slate-50 px-2 py-1 text-xs font-semibold text-slate-600">{confidence}</span>
          </div>
          <h3 className="truncate text-lg font-semibold text-slate-950">{job.title}</h3>
          <div className="mt-1 flex flex-wrap gap-x-4 gap-y-1 text-sm text-slate-600">
            <span className="inline-flex items-center gap-1">
              <Briefcase className="h-4 w-4" aria-hidden="true" />
              {job.employer}
            </span>
            <span className="inline-flex items-center gap-1">
              <MapPin className="h-4 w-4" aria-hidden="true" />
              {job.location}
            </span>
            <span className="inline-flex items-center gap-1">
              <CalendarClock className="h-4 w-4" aria-hidden="true" />
              {job.daysRequired || job.shiftPattern || job.workType || 'Roster unknown'}
            </span>
            <span className="inline-flex items-center gap-1">
              <DollarSign className="h-4 w-4" aria-hidden="true" />
              {job.payRate || job.salaryText || (weekly ? `$${weekly}/week est.` : 'Pay unknown')}
            </span>
          </div>
          {weekly && (
            <p className="mt-2 text-xs text-slate-500">Income estimate: ${weekly}/week using {payEstimate.assumption}.</p>
          )}
        </div>
        <div className="w-full shrink-0 lg:w-32">
          <div className="flex items-end justify-between">
            <span className="text-xs font-medium text-slate-500">Match</span>
            <span className="text-2xl font-semibold text-slate-950">{job.matchScore}</span>
          </div>
          <div className="mt-2 h-2 rounded-full bg-slate-200">
            <div className={`h-2 rounded-full ${scoreBarStyles(job.matchScore)}`} style={{ width: `${job.matchScore}%` }} />
          </div>
        </div>
      </div>

      <div className="mt-4 grid gap-3 md:grid-cols-3">
        <InfoLine label="Best reason" value={job.fitReason} />
        <InfoLine label="Biggest concern" value={job.biggestConcern} />
        <InfoLine label="Ask first" value={job.questionToAsk} />
      </div>

      <div className="mt-4 flex flex-wrap gap-2">
        <ActionButton icon={Send} label="Apply" onClick={() => onStatus(job.id, { status: 'Applied', viewed: true })} tone="green" />
        <ActionButton icon={HelpCircle} label="Ask First" onClick={() => onStatus(job.id, { status: 'Asked Question', viewed: true })} tone="amber" />
        <ActionButton icon={Save} label="Save" onClick={() => onStatus(job.id, { status: 'Shortlisted', viewed: true })} tone="sky" />
        <ActionButton icon={Mail} label="Drafts" onClick={() => onSelect(job.id)} tone="slate" />
        <ActionButton icon={Archive} label="Reject" onClick={() => onStatus(job.id, { status: 'Archived', viewed: true })} tone="rose" />
        {onDelete && (
          <button
            type="button"
            onClick={() => onDelete(job.id)}
            className="inline-flex min-h-10 items-center gap-2 rounded-md border border-slate-300 bg-white px-3 text-sm font-medium text-slate-700 hover:bg-slate-50"
          >
            <Trash2 className="h-4 w-4" aria-hidden="true" />
            Delete
          </button>
        )}
      </div>
    </article>
  );
}

function InfoLine({ label, value }: { label: string; value: string }) {
  return (
    <div className="rounded-md border border-slate-200 bg-slate-50 px-3 py-2">
      <div className="text-xs font-semibold uppercase text-slate-500">{label}</div>
      <div className="mt-1 text-sm text-slate-800">{value}</div>
    </div>
  );
}

function ActionButton({
  icon: Icon,
  label,
  onClick,
  tone,
}: {
  icon: LucideIcon;
  label: string;
  onClick: () => void;
  tone: 'green' | 'amber' | 'sky' | 'slate' | 'rose';
}) {
  const classes = {
    green: 'border-emerald-600 bg-emerald-600 text-white hover:bg-emerald-700',
    amber: 'border-amber-500 bg-amber-50 text-amber-900 hover:bg-amber-100',
    sky: 'border-sky-500 bg-sky-50 text-sky-900 hover:bg-sky-100',
    slate: 'border-slate-300 bg-white text-slate-800 hover:bg-slate-50',
    rose: 'border-rose-300 bg-rose-50 text-rose-800 hover:bg-rose-100',
  };
  return (
    <button type="button" onClick={onClick} className={`inline-flex min-h-10 items-center gap-2 rounded-md border px-3 text-sm font-medium ${classes[tone]}`}>
      <Icon className="h-4 w-4" aria-hidden="true" />
      {label}
    </button>
  );
}

function InboxView({ settings, upsertJob }: { settings: ProfileSettings; upsertJob: (job: JobRecord) => void }) {
  const [draft, setDraft] = useState<JobDraft>({ ...emptyDraft, postedDate: todayIso() });
  const [csv, setCsv] = useState('');
  const [csvTarget, setCsvTarget] = useState<ProfileTarget>('josh');
  const [importCount, setImportCount] = useState(0);
  const [adzunaQuery, setAdzunaQuery] = useState('ict support');
  const [adzunaLocation, setAdzunaLocation] = useState('Dubbo NSW');
  const [adzunaTarget, setAdzunaTarget] = useState<ProfileTarget>('josh');
  const [adzunaResults, setAdzunaResults] = useState<JobDraft[]>([]);
  const [adzunaStatus, setAdzunaStatus] = useState('Ready to search');
  const [refreshTarget, setRefreshTarget] = useState<RefreshTarget>('all');
  const [refreshResults, setRefreshResults] = useState<JobDraft[]>([]);
  const [refreshStatus, setRefreshStatus] = useState('Ready to run Vercel refresh pack');
  const [refreshDiagnostics, setRefreshDiagnostics] = useState<Array<{ query: string; profileTarget: ProfileTarget; status: string; count: number; error?: string }>>([]);
  const [integrationStatus, setIntegrationStatus] = useState('Integration status not checked yet');
  const [agencyLeads, setAgencyLeads] = useState<AgencyLead[]>(() => loadAgencyLeads());
  const [agencyDraft, setAgencyDraft] = useState<AgencyLead>({
    id: makeAgencyId(),
    agency: '',
    contact: '',
    phoneEmail: '',
    joshRelevance: '',
    kristyRelevance: '',
    lastContact: '',
    nextFollowUp: '',
    notes: '',
  });

  useEffect(() => {
    localStorage.setItem(AGENCY_LEADS_KEY, JSON.stringify(agencyLeads));
  }, [agencyLeads]);

  const updateDraft = (patch: Partial<JobDraft>) => setDraft((current) => ({ ...current, ...patch }));
  const updateAgencyDraft = (patch: Partial<AgencyLead>) => setAgencyDraft((current) => ({ ...current, ...patch }));

  const parse = () => {
    const parsed = parseJobText(draft.importedText || draft.description, draft.profileTarget);
    setDraft({ ...draft, ...parsed, source: draft.source, sourceDetail: draft.sourceDetail, profileTarget: draft.profileTarget });
  };

  const addDraft = () => {
    const job = createJobFromDraft(draft, settings);
    upsertJob(job);
    setDraft({ ...emptyDraft, profileTarget: draft.profileTarget, source: 'Manual paste', postedDate: todayIso() });
  };

  const importCsv = () => {
    const drafts = csvToDrafts(csv, csvTarget);
    drafts.forEach((item) => upsertJob(createJobFromDraft(item, settings)));
    setImportCount(drafts.length);
    setCsv('');
  };

  const searchAdzuna = async (nextQuery = adzunaQuery, nextTarget = adzunaTarget) => {
    setAdzunaQuery(nextQuery);
    setAdzunaTarget(nextTarget);
    setAdzunaStatus('Loading Adzuna results...');
    try {
      const results = await queryAdzunaJobs(nextQuery, adzunaLocation, nextTarget, settings.radiusKm);
      setAdzunaResults(results);
      setAdzunaStatus(`${results.length} results found`);
    } catch (error) {
      setAdzunaStatus(error instanceof Error ? error.message : 'Unable to fetch Adzuna results');
      setAdzunaResults([]);
    }
  };

  const importAdzuna = (draftItem: JobDraft) => {
    upsertJob(createJobFromDraft(draftItem, settings));
    setAdzunaStatus('Imported job from Adzuna');
  };

  const importAllAdzuna = () => {
    adzunaResults.forEach((draftItem) => upsertJob(createJobFromDraft(draftItem, settings)));
    setAdzunaStatus(`Imported ${adzunaResults.length} Adzuna leads`);
  };

  const runRefreshPack = async () => {
    setRefreshStatus('Running saved query refresh pack...');
    try {
      const response = await refreshJobPack(refreshTarget, adzunaLocation, settings.radiusKm);
      const jobs = response.jobs ?? [];
      setRefreshResults(jobs);
      setRefreshDiagnostics(response.resultsByQuery ?? []);
      setRefreshStatus(response.summary ?? `${jobs.length} leads returned from ${response.queryCount ?? 0} saved searches`);
    } catch (error) {
      setRefreshResults([]);
      setRefreshDiagnostics([]);
      setRefreshStatus(error instanceof Error ? error.message : 'Unable to run the refresh pack');
    }
  };

  const importRefreshPack = () => {
    refreshResults.forEach((draftItem) => upsertJob(createJobFromDraft(draftItem, settings)));
    setRefreshStatus(`Imported ${refreshResults.length} refresh-pack leads`);
  };

  const checkIntegrations = async () => {
    setIntegrationStatus('Checking Vercel environment variables...');
    try {
      const status = await checkJobIntegrations();
      setIntegrationStatus(
        status.adzunaConfigured
          ? 'Adzuna is configured on Vercel.'
          : `Adzuna is not fully configured. App ID: ${status.hasAppId ? 'yes' : 'no'}, App key: ${status.hasAppKey ? 'yes' : 'no'}.`
      );
    } catch (error) {
      setIntegrationStatus(error instanceof Error ? error.message : 'Unable to check integrations.');
    }
  };

  const addAgencyLead = () => {
    if (!agencyDraft.agency.trim()) return;
    setAgencyLeads((current) => [{ ...agencyDraft, id: makeAgencyId(agencyDraft.agency) }, ...current]);
    setAgencyDraft({ id: makeAgencyId(), agency: '', contact: '', phoneEmail: '', joshRelevance: '', kristyRelevance: '', lastContact: '', nextFollowUp: '', notes: '' });
  };

  const updateAgencyLead = (id: string, patch: Partial<AgencyLead>) => {
    setAgencyLeads((current) => current.map((lead) => (lead.id === id ? { ...lead, ...patch } : lead)));
  };

  const removeAgencyLead = (id: string) => {
    setAgencyLeads((current) => current.filter((lead) => lead.id !== id));
  };

  const quickQueries = searchQueries.filter((query) => query.profileTarget === adzunaTarget).slice(0, 8);

  return (
    <div className="grid gap-6 lg:grid-cols-[1fr_0.85fr]">
      <section className="rounded-lg border border-slate-200 bg-white p-4">
        <div className="mb-4 flex items-center justify-between gap-3">
          <SectionTitle icon={Inbox} title="Live Job Feed Inbox" />
          <span className="rounded-md border border-emerald-200 bg-emerald-50 px-2 py-1 text-xs font-semibold text-emerald-800">Local import</span>
        </div>
        <div className="mb-4 rounded-md border border-sky-200 bg-sky-50 p-3 text-sm text-sky-900">
          Manual paste and CSV imports save in this browser. Adzuna search and refresh packs are live when Vercel env vars are configured, but scheduled cron runs do not auto-save into your browser yet. True background updates need durable backend storage plus notifications.
        </div>
        <div className="grid gap-3">
          <label className="grid gap-1 text-sm font-medium text-slate-700">
            Profile
            <select
              value={draft.profileTarget}
              onChange={(event) => updateDraft({ profileTarget: event.target.value as ProfileTarget })}
              className="min-h-10 rounded-md border border-slate-300 px-3"
            >
              <option value="josh">Josh Job Radar</option>
              <option value="kristy">Kristy Nursing Radar</option>
            </select>
          </label>
          <label className="grid gap-1 text-sm font-medium text-slate-700">
            Job ad text
            <textarea
              value={draft.importedText}
              onChange={(event) => updateDraft({ importedText: event.target.value, description: event.target.value })}
              rows={8}
              className="resize-y rounded-md border border-slate-300 px-3 py-2 text-sm"
            />
          </label>
          <div className="flex flex-wrap gap-2">
            <ActionButton icon={Search} label="Parse & Score" tone="sky" onClick={parse} />
            <ActionButton icon={Plus} label="Add Lead" tone="green" onClick={addDraft} />
          </div>
        </div>

        <div className="mt-5 grid gap-3 sm:grid-cols-2">
          <TextInput label="Title" value={draft.title} onChange={(value) => updateDraft({ title: value })} />
          <TextInput label="Employer" value={draft.employer} onChange={(value) => updateDraft({ employer: value })} />
          <TextInput label="Location" value={draft.location} onChange={(value) => updateDraft({ location: value })} />
          <TextInput label="Work type" value={draft.workType} onChange={(value) => updateDraft({ workType: value })} />
          <TextInput label="Days required" value={draft.daysRequired} onChange={(value) => updateDraft({ daysRequired: value })} />
          <TextInput label="Shift pattern" value={draft.shiftPattern} onChange={(value) => updateDraft({ shiftPattern: value })} />
          <TextInput label="Pay" value={draft.payRate} onChange={(value) => updateDraft({ payRate: value, salaryText: value })} />
          <TextInput label="URL" value={draft.url} onChange={(value) => updateDraft({ url: value })} />
          <TextInput label="Posted date" type="date" value={draft.postedDate} onChange={(value) => updateDraft({ postedDate: value })} />
          <TextInput label="Closing date" type="date" value={draft.closingDate} onChange={(value) => updateDraft({ closingDate: value })} />
        </div>
      </section>

      <div className="space-y-6">
        <section className="rounded-lg border border-slate-200 bg-white p-4">
          <div className="mb-4 flex items-center justify-between gap-3">
            <SectionTitle icon={RefreshCw} title="Vercel Refresh Pack" />
            <span className="rounded-md border border-emerald-200 bg-emerald-50 px-2 py-1 text-xs font-semibold text-emerald-800">Batch search</span>
          </div>
          <div className="grid gap-3">
            <div className="rounded-md border border-slate-200 bg-slate-50 p-3">
              <div className="flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
                <p className="text-sm text-slate-700">{integrationStatus}</p>
                <button
                  type="button"
                  onClick={() => void checkIntegrations()}
                  className="inline-flex min-h-9 items-center justify-center gap-2 rounded-md border border-slate-300 bg-white px-3 text-sm font-medium text-slate-700 hover:bg-slate-50"
                >
                  <ShieldCheck className="h-4 w-4" aria-hidden="true" />
                  Check
                </button>
              </div>
            </div>
            <select
              value={refreshTarget}
              onChange={(event) => setRefreshTarget(event.target.value as RefreshTarget)}
              className="min-h-10 rounded-md border border-slate-300 px-3 text-sm"
              aria-label="Refresh target"
            >
              <option value="all">Josh + Kristy</option>
              <option value="josh">Josh only</option>
              <option value="kristy">Kristy only</option>
            </select>
            <p className="rounded-md border border-slate-200 bg-slate-50 px-3 py-2 text-sm text-slate-700">
              Runs a curated set of saved searches through the Vercel backend. Keys stay server-side.
            </p>
            <div className="flex flex-wrap gap-2">
              <ActionButton icon={RefreshCw} label="Run Pack" tone="green" onClick={() => void runRefreshPack()} />
              <ActionButton icon={Plus} label="Import Pack" tone="sky" onClick={importRefreshPack} />
            </div>
            <p className="rounded-md border border-slate-200 bg-slate-50 px-3 py-2 text-sm text-slate-700">{refreshStatus}</p>
          </div>
          {refreshDiagnostics.length > 0 && (
            <div className="mt-4 grid gap-2">
              <p className="text-xs font-semibold uppercase text-slate-500">Query diagnostics</p>
              {refreshDiagnostics.map((item) => (
                <div key={`${item.profileTarget}-${item.query}`} className="flex items-center justify-between gap-3 rounded-md border border-slate-200 bg-slate-50 px-3 py-2 text-xs">
                  <span className="min-w-0 truncate text-slate-700">
                    {PROFILE_LABELS[item.profileTarget]} - {item.query}
                  </span>
                  <span className={item.status === 'failed' ? 'font-semibold text-rose-700' : 'font-semibold text-slate-700'}>
                    {item.status === 'failed' ? item.error || 'failed' : `${item.count} found`}
                  </span>
                </div>
              ))}
            </div>
          )}
          {refreshResults.length > 0 && (
            <div className="mt-4 space-y-3">
              {refreshResults.slice(0, 8).map((result) => (
                <div key={`${result.profileTarget}-${result.title}-${result.employer}-${result.url}`} className="rounded-md border border-slate-200 bg-slate-50 p-3">
                  <div className="flex items-start justify-between gap-3">
                    <div className="min-w-0">
                      <div className="truncate font-medium text-slate-950">{result.title}</div>
                      <div className="text-sm text-slate-600">{PROFILE_LABELS[result.profileTarget]} - {result.employer || 'Unknown employer'}</div>
                      <div className="mt-1 text-xs text-slate-500">{result.location}</div>
                    </div>
                    <button
                      type="button"
                      onClick={() => upsertJob(createJobFromDraft(result, settings))}
                      className="shrink-0 rounded-md border border-emerald-600 bg-emerald-600 px-2 py-1 text-xs font-semibold text-white hover:bg-emerald-700"
                    >
                      Import
                    </button>
                  </div>
                </div>
              ))}
            </div>
          )}
        </section>

        <section className="rounded-lg border border-slate-200 bg-white p-4">
          <div className="mb-4 flex items-center justify-between gap-3">
            <SectionTitle icon={RefreshCw} title="Adzuna API Search" />
            <span className="rounded-md border border-sky-200 bg-sky-50 px-2 py-1 text-xs font-semibold text-sky-800">Vercel serverless</span>
          </div>
          <div className="grid gap-3">
            <select
              value={adzunaTarget}
              onChange={(event) => setAdzunaTarget(event.target.value as ProfileTarget)}
              className="min-h-10 rounded-md border border-slate-300 px-3 text-sm"
              aria-label="Adzuna profile target"
            >
              <option value="josh">Josh searches</option>
              <option value="kristy">Kristy searches</option>
            </select>
            <TextInput label="Search query" value={adzunaQuery} onChange={setAdzunaQuery} />
            <TextInput label="Location" value={adzunaLocation} onChange={setAdzunaLocation} />
            <p className="text-xs text-slate-500">
              Uses the Vercel serverless proxy only. Search radius: {settings.radiusKm} km.
            </p>
            <div className="flex flex-wrap gap-2">
              <ActionButton icon={Search} label="Search Adzuna" tone="green" onClick={() => void searchAdzuna()} />
              <ActionButton icon={Plus} label="Import All" tone="sky" onClick={importAllAdzuna} />
            </div>
            <p className="rounded-md border border-slate-200 bg-slate-50 px-3 py-2 text-sm text-slate-700">{adzunaStatus}</p>
          </div>

          <div className="mt-4">
            <p className="mb-2 text-xs font-semibold uppercase text-slate-500">Quick saved searches</p>
            <div className="flex flex-wrap gap-2">
              {quickQueries.map((query) => (
                <button
                  key={query.query}
                  type="button"
                  onClick={() => void searchAdzuna(query.query, query.profileTarget)}
                  className="rounded-md border border-slate-300 bg-white px-2 py-1 text-xs font-medium text-slate-700 hover:bg-slate-50"
                >
                  {query.query}
                </button>
              ))}
            </div>
          </div>

          <div className="mt-4 space-y-3">
            {adzunaResults.length === 0 && adzunaStatus !== 'Ready to search' && (
              <div className="rounded-md border border-dashed border-slate-300 bg-slate-50 px-4 py-6 text-center text-sm text-slate-600">
                No Adzuna leads are ready to import for this query yet.
              </div>
            )}
            {adzunaResults.map((result) => (
              <div key={`${result.title}-${result.employer}-${result.url}`} className="rounded-md border border-slate-200 bg-slate-50 p-3">
                <div className="flex items-start justify-between gap-3">
                  <div className="min-w-0">
                    <div className="truncate font-medium text-slate-950">{result.title}</div>
                    <div className="text-sm text-slate-600">{result.employer || 'Unknown employer'}</div>
                    <div className="mt-1 text-xs text-slate-500">{result.location}</div>
                  </div>
                  <button
                    type="button"
                    onClick={() => importAdzuna(result)}
                    className="shrink-0 rounded-md border border-emerald-600 bg-emerald-600 px-2 py-1 text-xs font-semibold text-white hover:bg-emerald-700"
                  >
                    Import
                  </button>
                </div>
              </div>
            ))}
          </div>
        </section>

        <section className="rounded-lg border border-slate-200 bg-white p-4">
          <div className="mb-4 flex items-center justify-between gap-3">
            <SectionTitle icon={Upload} title="CSV Import" />
            {importCount > 0 && <span className="text-sm text-emerald-700">{importCount} imported</span>}
          </div>
          <div className="grid gap-3">
            <select
              value={csvTarget}
              onChange={(event) => setCsvTarget(event.target.value as ProfileTarget)}
              className="min-h-10 rounded-md border border-slate-300 px-3 text-sm"
              aria-label="CSV fallback profile"
            >
              <option value="josh">Josh fallback</option>
              <option value="kristy">Kristy fallback</option>
            </select>
            <textarea value={csv} onChange={(event) => setCsv(event.target.value)} rows={8} className="resize-y rounded-md border border-slate-300 px-3 py-2 text-sm" />
            <ActionButton icon={Upload} label="Import CSV" tone="green" onClick={importCsv} />
          </div>
        </section>

        <section className="rounded-lg border border-slate-200 bg-white p-4">
          <div className="mb-4 flex items-center justify-between gap-3">
            <SectionTitle icon={Briefcase} title="Agency Leads" />
            <span className="rounded-md border border-slate-200 bg-slate-50 px-2 py-1 text-xs font-semibold text-slate-600">Local tracker</span>
          </div>
          <div className="grid gap-3">
            <TextInput label="Agency" value={agencyDraft.agency} onChange={(value) => updateAgencyDraft({ agency: value })} />
            <div className="grid gap-3 sm:grid-cols-2">
              <TextInput label="Contact person" value={agencyDraft.contact} onChange={(value) => updateAgencyDraft({ contact: value })} />
              <TextInput label="Phone/email" value={agencyDraft.phoneEmail} onChange={(value) => updateAgencyDraft({ phoneEmail: value })} />
              <TextInput label="Josh relevance" value={agencyDraft.joshRelevance} onChange={(value) => updateAgencyDraft({ joshRelevance: value })} />
              <TextInput label="Kristy relevance" value={agencyDraft.kristyRelevance} onChange={(value) => updateAgencyDraft({ kristyRelevance: value })} />
              <TextInput label="Last contact" type="date" value={agencyDraft.lastContact} onChange={(value) => updateAgencyDraft({ lastContact: value })} />
              <TextInput label="Next follow-up" type="date" value={agencyDraft.nextFollowUp} onChange={(value) => updateAgencyDraft({ nextFollowUp: value })} />
            </div>
            <label className="grid gap-1 text-sm font-medium text-slate-700">
              Notes
              <textarea value={agencyDraft.notes} onChange={(event) => updateAgencyDraft({ notes: event.target.value })} rows={3} className="resize-y rounded-md border border-slate-300 px-3 py-2 text-sm" />
            </label>
            <ActionButton icon={Plus} label="Add Agency Lead" tone="green" onClick={addAgencyLead} />
          </div>
          <div className="mt-4 space-y-3">
            {agencyLeads.map((lead) => (
              <div key={lead.id} className="rounded-md border border-slate-200 bg-slate-50 p-3">
                <div className="flex items-start justify-between gap-3">
                  <div className="min-w-0">
                    <div className="truncate font-semibold text-slate-950">{lead.agency}</div>
                    <div className="text-sm text-slate-600">{lead.contact || 'No contact yet'}{lead.phoneEmail ? ` - ${lead.phoneEmail}` : ''}</div>
                  </div>
                  <button type="button" onClick={() => removeAgencyLead(lead.id)} className="shrink-0 rounded-md border border-rose-300 bg-rose-50 px-2 py-1 text-xs font-semibold text-rose-800 hover:bg-rose-100">
                    Remove
                  </button>
                </div>
                <div className="mt-3 grid gap-2 sm:grid-cols-2">
                  <TextInput label="Contact person" value={lead.contact} onChange={(value) => updateAgencyLead(lead.id, { contact: value })} />
                  <TextInput label="Phone/email" value={lead.phoneEmail} onChange={(value) => updateAgencyLead(lead.id, { phoneEmail: value })} />
                  <TextInput label="Josh relevance" value={lead.joshRelevance} onChange={(value) => updateAgencyLead(lead.id, { joshRelevance: value })} />
                  <TextInput label="Kristy relevance" value={lead.kristyRelevance} onChange={(value) => updateAgencyLead(lead.id, { kristyRelevance: value })} />
                  <TextInput label="Last contact" type="date" value={lead.lastContact} onChange={(value) => updateAgencyLead(lead.id, { lastContact: value })} />
                  <TextInput label="Next follow-up" type="date" value={lead.nextFollowUp} onChange={(value) => updateAgencyLead(lead.id, { nextFollowUp: value })} />
                </div>
                <label className="mt-2 grid gap-1 text-sm font-medium text-slate-700">
                  Notes
                  <textarea value={lead.notes} onChange={(event) => updateAgencyLead(lead.id, { notes: event.target.value })} rows={2} className="resize-y rounded-md border border-slate-300 px-3 py-2 text-sm" />
                </label>
              </div>
            ))}
          </div>
        </section>

        <section className="rounded-lg border border-slate-200 bg-white p-4">
          <SectionTitle icon={SlidersHorizontal} title="Feed Architecture" />
          <div className="mt-4 space-y-3">
            {sourcePipeline.map((source) => (
              <div key={source.name} className="rounded-md border border-slate-200 bg-slate-50 p-3">
                <div className="flex items-center justify-between gap-3">
                  <span className="font-medium text-slate-900">{source.name}</span>
                  <span className="rounded-md border border-slate-300 bg-white px-2 py-1 text-xs text-slate-700">{source.status}</span>
                </div>
                <p className="mt-1 text-sm text-slate-600">{source.detail}</p>
              </div>
            ))}
          </div>
        </section>
      </div>
    </div>
  );
}

function TextInput({
  label,
  value,
  onChange,
  type = 'text',
}: {
  label: string;
  value: string;
  onChange: (value: string) => void;
  type?: string;
}) {
  return (
    <label className="grid gap-1 text-sm font-medium text-slate-700">
      {label}
      <input value={value} onChange={(event) => onChange(event.target.value)} type={type} className="min-h-10 rounded-md border border-slate-300 px-3 text-sm" />
    </label>
  );
}

function TrackerView({
  jobs,
  updateJob,
  onDelete,
  onSelect,
}: {
  jobs: JobRecord[];
  updateJob: (jobId: string, patch: Partial<JobRecord>) => void;
  onDelete: (jobId: string) => void;
  onSelect: (jobId: string) => void;
}) {
  const grouped = statusOrder.map((status) => ({ status, jobs: jobs.filter((job) => job.status === status) }));
  return (
    <div className="space-y-4">
      <section className="rounded-lg border border-slate-200 bg-white p-4">
        <SectionTitle icon={ClipboardList} title="Application Tracker" />
        <div className="mt-4 grid gap-3 md:grid-cols-4">
          {grouped.slice(0, 4).map((group) => (
            <div key={group.status} className="rounded-md border border-slate-200 bg-slate-50 p-3">
              <div className="flex items-center justify-between">
                <span className="text-sm font-semibold text-slate-800">{group.status}</span>
                <span className="text-sm text-slate-500">{group.jobs.length}</span>
              </div>
            </div>
          ))}
        </div>
      </section>

      <section className="overflow-hidden rounded-lg border border-slate-200 bg-white">
        <div className="overflow-x-auto">
          <table className="min-w-full divide-y divide-slate-200 text-sm">
            <thead className="bg-slate-50 text-left text-xs uppercase text-slate-500">
              <tr>
                <th className="px-3 py-3">Job</th>
                <th className="px-3 py-3">Profile</th>
                <th className="px-3 py-3">Score</th>
                <th className="px-3 py-3">Status</th>
                <th className="px-3 py-3">Closing</th>
                <th className="px-3 py-3">Notes</th>
                <th className="px-3 py-3">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {jobs.map((job) => (
                <tr key={job.id} className="align-top">
                  <td className="px-3 py-3">
                    <div className="font-medium text-slate-950">{job.title}</div>
                    <div className="text-slate-500">{job.employer}</div>
                  </td>
                  <td className="px-3 py-3">{PROFILE_LABELS[job.profileTarget]}</td>
                  <td className="px-3 py-3 font-semibold">{job.matchScore}</td>
                  <td className="px-3 py-3">
                    <select
                      value={job.status}
                      onChange={(event) => updateJob(job.id, { status: event.target.value as JobStatus })}
                      className="min-h-10 rounded-md border border-slate-300 bg-white px-2"
                    >
                      {JOB_STATUSES.map((status) => (
                        <option key={status} value={status}>
                          {status}
                        </option>
                      ))}
                    </select>
                  </td>
                  <td className="px-3 py-3">{formatDate(job.closingDate)}</td>
                  <td className="px-3 py-3">
                    <textarea
                      value={job.notes}
                      onChange={(event) => updateJob(job.id, { notes: event.target.value })}
                      rows={2}
                      className="w-64 resize-y rounded-md border border-slate-300 px-2 py-1"
                    />
                  </td>
                  <td className="px-3 py-3">
                    <div className="flex gap-2">
                      <button type="button" onClick={() => onSelect(job.id)} className="rounded-md border border-slate-300 p-2 hover:bg-slate-50" aria-label="Select job">
                        <FileText className="h-4 w-4" aria-hidden="true" />
                      </button>
                      <button type="button" onClick={() => onDelete(job.id)} className="rounded-md border border-rose-300 p-2 text-rose-700 hover:bg-rose-50" aria-label="Delete job">
                        <Trash2 className="h-4 w-4" aria-hidden="true" />
                      </button>
                    </div>
                  </td>
                </tr>
              ))}
              {!jobs.length && (
                <tr>
                  <td colSpan={7} className="px-3 py-8 text-center text-slate-500">
                    No application records yet.
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </section>
    </div>
  );
}

function HelperView({
  jobs,
  selectedJob,
  selectedJobId,
  setSelectedJobId,
  updateJob,
}: {
  jobs: JobRecord[];
  selectedJob?: JobRecord;
  selectedJobId: string;
  setSelectedJobId: (jobId: string) => void;
  updateJob: (jobId: string, patch: Partial<JobRecord>) => void;
}) {
  const [copied, setCopied] = useState('');
  const drafts = selectedJob ? makeApplicationDrafts(selectedJob) : undefined;

  const copy = async (label: string, value: string) => {
    await navigator.clipboard?.writeText(value);
    setCopied(label);
    window.setTimeout(() => setCopied(''), 1800);
  };

  if (!selectedJob || !drafts) {
    return (
      <section className="rounded-lg border border-slate-200 bg-white p-8 text-center text-slate-600">
        No selected job.
      </section>
    );
  }

  return (
    <div className="grid gap-6 lg:grid-cols-[0.8fr_1.2fr]">
      <section className="rounded-lg border border-slate-200 bg-white p-4">
        <div className="mb-4 flex items-center justify-between gap-3">
          <SectionTitle icon={Mail} title="Application Helper" />
          {copied && <span className="text-sm text-emerald-700">{copied} copied</span>}
        </div>
        <select
          value={selectedJobId}
          onChange={(event) => setSelectedJobId(event.target.value)}
          className="mb-4 min-h-10 w-full rounded-md border border-slate-300 px-3 text-sm"
          aria-label="Selected job"
        >
          {jobs.map((job) => (
            <option key={job.id} value={job.id}>
              {PROFILE_LABELS[job.profileTarget]} - {job.title} - {job.matchScore}
            </option>
          ))}
        </select>

        <JobCard job={selectedJob} onStatus={updateJob} onSelect={() => undefined} />
      </section>

      <section className="space-y-4">
        <DraftPanel title="Short Enquiry Email" value={drafts.enquiryEmail} onCopy={() => copy('Enquiry email', drafts.enquiryEmail)} />
        <DraftPanel title="Application Email" value={drafts.applicationEmail} onCopy={() => copy('Application email', drafts.applicationEmail)} />
        <DraftPanel title="Follow-Up Message" value={makeFollowUpMessage(selectedJob)} onCopy={() => copy('Follow-up message', makeFollowUpMessage(selectedJob))} />
        <ChecklistPanel title="Resume Bullet Alignment" items={drafts.resumeAlignment} />
        <ChecklistPanel title="Interview Prep Notes" items={drafts.interviewPrep} />
        <ChecklistPanel title="Questions Before Accepting" items={drafts.acceptanceQuestions} />
        <ScorePanel job={selectedJob} />
      </section>
    </div>
  );
}

function DraftPanel({ title, value, onCopy }: { title: string; value: string; onCopy: () => void }) {
  return (
    <div className="rounded-lg border border-slate-200 bg-white p-4">
      <div className="mb-3 flex items-center justify-between gap-3">
        <h3 className="font-semibold text-slate-950">{title}</h3>
        <button type="button" onClick={onCopy} className="inline-flex min-h-9 items-center gap-2 rounded-md border border-slate-300 px-3 text-sm hover:bg-slate-50">
          <Copy className="h-4 w-4" aria-hidden="true" />
          Copy
        </button>
      </div>
      <pre className="whitespace-pre-wrap rounded-md border border-slate-200 bg-slate-50 p-3 text-sm leading-6 text-slate-800">{value}</pre>
    </div>
  );
}

function ChecklistPanel({ title, items }: { title: string; items: string[] }) {
  return (
    <div className="rounded-lg border border-slate-200 bg-white p-4">
      <h3 className="font-semibold text-slate-950">{title}</h3>
      <ul className="mt-3 space-y-2">
        {items.map((item) => (
          <li key={item} className="flex gap-2 text-sm text-slate-700">
            <CheckCircle2 className="mt-0.5 h-4 w-4 shrink-0 text-emerald-600" aria-hidden="true" />
            <span>{item}</span>
          </li>
        ))}
      </ul>
    </div>
  );
}

function ScorePanel({ job }: { job: JobRecord }) {
  return (
    <div className="rounded-lg border border-slate-200 bg-white p-4">
      <SectionTitle icon={ShieldCheck} title="Job Match Scoring Engine" />
      <div className="mt-4 space-y-3">
        {job.scoreBreakdown.factors.map((factorItem) => {
          const width = `${Math.max(0, Math.min(100, (factorItem.score / factorItem.max) * 100))}%`;
          return (
            <div key={factorItem.key} className="rounded-md border border-slate-200 bg-slate-50 p-3">
              <div className="flex items-center justify-between gap-3">
                <span className="text-sm font-semibold text-slate-800">{factorItem.label}</span>
                <span className="text-sm font-semibold text-slate-950">
                  {factorItem.score}/{factorItem.max}
                </span>
              </div>
              <div className="mt-2 h-2 rounded-full bg-slate-200">
                <div className={`h-2 rounded-full ${factorItem.score < 0 ? 'bg-red-600' : 'bg-emerald-600'}`} style={{ width }} />
              </div>
              <p className="mt-2 text-sm text-slate-600">{factorItem.note}</p>
            </div>
          );
        })}
      </div>
    </div>
  );
}

function CashflowView({ jobs, settings }: { jobs: JobRecord[]; settings: ProfileSettings }) {
  const activeJosh = jobs.filter((job) => job.profileTarget === 'josh' && ['Shortlisted', 'Asked Question', 'Applied', 'Interview', 'Accepted'].includes(job.status));
  const estimates = activeJosh.map((job) => ({ job, weekly: estimateWeeklyIncome(job) ?? 0 }));
  const bestEstimate = estimates.reduce((sum, item) => sum + item.weekly, 0);
  const gap = settings.joshWeeklyIncomeTarget - bestEstimate;
  const bestJosh = jobs.filter((job) => job.profileTarget === 'josh').sort((a, b) => b.matchScore - a.matchScore)[0];

  return (
    <div className="grid gap-6 lg:grid-cols-[0.8fr_1.2fr]">
      <section className="rounded-lg border border-slate-200 bg-white p-4">
        <SectionTitle icon={DollarSign} title="Weekly Cashflow Comparison" />
        <div className="mt-5 grid gap-3">
          <CashMetric label="Target replacement" value={`$${settings.joshWeeklyIncomeTarget}`} />
          <CashMetric label="Active estimate" value={`$${bestEstimate}`} tone={bestEstimate >= settings.joshWeeklyIncomeTarget ? 'green' : 'amber'} />
          <CashMetric label={gap > 0 ? 'Remaining gap' : 'Buffer'} value={`$${Math.abs(gap)}`} tone={gap > 0 ? 'rose' : 'green'} />
        </div>
        {bestJosh && (
          <div className="mt-4 rounded-md border border-slate-200 bg-slate-50 p-3 text-sm text-slate-700">
            Best current Josh lead: <span className="font-semibold text-slate-950">{bestJosh.title}</span> at {bestJosh.matchScore}/100.
          </div>
        )}
      </section>

      <section className="rounded-lg border border-slate-200 bg-white p-4">
        <SectionTitle icon={Briefcase} title="Active Josh Opportunities" />
        <div className="mt-4 space-y-3">
          {estimates.map(({ job, weekly }) => (
            <div key={job.id} className="rounded-md border border-slate-200 bg-slate-50 p-3">
              <div className="flex flex-wrap items-center justify-between gap-2">
                <div>
                  <div className="font-medium text-slate-950">{job.title}</div>
                  <div className="text-sm text-slate-600">{job.employer}</div>
                </div>
                <span className="text-lg font-semibold text-slate-950">${weekly}/week</span>
              </div>
            </div>
          ))}
          {!estimates.length && <div className="rounded-md border border-dashed border-slate-300 bg-slate-50 px-4 py-8 text-center text-sm text-slate-600">No active Josh opportunities yet.</div>}
        </div>
      </section>
    </div>
  );
}

function CashMetric({ label, value, tone = 'slate' }: { label: string; value: string; tone?: 'slate' | 'green' | 'amber' | 'rose' }) {
  const classes = {
    slate: 'border-slate-200 bg-slate-50 text-slate-900',
    green: 'border-emerald-200 bg-emerald-50 text-emerald-900',
    amber: 'border-amber-200 bg-amber-50 text-amber-900',
    rose: 'border-rose-200 bg-rose-50 text-rose-900',
  };
  return (
    <div className={`rounded-md border p-4 ${classes[tone]}`}>
      <div className="text-sm font-medium">{label}</div>
      <div className="mt-1 text-3xl font-semibold">{value}</div>
    </div>
  );
}

function SettingsView({
  settings,
  updateSettings,
  jobs,
  setJobs,
  setNotice,
}: {
  settings: ProfileSettings;
  updateSettings: (patch: Partial<ProfileSettings>) => void;
  jobs: JobRecord[];
  setJobs: (jobs: JobRecord[]) => void;
  setNotice: (notice: string) => void;
}) {
  const exportData = () => {
    downloadText(`dubbo-job-radar-${todayIso()}.json`, JSON.stringify({ settings, jobs }, null, 2), 'application/json');
  };

  const exportCsv = () => {
    downloadText(`dubbo-job-radar-${todayIso()}.csv`, jobsToCsv(jobs), 'text/csv');
  };

  const exportEvidence = () => {
    downloadText(`dubbo-job-evidence-pack-${todayIso()}.md`, makeEvidencePack(jobs, settings), 'text/markdown');
  };

  const clearArchived = () => {
    setJobs(jobs.filter((job) => job.status !== 'Archived'));
    setNotice('Archived jobs removed.');
  };

  return (
    <div className="grid gap-6 lg:grid-cols-[0.85fr_1.15fr]">
      <section className="rounded-lg border border-slate-200 bg-white p-4">
        <SectionTitle icon={Settings} title="Settings/Profile Context" />
        <div className="mt-4 grid gap-4">
          <label className="grid gap-1 text-sm font-medium text-slate-700">
            Search radius
            <input
              type="number"
              value={settings.radiusKm}
              onChange={(event) => updateSettings({ radiusKm: Number(event.target.value) })}
              className="min-h-10 rounded-md border border-slate-300 px-3"
            />
          </label>
          <label className="grid gap-1 text-sm font-medium text-slate-700">
            Josh weekly income target
            <input
              type="number"
              value={settings.joshWeeklyIncomeTarget}
              onChange={(event) => updateSettings({ joshWeeklyIncomeTarget: Number(event.target.value) })}
              className="min-h-10 rounded-md border border-slate-300 px-3"
            />
          </label>
          <ToggleRow
            label="Josh emergency cashflow mode"
            checked={settings.joshEmergencyCashflow}
            onChange={(checked) => updateSettings({ joshEmergencyCashflow: checked })}
          />
          <ToggleRow
            label="Josh approved afternoon shifts"
            checked={settings.joshApprovedAfternoonShift}
            onChange={(checked) => updateSettings({ joshApprovedAfternoonShift: checked })}
          />
          <ToggleRow
            label="Kristy aged-care override"
            checked={settings.kristyAllowAgedCareOverride}
            onChange={(checked) => updateSettings({ kristyAllowAgedCareOverride: checked })}
          />
        </div>
        <div className="mt-5 flex flex-wrap gap-2">
          <ActionButton icon={FileText} label="Export Data" tone="sky" onClick={exportData} />
          <ActionButton icon={Download} label="Export CSV" tone="slate" onClick={exportCsv} />
          <ActionButton icon={ClipboardList} label="Evidence Pack" tone="green" onClick={exportEvidence} />
          <ActionButton icon={Archive} label="Clear Archived" tone="rose" onClick={clearArchived} />
        </div>
      </section>

      <section className="rounded-lg border border-slate-200 bg-white p-4">
        <SectionTitle icon={UserRound} title="Profile Rules" />
        <div className="mt-4 grid gap-4 md:grid-cols-2">
          <RuleBlock title="Josh Strengths" items={joshStrengths} />
          <RuleBlock title="Josh Resume Evidence" items={joshResumeEvidence} />
          <RuleBlock title="Josh Good Categories" items={joshGoodCategories} />
          <RuleBlock title="Josh Penalised" items={joshAvoid} tone="rose" />
          <RuleBlock title="Kristy Preferred" items={kristyPreferred} />
          <RuleBlock title="Kristy Resume Evidence" items={kristyResumeEvidence} />
          <RuleBlock title="Kristy Exclusions" items={kristyAvoid} tone="rose" />
        </div>
      </section>

      <section className="rounded-lg border border-slate-200 bg-white p-4 lg:col-span-2">
        <SectionTitle icon={Search} title="Saved Search Query Pack" />
        <div className="mt-4 grid gap-3 md:grid-cols-2">
          {searchQueries.map((query) => (
            <div key={`${query.profileTarget}-${query.query}`} className="flex items-center justify-between gap-3 rounded-md border border-slate-200 bg-slate-50 p-3">
              <div>
                <div className="font-medium text-slate-950">{query.query}</div>
                <div className="text-sm text-slate-600">
                  {PROFILE_LABELS[query.profileTarget]} - {query.priority}
                </div>
              </div>
              <span className={`rounded-md border px-2 py-1 text-xs font-semibold ${targetStyles[query.profileTarget]}`}>{PROFILE_LABELS[query.profileTarget]}</span>
            </div>
          ))}
        </div>
      </section>
    </div>
  );
}

function ToggleRow({ label, checked, onChange }: { label: string; checked: boolean; onChange: (checked: boolean) => void }) {
  return (
    <label className="flex items-center justify-between gap-3 rounded-md border border-slate-200 bg-slate-50 px-3 py-2 text-sm font-medium text-slate-700">
      <span>{label}</span>
      <input type="checkbox" checked={checked} onChange={(event) => onChange(event.target.checked)} className="h-5 w-5 rounded border-slate-300 text-emerald-600" />
    </label>
  );
}

function RuleBlock({ title, items, tone = 'green' }: { title: string; items: string[]; tone?: 'green' | 'rose' }) {
  return (
    <div className="rounded-md border border-slate-200 bg-slate-50 p-3">
      <h3 className="font-semibold text-slate-950">{title}</h3>
      <ul className="mt-3 space-y-2">
        {items.map((item) => (
          <li key={item} className="flex gap-2 text-sm text-slate-700">
            {tone === 'green' ? (
              <CheckCircle2 className="mt-0.5 h-4 w-4 shrink-0 text-emerald-600" aria-hidden="true" />
            ) : (
              <AlertTriangle className="mt-0.5 h-4 w-4 shrink-0 text-rose-600" aria-hidden="true" />
            )}
            <span>{item}</span>
          </li>
        ))}
      </ul>
    </div>
  );
}

export default App;
