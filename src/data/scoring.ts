import { JobFitLabel, JobRecord, ProfileTarget, ScoreBreakdown } from '../types';

const textIncludes = (text: string, keywords: string[]) =>
  keywords.some((keyword) => text.toLowerCase().includes(keyword.toLowerCase()));

const formatNotes = (...items: string[]) => items.filter(Boolean);

const getAvailabilityScore = (job: JobRecord): { score: number; note: string } => {
  const text = [job.title, job.description, job.shiftPattern, job.daysRequired, job.workType].join(' ').toLowerCase();
  if (textIncludes(text, ['thursday', 'friday', 'thu', 'fri'])) {
    return { score: 25, note: 'Strongly aligned with Thursday/Friday availability.' };
  }
  if (textIncludes(text, ['part-time', 'casual', '2 days', 'two days', 'flexible'])) {
    return { score: 18, note: 'Part-time or flexible work is a positive fit.' };
  }
  if (textIncludes(text, ['day shift', 'daytime', 'weekday', 'school hours'])) {
    return { score: 20, note: 'Day shift work supports family-friendly routines.' };
  }
  if (textIncludes(text, ['monday', 'wednesday', 'mon', 'wed'])) {
    return { score: 0, note: 'May conflict with existing Monday/Wednesday commitments.' };
  }
  if (textIncludes(text, ['full availability', 'open availability', 'any day', 'anytime'])) {
    return { score: -15, note: 'Open availability may be too unstable for current routines.' };
  }
  return { score: 10, note: 'Availability is unclear but potentially manageable.' };
};

const getCommuteScore = (job: JobRecord): { score: number; note: string } => {
  const location = job.location.toLowerCase();
  if (location.includes('dubbo')) return { score: 5, note: 'Location is within Dubbo.' };
  if (location.includes('remote') || location.includes('hybrid')) return { score: 3, note: 'Remote/hybrid options reduce commute concerns.' };
  if (location.includes('nsw') || location.includes('near')) return { score: 3, note: 'Nearby NSW role is acceptable.' };
  return { score: -5, note: 'Location may be a long commute.' };
};

const getIncomeScore = (job: JobRecord): { score: number; note: string } => {
  const text = [job.payRate, job.salaryText, job.description].join(' ').toLowerCase();
  if (textIncludes(text, ['$50', '$55', '$60', 'strong rn rate'])) return { score: 15, note: 'Pay looks strong for the role.' };
  if (textIncludes(text, ['$40', '$45', '$48', '$30', '$35'])) return { score: 12, note: 'Pay is in a solid part-time range.' };
  if (textIncludes(text, ['flexible', 'competitive', 'above award'])) return { score: 12, note: 'Pay is described as competitive or flexible.' };
  if (textIncludes(text, ['$20', '$25', 'casual'])) return { score: 8, note: 'Pay may be lower but could still be useful as a bridge role.' };
  return { score: 8, note: 'Income is not fully clear from the description.' };
};

type JoshRoleScore = { score: number; note: string };
type KristyRoleScore = { score: number; note: string; forcedAvoid: boolean };

type RoleScore = JoshRoleScore | KristyRoleScore;

const scoreJoshRole = (job: JobRecord): JoshRoleScore => {
  const text = [job.title, job.description, job.workType, job.requirements].join(' ').toLowerCase();
  if (textIncludes(text, ['ict', 'it support', 'helpdesk', 'service desk', 'msp', 'school ict', 'digital literacy', 'trainer', 'training', 'microsoft 365', 'av technician', 'library assistant', 'admin officer', 'customer service'])) {
    return { score: 20, note: 'Role fits Josh’s ICT/support/admin career path.' };
  }
  if (textIncludes(text, ['admin', 'customer service', 'school support', 'library', 'operations'])) {
    return { score: 16, note: 'Role is a solid support or admin fit.' };
  }
  if (textIncludes(text, ['factory', 'warehouse', 'day shift', 'casual'])) {
    return { score: 8, note: 'Role may be a short-term day shift bridge option.' };
  }
  if (textIncludes(text, ['urgent', 'flexible', 'casual'])) {
    return { score: 12, note: 'Role may still be workable if it is predictable.' };
  }
  return { score: 0, note: 'Role is not clearly aligned with Josh’s main target roles.' };
};

const scoreKristyRole = (job: JobRecord): KristyRoleScore => {
  const text = [job.title, job.description, job.workType, job.requirements].join(' ').toLowerCase();
  if (textIncludes(text, ['aged care', 'nursing home', 'residential aged care', 'racf', 'elderly care', 'dementia'])) {
    return { score: -30, note: 'Hard aged-care exclusion detected.', forcedAvoid: true };
  }
  if (textIncludes(text, ['practice nurse', 'gp nurse', 'immunisation', 'child and family', 'community nurse', 'school nurse', 'outpatients', 'clinic nurse', 'medical centre', 'primary health', 'hospital casual', 'nsw health'])) {
    return { score: 30, note: 'Strong Kristy nursing fit for community or clinic work.', forcedAvoid: false };
  }
  if (textIncludes(text, ['registered nurse', 'rn', 'casual', 'part-time', 'clinic'])) {
    return { score: 18, note: 'General RN role that may suit Kristy with some guidance.', forcedAvoid: false };
  }
  if (textIncludes(text, ['community', 'disability', 'support'])) {
    return { score: 10, note: 'Role has nursing relevance but may not be core clinic work.', forcedAvoid: false };
  }
  return { score: 0, note: 'Role fit is unclear for Kristy’s nursing goals.', forcedAvoid: false };
};

const getSustainabilityScore = (job: JobRecord): { score: number; note: string } => {
  const text = [job.description, job.shiftPattern, job.workType, job.daysRequired].join(' ').toLowerCase();
  if (textIncludes(text, ['day shift', 'daytime', 'weekday', 'school hours'])) {
    return { score: 20, note: 'Predictable day work supports family and health.' };
  }
  if (textIncludes(text, ['casual', 'part-time', 'flexible', 'clinic'])) {
    return { score: 15, note: 'Part-time or casual work can be manageable.' };
  }
  if (textIncludes(text, ['on-call', 'roster', 'rotating', 'night', 'unscheduled'])) {
    return { score: 0, note: 'Unpredictable shift patterns may be difficult to manage.' };
  }
  if (textIncludes(text, ['3pm', 'afternoon', 'evening', '11pm'])) {
    return { score: -15, note: 'Late or evening shifts are less family-friendly.' };
  }
  return { score: 10, note: 'Sustainability is uncertain from the current details.' };
};

const getPathwayScore = (job: JobRecord): { score: number; note: string } => {
  const text = [job.title, job.description, job.requirements, job.workType].join(' ').toLowerCase();
  if (job.profileTarget === 'josh') {
    if (textIncludes(text, ['ict', 'helpdesk', 'service desk', 'school ict', 'training', 'microsoft 365', 'digital literacy', 'av', 'classroom tech'])) {
      return { score: 15, note: 'Builds toward Josh’s ICT and training career path.' };
    }
    if (textIncludes(text, ['admin', 'customer service', 'operations', 'data entry'])) {
      return { score: 8, note: 'Supports employability but is more general work.' };
    }
    return { score: 3, note: 'Likely short-term work rather than a long-term pathway.' };
  }
  if (job.profileTarget === 'kristy') {
    if (textIncludes(text, ['clinic', 'practice', 'immunisation', 'community', 'school nurse', 'hospital casual', 'outpatients'])) {
      return { score: 15, note: 'Supports Kristy’s nursing and community health pathway.' };
    }
    if (textIncludes(text, ['registered nurse', 'casual', 'part-time'])) {
      return { score: 10, note: 'Supports RN experience with good flexibility.' };
    }
    return { score: 3, note: 'May be more about bridging income than career progression.' };
  }
  return { score: 0, note: 'Pathway fit is neutral.' };
};

const getMatchLabel = (score: number): JobFitLabel => {
  if (score >= 82) return 'Apply now';
  if (score >= 66) return 'Ask questions first';
  if (score >= 50) return 'Maybe';
  if (score >= 30) return 'Poor fit';
  return 'Avoid';
};

export function scoreJob(job: JobRecord): JobRecord {
  const availability = getAvailabilityScore(job);
  const commute = getCommuteScore(job);
  const income = getIncomeScore(job);
  const role = job.profileTarget === 'josh' ? scoreJoshRole(job) : scoreKristyRole(job);
  const sustainability = getSustainabilityScore(job);
  const pathway = getPathwayScore(job);
  const forcedAvoid = job.profileTarget === 'kristy' ? (role as KristyRoleScore).forcedAvoid : false;
  const score = Math.max(
    0,
    Math.min(
      100,
      availability.score + commute.score + income.score + role.score + sustainability.score + pathway.score
    )
  );
  const fitLabel = getMatchLabel(score);
  const reason = role.note;
  const biggestConcern = availability.score <= 0 ? 'Availability may conflict with existing Monday/Wednesday commitments.' : 'Confirm shift pattern and roster before applying.';
  const questionToAsk = job.profileTarget === 'josh'
    ? 'Is this role available for Thursday/Friday day shifts and is the roster predictable enough to avoid Monday/Wednesday coverage?' 
    : 'Can you confirm this is a part-time/casual clinic or community nursing role and not aged care?';
  const nextAction = fitLabel === 'Apply now' ? 'Shortlist and apply' : fitLabel === 'Ask questions first' ? 'Request more details' : 'Keep for review';

  const breakdown: ScoreBreakdown = {
    factors: [
      { key: 'availability', label: 'Availability fit', score: availability.score, max: 25, note: availability.note },
      { key: 'role', label: 'Role fit', score: role.score, max: 30, note: role.note },
      { key: 'income', label: 'Income fit', score: income.score, max: 15, note: income.note },
      { key: 'sustainability', label: 'Sustainability', score: sustainability.score, max: 20, note: sustainability.note },
      { key: 'pathway', label: 'Pathway', score: pathway.score, max: 15, note: pathway.note },
      { key: 'commute', label: 'Commute', score: commute.score, max: 5, note: commute.note },
    ],
    notes: formatNotes(availability.note, role.note, income.note, sustainability.note, pathway.note, commute.note),
    total: score,
    forcedAvoid,
    agedCareViolation: job.profileTarget === 'kristy' && role.score < 0,
  };

  return {
    ...job,
    matchScore: score,
    scoreBreakdown: breakdown,
    fitLabel,
    fitReason: reason,
    biggestConcern,
    questionToAsk,
    nextAction,
  };
}
