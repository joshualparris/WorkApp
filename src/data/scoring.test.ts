import { describe, expect, it } from 'vitest';
import {
  createJobFromDraft,
  defaultSettings,
  detectAgedCare,
  makeDedupeKey,
  parseJobText,
  parsePayEstimate,
} from './scoring';

describe('pay parsing', () => {
  it('keeps cents for hourly rates and ranges', () => {
    expect(
      parsePayEstimate({
        payRate: '$32.31/hr',
        salaryText: '',
        description: '',
        hours: '',
        profileTarget: 'josh',
      }).weekly
    ).toBe(485);

    expect(
      parsePayEstimate({
        payRate: '$37.48 - $52.62 per hr',
        salaryText: '',
        description: '',
        hours: '16 hours per week',
        profileTarget: 'josh',
      }).weekly
    ).toBe(721);
  });

  it('handles weekly and annual salary wording', () => {
    expect(
      parsePayEstimate({
        payRate: '$650 per week',
        salaryText: '',
        description: '',
        hours: '',
        profileTarget: 'josh',
      }).weekly
    ).toBe(650);

    expect(
      parsePayEstimate({
        payRate: '$70,000 - $78,000 salary',
        salaryText: '',
        description: '',
        hours: '',
        profileTarget: 'kristy',
      }).weekly
    ).toBe(1423);
  });
});

describe('Josh availability scoring', () => {
  it('asks first for Real Pet Foods style shift options instead of hard-rejecting them', () => {
    const draft = parseJobText(
      [
        'Process Worker - Real Pet Foods',
        'Employer: Programmed',
        'Location: Dubbo NSW',
        'Casual production work with day shift, afternoon shift and night shift options.',
        'Day shift $32.31 an hour. Afternoon shift $37.16 an hr. Night shift $42.00 an hr.',
      ].join('\n'),
      'josh'
    );
    const job = createJobFromDraft(draft, defaultSettings);

    expect(job.payRate).toContain('$32.31');
    expect(job.fitLabel).toBe('Ask questions first');
    expect(job.questionToAsk).toMatch(/day shift/i);
  });

  it('still strongly penalises night shift only work', () => {
    const job = createJobFromDraft(
      {
        ...parseJobText('Night shift warehouse hand\nLocation: Dubbo NSW\nNight shift 11pm-7am\n$42.00/hr', 'josh'),
        title: 'Night shift warehouse hand',
      },
      defaultSettings
    );

    expect(job.matchScore).toBeLessThan(50);
    expect(job.biggestConcern).toMatch(/Night shift/i);
  });
});

describe('Kristy aged-care exclusion', () => {
  it('detects aged care but respects explicit not-aged-care wording', () => {
    expect(detectAgedCare('Registered Nurse in residential aged care RACF')).toBe(true);
    expect(detectAgedCare('Practice nurse role, not aged care, clinic based')).toBe(false);
  });
});

describe('dedupe key', () => {
  it('normalises URLs before comparing jobs', () => {
    expect(makeDedupeKey({ title: '', employer: '', location: '', postedDate: '', url: 'https://www.example.com/jobs/123?ref=abc' })).toBe(
      makeDedupeKey({ title: '', employer: '', location: '', postedDate: '', url: 'https://example.com/jobs/123?ref=abc' })
    );
  });
});

describe('manual parser', () => {
  it('extracts useful registered nurse sample fields', () => {
    const draft = parseJobText(
      [
        'Registered Nurse - Paediatric Casual Pool',
        'Employer: NSW Health',
        'Location: Dubbo NSW',
        'Casual day shifts in a hospital outpatient and child health setting.',
        '$42.00 an hr',
      ].join('\n'),
      'kristy'
    );
    const job = createJobFromDraft(draft, defaultSettings);

    expect(draft.title).toContain('Registered Nurse');
    expect(draft.employer).toBe('NSW Health');
    expect(job.nursingType).toBe('Paediatric / child health');
    expect(job.scoreBreakdown.agedCareViolation).toBe(false);
  });
});
