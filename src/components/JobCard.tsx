import { ArrowRight, CalendarDays, Clock3, MapPin, Sparkles, Share2, Check } from 'lucide-react';
import type { JobRecord } from '../types';
import { useState } from 'react';

interface JobCardProps {
  job: JobRecord;
  onSelect: (job: JobRecord) => void;
}

const labelStyles = {
  'Apply now': 'bg-emerald-100 text-emerald-800',
  'Ask questions first': 'bg-amber-100 text-amber-800',
  Maybe: 'bg-slate-100 text-slate-900',
  'Poor fit': 'bg-orange-100 text-orange-800',
  Avoid: 'bg-red-100 text-red-800',
};

export function JobCard({ job, onSelect }: JobCardProps) {
  const [copied, setCopied] = useState(false);

  const handleShare = () => {
    const text = `
📢 Job Lead: ${job.title}
🏢 Employer: ${job.employer}
📍 Location: ${job.location}
⚖️ Fit: ${job.fitLabel} (Score ${job.matchScore})
📝 Why: ${job.fitReason}
🕒 Roster: ${job.shiftPattern || 'Not specified'}
🔗 Link: ${job.url || 'No link provided'}
    `.trim();
    
    navigator.clipboard.writeText(text).then(() => {
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    });
  };

  return (
    <article className="rounded-3xl border border-slate-200 bg-white p-5 shadow-soft transition hover:-translate-y-0.5 hover:shadow-lg">
      <div className="flex flex-col gap-4">
        <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
          <div>
            <p className="text-xs uppercase tracking-[0.24em] text-slate-500">{job.profileTarget === 'josh' ? 'Josh radar' : 'Kristy radar'}</p>
            <h3 className="text-lg font-semibold text-slate-900">{job.title}</h3>
            <p className="text-sm text-slate-600">{job.employer} - {job.location}</p>
          </div>
          <div className="flex flex-col items-start gap-2 sm:items-end">
            <span className={`inline-flex rounded-full px-3 py-1 text-xs font-semibold ${labelStyles[job.fitLabel]}`}>
              {job.fitLabel}
            </span>
            <span className="rounded-full bg-slate-100 px-3 py-1 text-xs font-medium text-slate-800">Score {job.matchScore}</span>
          </div>
        </div>
        <div className="grid gap-2 sm:grid-cols-2">
          <p className="text-sm text-slate-600"><Sparkles className="inline h-4 w-4 align-text-bottom text-emerald-500" /> {job.fitReason}</p>
          <p className="text-sm text-slate-600"><Clock3 className="inline h-4 w-4 align-text-bottom text-slate-500" /> {job.shiftPattern || 'Shift details pending'}</p>
          <p className="text-sm text-slate-600"><MapPin className="inline h-4 w-4 align-text-bottom text-slate-500" /> {job.location}</p>
          <p className="text-sm text-slate-600"><CalendarDays className="inline h-4 w-4 align-text-bottom text-slate-500" /> {job.closingDate ? `Closing ${job.closingDate}` : 'Closing date unknown'}</p>
        </div>
        <div className="flex items-center justify-between gap-3 pt-2">
          <div className="flex gap-2">
            <button
              type="button"
              onClick={() => onSelect(job)}
              className="inline-flex items-center gap-2 rounded-full bg-slate-900 px-4 py-2 text-sm font-semibold text-white transition hover:bg-slate-700"
            >
              View details <ArrowRight className="h-4 w-4" />
            </button>
            <button
              type="button"
              onClick={handleShare}
              title="Copy summary to clipboard"
              className="inline-flex items-center gap-2 rounded-full border border-slate-200 bg-white px-3 py-2 text-sm font-semibold text-slate-600 transition hover:bg-slate-50"
            >
              {copied ? <Check className="h-4 w-4 text-emerald-500" /> : <Share2 className="h-4 w-4" />}
            </button>
          </div>
          <span className="text-xs uppercase tracking-[0.18em] text-slate-500">{job.status}</span>
        </div>
      </div>
    </article>
  );
}
