import {
  ApplicationDrafts,
  JobDraft,
  JobFitLabel,
  JobRecord,
  ProfileSettings,
  ProfileTarget,
  ScoreBreakdown,
  ScoreFactor,
} from '../types';

export const defaultSettings: ProfileSettings = {
  radiusKm: 25,
  joshWeeklyIncomeTarget: 500,
  joshEmergencyCashflow: false,
  joshApprovedAfternoonShift: false,
  kristyAllowAgedCareOverride: false,
};

export const emptyDraft: JobDraft = {
  profileTarget: 'josh',
  source: 'Manual paste',
  sourceDetail: '',
  title: '',
  employer: '',
  location: 'Dubbo NSW',
  workType: '',
  hours: '',
  daysRequired: '',
  shiftPattern: '',
  payRate: '',
  salaryText: '',
  url: '',
  postedDate: '',
  closingDate: '',
  description: '',
  requirements: '',
  importedText: '',
};

const dayNames = ['monday', 'tuesday', 'wednesday', 'thursday', 'friday', 'saturday', 'sunday'];
const agedCareKeywords = [
  'aged care',
  'residential aged care',
  'nursing home',
  'elderly care',
  'dementia unit',
  'racf',
  'care home',
];

const lower = (value: string) => value.toLowerCase();
const compact = (value: string) => value.trim().replace(/\s+/g, ' ');
const hasAny = (text: string, keywords: string[]) => keywords.some((keyword) => lower(text).includes(lower(keyword)));

const getText = (job: Pick<JobRecord, 'title' | 'description' | 'requirements' | 'workType' | 'hours' | 'daysRequired' | 'shiftPattern' | 'salaryText' | 'payRate' | 'location'>) =>
  [
    job.title,
    job.description,
    job.requirements,
    job.workType,
    job.hours,
    job.daysRequired,
    job.shiftPattern,
    job.salaryText,
    job.payRate,
    job.location,
  ].join(' ');

export function makeId(prefix = 'job'): string {
  return `${prefix}-${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 8)}`;
}

export function normaliseKey(value: string): string {
  return lower(value)
    .replace(/https?:\/\/(www\.)?/, '')
    .replace(/[^a-z0-9]+/g, ' ')
    .trim();
}

export function makeDedupeKey(job: Pick<JobRecord, 'title' | 'employer' | 'location' | 'url' | 'postedDate'>): string {
  if (job.url.trim()) {
    return normaliseKey(job.url);
  }
  return normaliseKey([job.title, job.employer, job.location, job.postedDate].join('|'));
}

export function isClosingSoon(job: JobRecord, today = new Date()): boolean {
  if (!job.closingDate) return false;
  const closing = new Date(`${job.closingDate}T23:59:59`);
  if (Number.isNaN(closing.getTime())) return false;
  const diffDays = (closing.getTime() - today.getTime()) / (1000 * 60 * 60 * 24);
  return diffDays >= 0 && diffDays <= 3;
}

export function detectAgedCare(text: string): boolean {
  return hasAny(text, agedCareKeywords);
}

export function detectNursingType(text: string): string {
  if (hasAny(text, ['paediatric', 'pediatric', 'children', "children's ward", 'child and adolescent'])) return 'Paediatric / child health';
  if (hasAny(text, ['practice nurse', 'gp nurse', 'medical centre nurse'])) return 'GP / practice nurse';
  if (hasAny(text, ['immunisation', 'vaccination'])) return 'Immunisation';
  if (hasAny(text, ['child and family', 'maternal', 'family health', 'early parenting'])) return 'Child and family health';
  if (hasAny(text, ['community nurse', 'community health', 'primary health'])) return 'Community health';
  if (hasAny(text, ['school nurse'])) return 'School nursing';
  if (hasAny(text, ['outpatients', 'clinic', 'hospital casual', 'short stay', 'nsw health'])) return 'Clinic / hospital';
  if (hasAny(text, ['rehabilitation', 'rehab nurse'])) return 'Rehabilitation';
  if (hasAny(text, ['registered nurse', ' rn ', 'registered nurse/rn'])) return 'General RN';
  return '';
}

export function estimateWeeklyIncome(job: Pick<JobRecord, 'payRate' | 'salaryText' | 'description' | 'hours' | 'profileTarget'>): number | null {
  const text = [job.payRate, job.salaryText, job.description, job.hours].join(' ');
  const hourlyMatch = text.match(/\$?\s*(\d{2,3})(?:\.\d{1,2})?\s*(?:per\s*hour|\/\s*hour|p\/h|ph|\/hr|hr|hourly)/i);
  const weeklyMatch = text.match(/\$?\s*(\d{3,4})(?:\.\d{1,2})?\s*(?:per\s*week|\/\s*week|weekly)/i);
  const explicitHours = text.match(/(\d{1,2})(?:\.\d)?\s*(?:hours|hrs|hr)\s*(?:per\s*week|weekly|p\/w|pw)?/i);

  if (weeklyMatch) {
    return Number(weeklyMatch[1]);
  }

  if (hourlyMatch) {
    const hourly = Number(hourlyMatch[1]);
    const fallbackHours = job.profileTarget === 'josh' ? 15 : 16;
    const hours = explicitHours ? Number(explicitHours[1]) : fallbackHours;
    return Math.round(hourly * hours);
  }

  if (hasAny(text, ['$500', '$550', '$600', '$650', '$700', '$800', '$900'])) return 500;
  if (hasAny(text, ['$400', '$450'])) return 400;
  if (hasAny(text, ['$250', '$300', '$350'])) return 300;
  return null;
}

function factor(key: string, label: string, score: number, max: number, note: string): ScoreFactor {
  return { key, label, score, max, note };
}

function clampScore(value: number): number {
  return Math.max(0, Math.min(100, Math.round(value)));
}

function labelFromScore(score: number, forcedAvoid: boolean, needsQuestions: boolean): JobFitLabel {
  if (forcedAvoid) return 'Avoid';
  if (score >= 82 && !needsQuestions) return 'Apply now';
  if (score >= 66) return 'Ask questions first';
  if (score >= 50) return 'Maybe';
  if (score >= 30) return 'Poor fit';
  return 'Avoid';
}

function joshAvailability(job: JobRecord): ScoreFactor {
  const text = lower(getText(job));
  const requiresMonWed =
    hasAny(text, ['monday to friday', 'mon-fri', 'monday-friday', 'weekday roster']) ||
    hasAny(text, ['monday required', 'wednesday required', 'available mondays', 'available wednesdays']);
  const fullAvailability = hasAny(text, ['full availability', 'open availability', 'seven day roster', '7 day roster', 'any day', 'anytime']);

  if (requiresMonWed) {
    return factor('availability', 'Availability fit', 0, 25, 'Likely conflicts with Monday/Wednesday Avance IT work.');
  }
  if (fullAvailability) {
    return factor('availability', 'Availability fit', -15, 25, 'Requires broad open availability, which risks crowding out existing work and family load.');
  }
  if (hasAny(text, ['thursday', 'friday', 'thu', 'fri', '2 days per week', 'two days per week', '2 days a week'])) {
    return factor('availability', 'Availability fit', 25, 25, 'Clear Thursday/Friday or two-day availability fit.');
  }
  if (hasAny(text, ['part-time', 'part time', 'casual', 'temporary', 'contract', 'flexible', 'school hours'])) {
    return factor('availability', 'Availability fit', 18, 25, 'Part-time or casual wording suggests room to negotiate Thursday/Friday.');
  }
  return factor('availability', 'Availability fit', 10, 25, 'Roster is not clear enough yet.');
}

function joshRole(job: JobRecord): ScoreFactor {
  const text = lower(getText(job));
  if (
    hasAny(text, [
      'ict support',
      'it support',
      'helpdesk',
      'help desk',
      'service desk',
      'desktop support',
      'msp',
      'school ict',
      'technology support',
      'technical support',
      'microsoft 365',
      'office 365',
      'google workspace',
      'google suite',
      'active directory',
      'password reset',
      'device setup',
      'device deployment',
      'reimaging',
      'jira',
      'digital literacy',
      'workplace trainer',
      'trainer assessor',
      'classroom tech',
      'viewboard',
      'av technician',
    ])
  ) {
    return factor('role', 'Role fit', 20, 20, 'Strong match for ICT, school technology, support, or training strengths.');
  }
  if (
    hasAny(text, [
      'administration officer',
      'admin officer',
      'admin assistant',
      'customer service',
      'customer care',
      'client services',
      'student services',
      'student support',
      'education administration',
      'admissions',
      'enrolment',
      'records officer',
      'scheduling officer',
      'timetabling',
      'exams officer',
      'special consideration',
      'school support',
      'library assistant',
      'library services',
      'data entry',
    ])
  ) {
    return factor('role', 'Role fit', 16, 20, 'Good fit for education admin, student services, school support, library, or customer-facing systems work.');
  }
  if (hasAny(text, ['operations assistant', 'operations support', 'coordinator', 'systems', 'documentation', 'compliance', 'risk', 'whs', 'stakeholder'])) {
    return factor('role', 'Role fit', 12, 20, 'Uses organisation, stakeholder communication, compliance, and process-improvement skills.');
  }
  if (hasAny(text, ['factory', 'warehouse', 'packing', 'production', 'day shift'])) {
    return factor('role', 'Role fit', 8, 20, 'Could work as short-term day-shift bridge income.');
  }
  if (hasAny(text, ['chaotic', 'high pressure', 'heavy labour', 'fifo'])) {
    return factor('role', 'Role fit', -10, 20, 'Role looks misaligned or unsustainable.');
  }
  return factor('role', 'Role fit', 0, 20, 'Role does not clearly match Josh preferred categories.');
}

function joshIncome(job: JobRecord, settings: ProfileSettings): ScoreFactor {
  const weekly = estimateWeeklyIncome(job);
  if (weekly === null) {
    return factor('income', 'Income fit', 8, 15, `Pay is missing; compare it against the $${settings.joshWeeklyIncomeTarget}/week replacement target before applying.`);
  }
  if (weekly >= 500) return factor('income', 'Income fit', 15, 15, `Likely reaches about $${weekly}/week gross from the assumed hours.`);
  if (weekly >= 400) return factor('income', 'Income fit', 12, 15, `Likely sits around $${weekly}/week gross, close to replacement territory.`);
  if (weekly >= 250) return factor('income', 'Income fit', 8, 15, `Likely provides about $${weekly}/week gross, useful but not full replacement income.`);
  return factor('income', 'Income fit', 3, 15, `Likely under $250/week, so it may still need Centrelink or another income support layer.`);
}

function joshSustainability(job: JobRecord, settings: ProfileSettings): ScoreFactor {
  const text = lower(getText(job));
  if (hasAny(text, ['night shift', '11pm', 'overnight', 'graveyard'])) {
    const score = settings.joshEmergencyCashflow ? -5 : -25;
    return factor('sustainability', 'Health/family sustainability', score, 20, 'Night shift risks sleep, stress regulation, and family capacity.');
  }
  if (hasAny(text, ['3pm', '3 pm', 'afternoon shift', 'evening shift', '11pm'])) {
    const score = settings.joshApprovedAfternoonShift ? 5 : -15;
    return factor('sustainability', 'Health/family sustainability', score, 20, 'Afternoon/evening shifts need explicit approval before they make sense.');
  }
  if (hasAny(text, ['predictable', 'day shift', 'daytime', 'weekday', 'fixed roster', 'office hours', 'business hours'])) {
    return factor('sustainability', 'Health/family sustainability', 20, 20, 'Predictable daytime work protects sleep, home load, and Avance capacity.');
  }
  if (hasAny(text, ['school hours', 'family friendly', 'family-friendly'])) {
    return factor('sustainability', 'Health/family sustainability', 15, 20, 'Family-friendly or school-hours-ish work is likely sustainable.');
  }
  if (hasAny(text, ['casual', 'part-time', 'part time', 'flexible'])) {
    return factor('sustainability', 'Health/family sustainability', 10, 20, 'Manageable if the roster is clear and not fully on-call.');
  }
  if (hasAny(text, ['on-call', 'on call', 'random roster', 'as required'])) {
    return factor('sustainability', 'Health/family sustainability', 0, 20, 'Unpredictable on-call work may increase overwhelm.');
  }
  return factor('sustainability', 'Health/family sustainability', 10, 20, 'Sustainability is unclear until the roster is confirmed.');
}

function joshPathway(job: JobRecord): ScoreFactor {
  const text = lower(getText(job));
  if (
    hasAny(text, [
      'ict',
      'it support',
      'helpdesk',
      'service desk',
      'desktop support',
      'msp',
      'school ict',
      'microsoft 365',
      'office 365',
      'active directory',
      'jira',
      'classroom tech',
      'viewboard',
    ])
  ) {
    return factor('pathway', 'Long-term pathway', 15, 15, 'Builds the ICT, MSP, school technology, and support pathway.');
  }
  if (hasAny(text, ['trainer', 'training', 'tae', 'digital literacy', 'documentation', 'micro-learning'])) {
    return factor('pathway', 'Long-term pathway', 12, 15, 'Builds the training and digital support pathway.');
  }
  if (
    hasAny(text, [
      'admin',
      'customer service',
      'customer care',
      'client services',
      'student services',
      'education administration',
      'records',
      'scheduling',
      'timetabling',
      'compliance',
      'operations',
      'data entry',
      'library',
    ])
  ) {
    return factor('pathway', 'Long-term pathway', 8, 15, 'Builds education administration, systems, and stakeholder-support credibility.');
  }
  if (hasAny(text, ['factory', 'warehouse', 'packing', 'production'])) {
    return factor('pathway', 'Long-term pathway', 3, 15, 'Mostly a short-term cashflow bridge.');
  }
  return factor('pathway', 'Long-term pathway', 3, 15, 'Long-term value is not obvious from the ad.');
}

function commute(job: JobRecord, max = 5): ScoreFactor {
  const text = lower([job.location, job.distanceFromDubbo, job.description].join(' '));
  if (text.includes('dubbo')) return factor('location', 'Commute/location', max, max, 'Dubbo-based.');
  if (hasAny(text, ['remote', 'hybrid'])) return factor('location', 'Commute/location', Math.min(3, max), max, 'Remote or hybrid may be workable if expectations are clear.');
  if (hasAny(text, ['narromine', 'wellington', 'geurie', 'gilgandra'])) return factor('location', 'Commute/location', max === 5 ? 1 : 8, max, 'Nearby town; only worthwhile if pay and roster justify travel.');
  return factor('location', 'Commute/location', max === 5 ? -5 : 0, max, 'Location is unclear or likely outside the preferred Dubbo radius.');
}

function kristyField(job: JobRecord): ScoreFactor {
  const text = lower(getText(job));
  if (detectAgedCare(text)) {
    return factor('field', 'Nursing field fit', -30, 30, 'Appears to be aged care or residential aged care.');
  }
  if (
    hasAny(text, [
      'practice nurse',
      'gp nurse',
      'paediatric',
      'pediatric',
      'children',
      'child and adolescent',
      'immunisation',
      'child and family',
      'maternal child',
      'early parenting',
      'community health',
      'community nurse',
      'acute care',
      'short stay',
      'hospital outpatient',
      'outpatients',
      'school nurse',
      'clinic nurse',
      'medical centre',
      'primary health',
    ])
  ) {
    return factor('field', 'Nursing field fit', 30, 30, 'Excellent match for Kristy nursing preferences and paediatric/family-health experience.');
  }
  if (hasAny(text, ['hospital casual pool', 'casual pool', 'clinic', 'nsw health', 'rehabilitation', 'orthopaedic'])) {
    return factor('field', 'Nursing field fit', 24, 30, 'Hospital, clinic, rehabilitation, or casual-pool work may fit well if it avoids aged care.');
  }
  if (hasAny(text, ['registered nurse', ' rn ', 'rn casual', 'rn part-time', 'rn part time'])) {
    return factor('field', 'Nursing field fit', 18, 30, 'General RN role that may suit if the roster and setting are right.');
  }
  if (hasAny(text, ['disability', 'community support', 'support coordinator'])) {
    return factor('field', 'Nursing field fit', 10, 30, 'Has RN relevance but may not be a core nursing role.');
  }
  return factor('field', 'Nursing field fit', 0, 30, 'Nursing field is unclear.');
}

function kristyRoster(job: JobRecord): ScoreFactor {
  const text = lower(getText(job));
  if (hasAny(text, ['night shift', 'overnight', '11pm'])) {
    return factor('roster', 'Roster/family fit', -15, 25, 'Night shifts are a poor fit for family rhythm unless explicitly chosen.');
  }
  if (hasAny(text, ['full-time', 'full time', 'fulltime']) && !hasAny(text, ['part-time', 'part time', 'casual'])) {
    return factor('roster', 'Roster/family fit', -20, 25, 'Full-time inflexible work is outside the target.');
  }
  if (hasAny(text, ['high-burnout', 'high burnout', 'unpredictable', 'rotating nights'])) {
    return factor('roster', 'Roster/family fit', -25, 25, 'Roster language suggests high burnout or poor predictability.');
  }
  if (hasAny(text, ['part-time predictable', 'fixed roster', 'permanent part-time', 'permanent part time'])) {
    return factor('roster', 'Roster/family fit', 25, 25, 'Part-time predictable work is ideal.');
  }
  if (hasAny(text, ['casual', 'choose shifts', 'control over shifts', 'flexible shifts'])) {
    return factor('roster', 'Roster/family fit', 22, 25, 'Casual with shift control can fit family life.');
  }
  if (hasAny(text, ['weekday', 'day shift', 'daytime', 'clinic hours', 'business hours'])) {
    return factor('roster', 'Roster/family fit', 18, 25, 'Weekday/day-shift pattern is likely manageable.');
  }
  if (hasAny(text, ['rotating roster', 'shift work'])) {
    return factor('roster', 'Roster/family fit', 10, 25, 'Rotating roster may be workable but needs questions first.');
  }
  return factor('roster', 'Roster/family fit', 10, 25, 'Roster needs confirmation.');
}

function kristyLocation(job: JobRecord): ScoreFactor {
  const base = commute(job, 15);
  if (base.score === 15) return base;
  if (base.score === 8) return base;
  return factor('location', 'Location fit', base.score < 0 ? -10 : base.score, 15, base.note);
}

function kristyIncome(job: JobRecord): ScoreFactor {
  const text = [job.payRate, job.salaryText, job.description].join(' ');
  const hourly = text.match(/\$?\s*(\d{2,3})(?:\.\d{1,2})?\s*(?:per\s*hour|\/\s*hour|p\/h|ph|\/hr|hr|hourly)/i);
  if (!hourly) return factor('income', 'Income fit', 0, 15, 'Pay is missing.');
  const rate = Number(hourly[1]);
  if (rate >= 45) return factor('income', 'Income fit', 15, 15, 'Strong RN hourly rate.');
  if (rate >= 35) return factor('income', 'Income fit', 10, 15, 'Normal RN hourly rate.');
  return factor('income', 'Income fit', 5, 15, 'Lower rate, only worthwhile if flexibility is strong.');
}

function kristyValues(job: JobRecord): ScoreFactor {
  const text = lower(getText(job));
  if (
    hasAny(text, [
      'paediatric',
      'pediatric',
      'child',
      'adolescent',
      'family health',
      'maternal',
      'early parenting',
      'school',
      'community health',
      'asthma',
      'respiratory',
      'parent education',
      'family education',
    ])
  ) {
    return factor('values', 'Values/life fit', 15, 15, 'Connects with paediatric, family, school, community, or health-education strengths.');
  }
  if (hasAny(text, ['clinic', 'practice', 'supportive team', 'multidisciplinary', 'allied health', 'calm', 'business hours'])) {
    return factor('values', 'Values/life fit', 12, 15, 'Likely calmer clinic or team environment with multidisciplinary support.');
  }
  if (hasAny(text, ['return to practice', 're-entry', 'training provided', 'orientation'])) {
    return factor('values', 'Values/life fit', 8, 15, 'Could be a useful career re-entry pathway.');
  }
  if (detectAgedCare(text)) {
    return factor('values', 'Values/life fit', -10, 15, 'Aged care setting conflicts with the stated boundary.');
  }
  return factor('values', 'Values/life fit', 3, 15, 'Mostly an income option unless the setting is clarified.');
}

function summarizeReason(factors: ScoreFactor[]): string {
  const best = [...factors].sort((a, b) => b.score / b.max - a.score / a.max)[0];
  return best?.note ?? 'Scored against the saved profile.';
}

function summarizeConcern(factors: ScoreFactor[], forcedAvoid: boolean): string {
  if (forcedAvoid) return 'Violates a hard preference and should be avoided unless manually overridden.';
  const weak = [...factors].sort((a, b) => a.score - b.score)[0];
  return weak?.score <= 0 ? weak.note : 'Confirm roster, pay, and expectations before committing.';
}

function joshQuestion(job: JobRecord): string {
  const text = lower(getText(job));
  if (hasAny(text, ['night', 'afternoon', 'evening', 'on-call', 'on call'])) {
    return 'Could you confirm whether this is strictly day shift, whether any afternoon/night/on-call work is expected, and whether Thursday/Friday availability would be considered?';
  }
  return 'Would you consider Thursday/Friday availability for this role, and is the roster predictable enough to fit around existing Monday/Wednesday work?';
}

function kristyQuestion(job: JobRecord): string {
  const text = lower(getText(job));
  if (detectAgedCare(text)) {
    return 'Could you confirm whether this role is residential aged care, nursing-home, or RACF-based?';
  }
  return 'Could you confirm whether this role is part-time or casual, which shifts are available, and that it is clinic/community/hospital-based rather than aged care?';
}

function scoreJosh(job: JobRecord, settings: ProfileSettings): ScoreBreakdown {
  const factors = [
    joshAvailability(job),
    joshRole(job),
    joshIncome(job, settings),
    joshSustainability(job, settings),
    joshPathway(job),
    commute(job),
  ];
  const total = clampScore(factors.reduce((sum, item) => sum + item.score, 0));
  return {
    factors,
    notes: factors.map((item) => item.note),
    total,
    forcedAvoid: false,
    agedCareViolation: false,
  };
}

function scoreKristy(job: JobRecord, settings: ProfileSettings): ScoreBreakdown {
  const text = getText(job);
  const agedCareViolation = detectAgedCare(text);
  const factors = [kristyField(job), kristyRoster(job), kristyLocation(job), kristyIncome(job), kristyValues(job)];
  const forcedAvoid = agedCareViolation && !settings.kristyAllowAgedCareOverride;
  const total = forcedAvoid ? 0 : clampScore(factors.reduce((sum, item) => sum + item.score, 0));
  return {
    factors,
    notes: factors.map((item) => item.note),
    total,
    forcedAvoid,
    agedCareViolation,
  };
}

export function scoreJob(job: JobRecord, settings: ProfileSettings = defaultSettings): JobRecord {
  const scoreBreakdown = job.profileTarget === 'josh' ? scoreJosh(job, settings) : scoreKristy(job, settings);
  const availability = scoreBreakdown.factors.find((item) => item.key === 'availability');
  const roster = scoreBreakdown.factors.find((item) => item.key === 'roster');
  const needsQuestions = Boolean((availability && availability.score <= 10) || (roster && roster.score <= 10));
  const fitLabel = labelFromScore(scoreBreakdown.total, scoreBreakdown.forcedAvoid, needsQuestions);
  const exclusionsDetected =
    job.profileTarget === 'kristy' && scoreBreakdown.agedCareViolation
      ? Array.from(new Set([...job.exclusionsDetected, 'Aged care / residential care detected']))
      : job.exclusionsDetected;

  return {
    ...job,
    nursingType: job.profileTarget === 'kristy' ? job.nursingType || detectNursingType(getText(job)) : '',
    exclusionsDetected,
    matchScore: scoreBreakdown.total,
    scoreBreakdown,
    fitLabel,
    fitReason: summarizeReason(scoreBreakdown.factors),
    biggestConcern: summarizeConcern(scoreBreakdown.factors, scoreBreakdown.forcedAvoid),
    questionToAsk: job.profileTarget === 'josh' ? joshQuestion(job) : kristyQuestion(job),
    nextAction:
      fitLabel === 'Apply now'
        ? 'Apply with a tailored note'
        : fitLabel === 'Ask questions first'
          ? 'Ask the roster and setting questions first'
          : fitLabel === 'Avoid'
            ? 'Archive unless circumstances change'
            : 'Keep for review',
  };
}

export function createJobFromDraft(draft: JobDraft, settings: ProfileSettings = defaultSettings): JobRecord {
  const now = new Date().toISOString();
  const importedText = draft.importedText || draft.description;
  const provisional: JobRecord = {
    id: makeId(),
    profileTarget: draft.profileTarget,
    source: draft.source,
    sourceDetail: draft.sourceDetail,
    title: compact(draft.title) || 'Untitled job lead',
    employer: compact(draft.employer) || 'Unknown employer',
    location: compact(draft.location) || 'Dubbo NSW',
    distanceFromDubbo: '',
    workType: compact(draft.workType),
    hours: compact(draft.hours),
    daysRequired: compact(draft.daysRequired),
    shiftPattern: compact(draft.shiftPattern),
    payRate: compact(draft.payRate),
    salaryText: compact(draft.salaryText),
    url: compact(draft.url),
    postedDate: draft.postedDate,
    closingDate: draft.closingDate,
    description: compact(draft.description || importedText),
    requirements: compact(draft.requirements),
    nursingType: '',
    exclusionsDetected: [],
    matchScore: 0,
    scoreBreakdown: { factors: [], notes: [], total: 0, forcedAvoid: false, agedCareViolation: false },
    fitLabel: 'Maybe',
    fitReason: '',
    biggestConcern: '',
    nextAction: '',
    questionToAsk: '',
    status: 'New',
    viewed: false,
    importedText,
    createdAt: now,
    updatedAt: now,
    notes: '',
  };
  return scoreJob(provisional, settings);
}

function extractLine(raw: string, labels: string[]): string {
  const lines = raw.split(/\r?\n/).map((line) => line.trim());
  for (const label of labels) {
    const match = lines.find((line) => lower(line).startsWith(`${lower(label)}:`));
    if (match) return compact(match.slice(match.indexOf(':') + 1));
  }
  return '';
}

function firstMeaningfulLine(raw: string): string {
  const line = raw
    .split(/\r?\n/)
    .map((item) => item.trim())
    .find((item) => item.length > 3 && !item.startsWith('http') && !item.includes('@'));
  return line ? compact(line.replace(/^job title:\s*/i, '')) : '';
}

export function parseJobText(raw: string, profileTarget: ProfileTarget): JobDraft {
  const title = extractLine(raw, ['title', 'job title', 'position']) || firstMeaningfulLine(raw);
  const employer = extractLine(raw, ['employer', 'company', 'organisation', 'organization', 'business']);
  const location =
    extractLine(raw, ['location', 'suburb']) ||
    (hasAny(raw, ['dubbo']) ? 'Dubbo NSW' : hasAny(raw, ['remote']) ? 'Remote / hybrid' : '');
  const url = raw.match(/https?:\/\/[^\s)]+/i)?.[0] ?? '';
  const salary = raw.match(/\$[\d,]+(?:\.\d{1,2})?(?:\s*-\s*\$?[\d,]+(?:\.\d{1,2})?)?\s*(?:per hour|\/hour|p\/h|\/hr|hr|hour|per week|weekly|salary)?/i)?.[0] ?? '';
  const workTypeKeywords = ['part-time', 'part time', 'casual', 'temporary', 'contract', 'full-time', 'full time', 'permanent'];
  const shiftKeywords = ['day shift', 'night shift', 'afternoon shift', 'evening shift', 'weekday', 'rotating roster', 'school hours', 'clinic hours'];
  const days = dayNames.filter((day) => lower(raw).includes(day)).map((day) => `${day[0].toUpperCase()}${day.slice(1)}`);
  const workType = workTypeKeywords.find((keyword) => lower(raw).includes(keyword)) ?? '';
  const shiftPattern = shiftKeywords.find((keyword) => lower(raw).includes(keyword)) ?? '';
  const hours = raw.match(/\d{1,2}(?:\.\d)?\s*(?:hours|hrs|hr)(?:\s*per\s*week)?/i)?.[0] ?? '';

  return {
    ...emptyDraft,
    profileTarget,
    source: 'Manual paste',
    title,
    employer,
    location,
    workType,
    hours,
    daysRequired: days.join(', '),
    shiftPattern,
    payRate: salary,
    salaryText: salary,
    url,
    description: compact(raw),
    importedText: raw,
  };
}

export function makeApplicationDrafts(job: JobRecord): ApplicationDrafts {
  if (job.profileTarget === 'josh') {
    return {
      enquiryEmail: [
        `Subject: Question about ${job.title}`,
        '',
        `Hi ${job.employer || 'there'},`,
        '',
        `I am interested in the ${job.title} role in ${job.location || 'Dubbo'}. Before applying, could I please confirm whether you would consider Thursday/Friday availability, whether the role is day shift or mixed shift, and whether the work is predictable rather than fully on-call?`,
        '',
        'I currently work in ICT support on Mondays and Wednesdays and would be looking for work that fits around those fixed commitments.',
        '',
        'Kind regards,',
        'Josh Parris',
      ].join('\n'),
      applicationEmail: [
        `Subject: Application for ${job.title}`,
        '',
        `Hi ${job.employer || 'there'},`,
        '',
        `I would like to apply for the ${job.title} role. My background includes Level 1 MSP/ICT support, Microsoft 365 and Google Workspace user support, Active Directory password resets, Jira/service-desk ticketing, school ICT and library support, and education administration.`,
        '',
        'I am especially interested in practical, predictable work where clear communication, calm troubleshooting, stakeholder support, and useful process improvement matter.',
        '',
        'Kind regards,',
        'Josh Parris',
      ].join('\n'),
      resumeAlignment: [
        'Level 1 MSP/ICT support with Microsoft 365, Google Workspace, Active Directory password resets, device setup, and Windows reimaging.',
        'School ICT and library support, including teacher support, classroom technology, cataloguing, and practical help for non-technical users.',
        'Tertiary education customer-care and student-services experience across phone, face-to-face, CRM, Zoom, and cross-department enquiries.',
        'Scheduling, exams, special-consideration, compliance, stakeholder engagement, documentation, and process-improvement background.',
      ],
      interviewPrep: [
        'Prepare a short example of fixing a recurring IT issue with clear documentation or escalation.',
        'Prepare an education-admin example: scheduling, exams, CRM, compliance, or improving a student/customer process.',
        'Explain Monday/Wednesday commitments clearly and confidently.',
        'Ask how work is triaged, who provides escalation, and how busy periods are handled.',
      ],
      acceptanceQuestions: [
        'Is Thursday/Friday availability acceptable long term?',
        'Is the role day shift, mixed shift, or on-call?',
        'What weekly hours are realistically available?',
        'Who sets priorities when several support requests arrive at once?',
      ],
    };
  }

  return {
    enquiryEmail: [
      `Subject: Question about ${job.title}`,
      '',
      `Hi ${job.employer || 'there'},`,
      '',
      `I am interested in the ${job.title} role in ${job.location || 'Dubbo'}. Could I please confirm whether this is part-time or casual, what shifts are available, and whether the work is clinic, community, or hospital-based?`,
      '',
      'Could you also confirm that the role is not residential aged care, nursing-home, or RACF-based?',
      '',
      'Kind regards,',
      'Kristy Parris',
    ].join('\n'),
    applicationEmail: [
      `Subject: Application for ${job.title}`,
      '',
      `Hi ${job.employer || 'there'},`,
      '',
      `I would like to apply for the ${job.title} role. I am a Registered Nurse with strong paediatric acute-care experience, family communication skills, multidisciplinary teamwork, and a background that also includes inpatient rehabilitation and orthopaedic nursing.`,
      '',
      'I would welcome the opportunity to discuss available shifts, team expectations, and how the role supports safe, sustainable nursing work in a clinic, community, hospital, school, or similar non-aged-care setting.',
      '',
      'Kind regards,',
      'Kristy Parris',
    ].join('\n'),
    resumeAlignment: [
      'Registered Nurse with substantial paediatric children\'s ward experience and acute child/adolescent assessment skills.',
      'Parent and family education experience, including medication guidance, asthma management, reassurance, and home safety-netting.',
      'Clinical skills across wound care, respiratory/neurological/neurovascular observations, dehydration care, IV/NGT rehydration support, and escalation of deterioration.',
      'Inpatient rehabilitation, orthopaedic, multidisciplinary-team, and reflective practice background.',
      'Clear preference for safe, family-friendly part-time or casual rosters outside residential aged care.',
    ],
    interviewPrep: [
      'Clarify the clinical setting and whether there is any aged-care component.',
      'Ask about shift length, rostering notice, and ability to decline unsuitable shifts.',
      'Prepare examples of paediatric assessment, parent education, asthma/respiratory care, and safe escalation.',
    ],
    acceptanceQuestions: [
      'Is this role part-time, casual, or a pathway to fixed hours?',
      'What shifts are available in a normal month?',
      'Is any work residential aged care, nursing-home, or RACF-based?',
      'How much notice is given for roster changes?',
    ],
  };
}
