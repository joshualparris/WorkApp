import { ClipboardCopy, ExternalLink, Mail, MessagesSquare, ShieldCheck, Sparkles } from 'lucide-react';
import { useState } from 'react';
import type { JobRecord } from '../types';
import { makeApplicationDrafts } from '../data/scoring';

interface JobDetailProps {
  job: JobRecord;
  onUpdateStatus: (jobId: string, status: JobRecord['status']) => void;
  onSaveNotes: (jobId: string, notes: string) => void;
}

const statusOptions: JobRecord['status'][] = ['New', 'Shortlisted', 'Asked Question', 'Applied', 'Interview', 'Rejected', 'Accepted', 'Archived'];

export function JobDetail({ job, onUpdateStatus, onSaveNotes }: JobDetailProps) {
  const drafts = makeApplicationDrafts(job);
  const [copiedSection, setCopiedSection] = useState<string | null>(null);

  const copyToClipboard = async (text: string, section: string) => {
    try {
      await navigator.clipboard.writeText(text);
      setCopiedSection(section);
      window.setTimeout(() => setCopiedSection((current) => (current === section ? null : current)), 2000);
    } catch {
      setCopiedSection(null);
    }
  };

  return (
    <section className="rounded-3xl border border-slate-200 bg-white p-6 shadow-soft">
      <div className="mb-5 flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <p className="text-sm font-semibold text-slate-900">{job.title}</p>
          <p className="text-sm text-slate-600">{job.employer} - {job.location}</p>
        </div>
        <span className="rounded-full bg-slate-100 px-3 py-1 text-sm font-medium text-slate-800">Status: {job.status}</span>
      </div>
      <div className="grid gap-6">
        <div className="grid gap-3 rounded-3xl bg-slate-50 p-5">
          <p className="text-sm font-semibold text-slate-900">Match summary</p>
          <div className="grid gap-2 sm:grid-cols-2">
            <div className="rounded-3xl bg-white p-4 shadow-sm">
              <p className="text-xs uppercase tracking-[0.22em] text-slate-500">Score</p>
              <p className="mt-2 text-3xl font-semibold text-slate-900">{job.matchScore}</p>
            </div>
            <div className="rounded-3xl bg-white p-4 shadow-sm">
              <p className="text-xs uppercase tracking-[0.22em] text-slate-500">Fit outcome</p>
              <p className="mt-2 text-xl font-semibold text-slate-900">{job.fitLabel}</p>
            </div>
          </div>
          <p className="text-sm text-slate-700"><Sparkles className="inline h-4 w-4 align-text-bottom text-emerald-500" /> {job.fitReason}</p>
          <p className="text-sm text-slate-700"><ShieldCheck className="inline h-4 w-4 align-text-bottom text-slate-500" /> {job.biggestConcern}</p>
        </div>
        <div className="grid gap-4 sm:grid-cols-2">
          <div className="rounded-3xl bg-slate-50 p-5">
            <p className="text-sm font-semibold text-slate-900">Application prompt</p>
            <p className="mt-2 text-sm text-slate-700">{job.questionToAsk}</p>
          </div>
          <div className="rounded-3xl bg-slate-50 p-5">
            <p className="text-sm font-semibold text-slate-900">Next action</p>
            <p className="mt-2 text-sm text-slate-700">{job.nextAction}</p>
          </div>
        </div>
        <div className="grid gap-3 rounded-3xl bg-slate-50 p-5">
          <div className="flex flex-wrap items-center justify-between gap-3">
            <p className="text-sm font-semibold text-slate-900">Application helper</p>
            <div className="flex flex-wrap items-center gap-2">
              <button
                type="button"
                onClick={() => void copyToClipboard(`${drafts.enquiryEmail}\n\n${drafts.applicationEmail}\n\n${drafts.resumeAlignment.join('\n')}\n\n${drafts.interviewPrep.join('\n')}\n\n${drafts.acceptanceQuestions.join('\n')}`, 'all')}
                className="inline-flex items-center gap-2 rounded-full border border-slate-300 bg-white px-3 py-1 text-xs font-semibold text-slate-700 hover:bg-slate-50"
              >
                <ClipboardCopy className="h-4 w-4" /> Copy all
              </button>
              <a href={job.url || '#'} target="_blank" rel="noreferrer" className="inline-flex items-center gap-2 text-slate-700 hover:text-slate-900">
                <ExternalLink className="h-4 w-4" /> Open link
              </a>
            </div>
          </div>
          {copiedSection === 'all' && <p className="text-sm text-emerald-700">Copied full application helper.</p>}
          <div className="grid gap-3">
            <div className="rounded-3xl bg-white p-4 shadow-sm">
              <div className="flex items-center justify-between gap-3">
                <p className="text-sm font-semibold text-slate-900">Short enquiry email</p>
                <button
                  type="button"
                  onClick={() => void copyToClipboard(drafts.enquiryEmail, 'enquiryEmail')}
                  className="inline-flex items-center gap-2 rounded-full border border-slate-300 bg-slate-50 px-3 py-1 text-xs font-semibold text-slate-700 hover:bg-slate-100"
                >
                  <ClipboardCopy className="h-4 w-4" /> Copy
                </button>
              </div>
              <pre className="mt-2 whitespace-pre-wrap text-sm text-slate-700">{drafts.enquiryEmail}</pre>
              {copiedSection === 'enquiryEmail' && <p className="mt-2 text-xs text-emerald-700">Copied.</p>}
            </div>
            <div className="rounded-3xl bg-white p-4 shadow-sm">
              <div className="flex items-center justify-between gap-3">
                <p className="text-sm font-semibold text-slate-900">Application email</p>
                <button
                  type="button"
                  onClick={() => void copyToClipboard(drafts.applicationEmail, 'applicationEmail')}
                  className="inline-flex items-center gap-2 rounded-full border border-slate-300 bg-slate-50 px-3 py-1 text-xs font-semibold text-slate-700 hover:bg-slate-100"
                >
                  <ClipboardCopy className="h-4 w-4" /> Copy
                </button>
              </div>
              <pre className="mt-2 whitespace-pre-wrap text-sm text-slate-700">{drafts.applicationEmail}</pre>
              {copiedSection === 'applicationEmail' && <p className="mt-2 text-xs text-emerald-700">Copied.</p>}
            </div>
            <div className="rounded-3xl bg-white p-4 shadow-sm">
              <div className="flex items-center justify-between gap-3">
                <p className="text-sm font-semibold text-slate-900">Resume alignment</p>
                <button
                  type="button"
                  onClick={() => void copyToClipboard(drafts.resumeAlignment.join('\n'), 'resumeAlignment')}
                  className="inline-flex items-center gap-2 rounded-full border border-slate-300 bg-slate-50 px-3 py-1 text-xs font-semibold text-slate-700 hover:bg-slate-100"
                >
                  <ClipboardCopy className="h-4 w-4" /> Copy
                </button>
              </div>
              <ul className="mt-2 list-disc space-y-1 pl-5 text-sm text-slate-700">
                {drafts.resumeAlignment.map((item) => (
                  <li key={item}>{item}</li>
                ))}
              </ul>
              {copiedSection === 'resumeAlignment' && <p className="mt-2 text-xs text-emerald-700">Copied.</p>}
            </div>
            <div className="rounded-3xl bg-white p-4 shadow-sm">
              <div className="flex items-center justify-between gap-3">
                <p className="text-sm font-semibold text-slate-900">Interview prep</p>
                <button
                  type="button"
                  onClick={() => void copyToClipboard(drafts.interviewPrep.join('\n'), 'interviewPrep')}
                  className="inline-flex items-center gap-2 rounded-full border border-slate-300 bg-slate-50 px-3 py-1 text-xs font-semibold text-slate-700 hover:bg-slate-100"
                >
                  <ClipboardCopy className="h-4 w-4" /> Copy
                </button>
              </div>
              <ul className="mt-2 list-disc space-y-1 pl-5 text-sm text-slate-700">
                {drafts.interviewPrep.map((item) => (
                  <li key={item}>{item}</li>
                ))}
              </ul>
              {copiedSection === 'interviewPrep' && <p className="mt-2 text-xs text-emerald-700">Copied.</p>}
            </div>
            <div className="rounded-3xl bg-white p-4 shadow-sm">
              <div className="flex items-center justify-between gap-3">
                <p className="text-sm font-semibold text-slate-900">Acceptance questions</p>
                <button
                  type="button"
                  onClick={() => void copyToClipboard(drafts.acceptanceQuestions.join('\n'), 'acceptanceQuestions')}
                  className="inline-flex items-center gap-2 rounded-full border border-slate-300 bg-slate-50 px-3 py-1 text-xs font-semibold text-slate-700 hover:bg-slate-100"
                >
                  <ClipboardCopy className="h-4 w-4" /> Copy
                </button>
              </div>
              <ul className="mt-2 list-disc space-y-1 pl-5 text-sm text-slate-700">
                {drafts.acceptanceQuestions.map((item) => (
                  <li key={item}>{item}</li>
                ))}
              </ul>
              {copiedSection === 'acceptanceQuestions' && <p className="mt-2 text-xs text-emerald-700">Copied.</p>}
            </div>
          </div>
        </div>
        <div className="grid gap-3 rounded-3xl bg-slate-50 p-5">
          <div className="flex items-center justify-between">
            <p className="text-sm font-semibold text-slate-900">Workflow updates</p>
          </div>
          <label className="block text-sm font-medium text-slate-700">
            Change status
            <select value={job.status} onChange={(event) => onUpdateStatus(job.id, event.target.value as JobRecord['status'])} className="mt-2 block w-full rounded-2xl border border-slate-300 bg-white px-4 py-3 text-sm shadow-sm focus:border-slate-500 focus:outline-none focus:ring-2 focus:ring-slate-200">
              {statusOptions.map((option) => (
                <option key={option} value={option}>{option}</option>
              ))}
            </select>
          </label>
          <label className="block text-sm font-medium text-slate-700">
            Notes
            <textarea value={job.notes} onChange={(event) => onSaveNotes(job.id, event.target.value)} rows={4} className="mt-2 block w-full rounded-3xl border border-slate-300 bg-white px-4 py-3 text-sm shadow-sm focus:border-slate-500 focus:outline-none focus:ring-2 focus:ring-slate-200" />
          </label>
        </div>
      </div>
    </section>
  );
}
