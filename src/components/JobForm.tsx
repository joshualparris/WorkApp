import { useMemo, useState, type ChangeEvent, type FormEvent } from 'react';
import type { JobDraft, JobRecord, ProfileTarget } from '../types';
import { createJobFromDraft, defaultSettings, parseJobText } from '../data/scoring';

interface JobFormProps {
  onSave: (job: JobRecord) => void;
}

const statusOptions: JobRecord['status'][] = ['New', 'Shortlisted', 'Asked Question', 'Applied', 'Interview', 'Rejected', 'Accepted', 'Archived'];

export function JobForm({ onSave }: JobFormProps) {
  const [profileTarget, setProfileTarget] = useState<ProfileTarget>('josh');
  const [title, setTitle] = useState('');
  const [employer, setEmployer] = useState('');
  const [location, setLocation] = useState('Dubbo NSW');
  const [source, setSource] = useState('Manual paste');
  const [workType, setWorkType] = useState('Part-time');
  const [shiftPattern, setShiftPattern] = useState('Day shift');
  const [hours, setHours] = useState('');
  const [daysRequired, setDaysRequired] = useState('');
  const [payRate, setPayRate] = useState('');
  const [salaryText, setSalaryText] = useState('');
  const [url, setUrl] = useState('');
  const [postedDate, setPostedDate] = useState('');
  const [closingDate, setClosingDate] = useState('');
  const [description, setDescription] = useState('');
  const [requirements, setRequirements] = useState('');
  const [notes, setNotes] = useState('');
  const [status, setStatus] = useState<JobRecord['status']>('New');
  const [rawText, setRawText] = useState('');

  const parsed = useMemo(() => parseJobText(rawText, profileTarget), [rawText, profileTarget]);

  const handleImport = () => {
    setTitle(parsed.title || title);
    setEmployer(parsed.employer || employer);
    setLocation(parsed.location || location);
    setPayRate(parsed.payRate || payRate);
    setSalaryText(parsed.salaryText || salaryText);
    setUrl(parsed.url || url);
    setPostedDate(parsed.postedDate || postedDate);
    setClosingDate(parsed.closingDate || closingDate);
    setDescription(parsed.description || description);
    setRequirements(parsed.requirements || requirements);
    setWorkType(parsed.workType || workType);
    setShiftPattern(parsed.shiftPattern || shiftPattern);
    setHours(parsed.hours || hours);
    setDaysRequired(parsed.daysRequired || daysRequired);
    setNotes((prev) => (prev ? prev : 'Imported from pasted job alert text.'));
  };

  const parseCsvText = (text: string): JobDraft[] => {
    const rows = text
      .trim()
      .split(/\r?\n/)
      .map((line) => line.trim())
      .filter(Boolean);
    if (rows.length <= 1) return [];
    const headers = rows[0]
      .split(/,(?=(?:[^\"]*\"[^\"]*\")*[^\"]*$)/)
      .map((h) => h.replace(/^"|"$/g, '').trim().toLowerCase());
    return rows.slice(1).map((row) => {
      const values = row.split(/,(?=(?:[^\"]*\"[^\"]*\")*[^\"]*$)/).map((value) => value.replace(/^"|"$/g, '').trim());
      const entry = Object.fromEntries(headers.map((header, index) => [header, values[index] ?? '']));
      const profileTarget = (entry['profiletarget'] as ProfileTarget) || 'josh';
      return {
        profileTarget,
        source: 'CSV import',
        sourceDetail: 'CSV upload',
        title: entry['title'] || 'Imported job',
        employer: entry['employer'] || 'Unknown employer',
        location: entry['location'] || 'Dubbo NSW',
        workType: entry['worktype'] || 'Unknown',
        hours: entry['hours'] || '',
        daysRequired: entry['daysrequired'] || '',
        shiftPattern: entry['shiftpattern'] || '',
        payRate: entry['payrate'] || entry['salarytext'] || '',
        salaryText: entry['salarytext'] || entry['payrate'] || '',
        url: entry['url'] || '',
        postedDate: entry['posteddate'] || '',
        closingDate: entry['closingdate'] || '',
        description: entry['description'] || '',
        requirements: entry['requirements'] || '',
        importedText: row,
      };
    });
  };

  const handleCsvFile = async (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (!file) return;
    const content = await file.text();
    const drafts = parseCsvText(content);
    drafts.forEach((draft) => onSave(createJobFromDraft(draft, defaultSettings)));
    event.target.value = '';
  };

  const handleSubmit = (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    const draft: JobDraft = {
      profileTarget,
      source,
      sourceDetail: 'Manual entry',
      title: title || 'Imported job',
      employer: employer || 'Unknown employer',
      location: location || 'Dubbo NSW',
      workType,
      hours,
      daysRequired,
      shiftPattern,
      payRate,
      salaryText: salaryText || payRate,
      url,
      postedDate: postedDate || '',
      closingDate,
      description,
      requirements,
      importedText: rawText || description,
    };
    const newJob = createJobFromDraft(draft, defaultSettings);
    newJob.sourceDetail = 'Manual entry';
    newJob.status = status;
    newJob.notes = notes;
    onSave(newJob);
    setTitle('');
    setEmployer('');
    setLocation('Dubbo NSW');
    setWorkType('Part-time');
    setShiftPattern('Day shift');
    setHours('');
    setDaysRequired('');
    setPayRate('');
    setSalaryText('');
    setUrl('');
    setPostedDate('');
    setClosingDate('');
    setDescription('');
    setRequirements('');
    setNotes('');
    setRawText('');
    setStatus('New');
  };

  return (
    <section className="rounded-3xl border border-slate-200 bg-white p-6 shadow-soft">
      <div className="mb-6 flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <p className="text-sm font-semibold text-slate-900">Manual job entry</p>
          <p className="text-sm text-slate-600">Paste a job alert or add the role manually to score and track it.</p>
        </div>
      </div>
      <form onSubmit={handleSubmit} className="grid gap-4 lg:grid-cols-[1fr_320px]">
        <div className="space-y-4">
          <div className="grid gap-3 sm:grid-cols-2">
            <label className="block text-sm font-medium text-slate-700">
              Profile
              <select value={profileTarget} onChange={(event) => setProfileTarget(event.target.value as ProfileTarget)} className="mt-1 block w-full rounded-2xl border border-slate-300 bg-white px-4 py-3 text-sm text-slate-900 shadow-sm focus:border-slate-500 focus:outline-none focus:ring-2 focus:ring-slate-200">
                <option value="josh">Josh</option>
                <option value="kristy">Kristy</option>
              </select>
            </label>
            <label className="block text-sm font-medium text-slate-700">
              Source
              <input value={source} onChange={(event) => setSource(event.target.value)} className="mt-1 block w-full rounded-2xl border border-slate-300 bg-white px-4 py-3 text-sm text-slate-900 shadow-sm focus:border-slate-500 focus:outline-none focus:ring-2 focus:ring-slate-200" />
            </label>
          </div>
          <div className="grid gap-3 sm:grid-cols-2">
            <label className="block text-sm font-medium text-slate-700">
              Title
              <input value={title} onChange={(event) => setTitle(event.target.value)} placeholder="ICT Support Officer" className="mt-1 block w-full rounded-2xl border border-slate-300 bg-white px-4 py-3 text-sm text-slate-900 shadow-sm focus:border-slate-500 focus:outline-none focus:ring-2 focus:ring-slate-200" />
            </label>
            <label className="block text-sm font-medium text-slate-700">
              Employer
              <input value={employer} onChange={(event) => setEmployer(event.target.value)} placeholder="Employer name" className="mt-1 block w-full rounded-2xl border border-slate-300 bg-white px-4 py-3 text-sm text-slate-900 shadow-sm focus:border-slate-500 focus:outline-none focus:ring-2 focus:ring-slate-200" />
            </label>
          </div>
          <div className="grid gap-3 sm:grid-cols-2">
            <label className="block text-sm font-medium text-slate-700">
              Location
              <input value={location} onChange={(event) => setLocation(event.target.value)} className="mt-1 block w-full rounded-2xl border border-slate-300 bg-white px-4 py-3 text-sm text-slate-900 shadow-sm focus:border-slate-500 focus:outline-none focus:ring-2 focus:ring-slate-200" />
            </label>
            <label className="block text-sm font-medium text-slate-700">
              Pay / rate
              <input value={payRate} onChange={(event) => setPayRate(event.target.value)} placeholder="$45/hr" className="mt-1 block w-full rounded-2xl border border-slate-300 bg-white px-4 py-3 text-sm text-slate-900 shadow-sm focus:border-slate-500 focus:outline-none focus:ring-2 focus:ring-slate-200" />
            </label>
          </div>
          <div className="grid gap-3 sm:grid-cols-2">
            <label className="block text-sm font-medium text-slate-700">
              Shift pattern
              <input value={shiftPattern} onChange={(event) => setShiftPattern(event.target.value)} placeholder="Day shift" className="mt-1 block w-full rounded-2xl border border-slate-300 bg-white px-4 py-3 text-sm text-slate-900 shadow-sm focus:border-slate-500 focus:outline-none focus:ring-2 focus:ring-slate-200" />
            </label>
            <label className="block text-sm font-medium text-slate-700">
              Days / hours
              <input value={daysRequired} onChange={(event) => setDaysRequired(event.target.value)} placeholder="Thursday, Friday" className="mt-1 block w-full rounded-2xl border border-slate-300 bg-white px-4 py-3 text-sm text-slate-900 shadow-sm focus:border-slate-500 focus:outline-none focus:ring-2 focus:ring-slate-200" />
            </label>
          </div>
          <label className="block text-sm font-medium text-slate-700">
            Job description
            <textarea value={description} onChange={(event) => setDescription(event.target.value)} rows={4} className="mt-1 block w-full rounded-3xl border border-slate-300 bg-white px-4 py-3 text-sm text-slate-900 shadow-sm focus:border-slate-500 focus:outline-none focus:ring-2 focus:ring-slate-200" />
          </label>
          <label className="block text-sm font-medium text-slate-700">
            Requirements / notes
            <textarea value={requirements} onChange={(event) => setRequirements(event.target.value)} rows={3} className="mt-1 block w-full rounded-3xl border border-slate-300 bg-white px-4 py-3 text-sm text-slate-900 shadow-sm focus:border-slate-500 focus:outline-none focus:ring-2 focus:ring-slate-200" />
          </label>
          <label className="block text-sm font-medium text-slate-700">
            Notes
            <textarea value={notes} onChange={(event) => setNotes(event.target.value)} rows={2} placeholder="Add private notes for this job" className="mt-1 block w-full rounded-3xl border border-slate-300 bg-white px-4 py-3 text-sm text-slate-900 shadow-sm focus:border-slate-500 focus:outline-none focus:ring-2 focus:ring-slate-200" />
          </label>
          <label className="block text-sm font-medium text-slate-700">
            Job alert / paste import
            <textarea value={rawText} onChange={(event) => setRawText(event.target.value)} rows={5} placeholder="Paste job alert email or ad text here" className="mt-1 block w-full rounded-3xl border border-slate-300 bg-slate-50 px-4 py-3 text-sm text-slate-900 shadow-sm focus:border-slate-500 focus:outline-none focus:ring-2 focus:ring-slate-200" />
          </label>
          <div className="flex flex-wrap gap-3">
            <button type="button" onClick={handleImport} className="rounded-full bg-slate-900 px-5 py-3 text-sm font-semibold text-white transition hover:bg-slate-700">Import text</button>
            <button type="submit" className="rounded-full bg-emerald-600 px-5 py-3 text-sm font-semibold text-white transition hover:bg-emerald-500">Save job</button>
          </div>
        </div>
        <aside className="space-y-4 rounded-3xl border border-slate-200 bg-slate-50 p-5">
          <div>
            <p className="text-sm font-semibold text-slate-900">Status & links</p>
            <p className="text-sm text-slate-600">Set the workflow stage and add a URL if available.</p>
          </div>
          <label className="block text-sm font-medium text-slate-700">
            Application status
            <select value={status} onChange={(event) => setStatus(event.target.value as JobRecord['status'])} className="mt-1 block w-full rounded-2xl border border-slate-300 bg-white px-4 py-3 text-sm shadow-sm focus:border-slate-500 focus:outline-none focus:ring-2 focus:ring-slate-200">
              {statusOptions.map((option) => (
                <option key={option} value={option}>{option}</option>
              ))}
            </select>
          </label>
          <label className="block text-sm font-medium text-slate-700">
            Job URL
            <input value={url} onChange={(event) => setUrl(event.target.value)} className="mt-1 block w-full rounded-2xl border border-slate-300 bg-white px-4 py-3 text-sm text-slate-900 shadow-sm focus:border-slate-500 focus:outline-none focus:ring-2 focus:ring-slate-200" />
          </label>
          <label className="block text-sm font-medium text-slate-700">
            Posted date
            <input value={postedDate} onChange={(event) => setPostedDate(event.target.value)} type="date" className="mt-1 block w-full rounded-2xl border border-slate-300 bg-white px-4 py-3 text-sm shadow-sm focus:border-slate-500 focus:outline-none focus:ring-2 focus:ring-slate-200" />
          </label>
          <label className="block text-sm font-medium text-slate-700">
            Closing date
            <input value={closingDate} onChange={(event) => setClosingDate(event.target.value)} type="date" className="mt-1 block w-full rounded-2xl border border-slate-300 bg-white px-4 py-3 text-sm shadow-sm focus:border-slate-500 focus:outline-none focus:ring-2 focus:ring-slate-200" />
          </label>
          <div className="rounded-3xl bg-white p-4 shadow-sm">
            <p className="text-sm font-semibold text-slate-900">Preview parsed details</p>
            <p className="mt-2 text-xs text-slate-600">Title: {parsed.title || '-'}</p>
            <p className="text-xs text-slate-600">Employer: {parsed.employer || '-'}</p>
            <p className="text-xs text-slate-600">Location: {parsed.location || '-'}</p>
            <p className="text-xs text-slate-600">URL: {parsed.url || '-'}</p>
          </div>
          <div className="rounded-3xl bg-white p-4 shadow-sm">
            <p className="text-sm font-semibold text-slate-900">Import CSV</p>
            <p className="mt-2 text-xs text-slate-600">Upload a CSV with headers like title, employer, location, payRate, url, profileTarget.</p>
            <input type="file" accept=".csv" onChange={handleCsvFile} className="mt-3 block w-full text-sm text-slate-900" />
          </div>
        </aside>
      </form>
    </section>
  );
}
