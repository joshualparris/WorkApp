import { useEffect, useMemo, useState } from 'react';
import { Download, Filter, FolderOpen, Inbox, ShieldCheck, Sparkles, Users } from 'lucide-react';
import { JobForm } from './components/JobForm';
import { JobCard } from './components/JobCard';
import { JobDetail } from './components/JobDetail';
import { seedJobs } from './data/seedJobs';
import { scoreJob } from './data/scoring';
import { useLocalStorageState } from './hooks/useLocalStorageState';
import type { JobRecord, ProfileTarget } from './types';

const profileNames: Record<ProfileTarget, string> = {
  josh: 'Josh',
  kristy: 'Kristy',
};

const dedupeJobs = (jobs: JobRecord[]) => {
  const seen = new Set<string>();
  return jobs.filter((job) => {
    const key = [job.title.toLowerCase(), job.employer.toLowerCase(), job.location.toLowerCase(), job.url.toLowerCase(), job.postedDate].join('|');
    if (seen.has(key)) return false;
    seen.add(key);
    return true;
  });
};

function App() {
  const [jobs, setJobs] = useLocalStorageState<JobRecord[]>('dubbo-job-radar-jobs', []);
  const [selectedProfile, setSelectedProfile] = useState<ProfileTarget>('josh');
  const [statusFilter, setStatusFilter] = useState('All');
  const [selectedJobId, setSelectedJobId] = useState<string | null>(null);
  const [searchQuery, setSearchQuery] = useState('');

  useEffect(() => {
    if (jobs.length === 0) {
      setJobs(seedJobs.map((job) => scoreJob(job)));
    }
  }, [jobs.length, setJobs]);

  const addJob = (job: JobRecord) => {
    setJobs((current) => dedupeJobs([job, ...current]));
    setSelectedJobId(job.id);
  };

  const updateStatus = (jobId: string, status: JobRecord['status']) => {
    setJobs((current) => current.map((job) => (job.id === jobId ? { ...job, status, updatedAt: new Date().toISOString() } : job)));
  };

  const saveNotes = (jobId: string, notes: string) => {
    setJobs((current) => current.map((job) => (job.id === jobId ? { ...job, notes, updatedAt: new Date().toISOString() } : job)));
  };

  const selectedJob = jobs.find((job) => job.id === selectedJobId) ?? null;

  const filteredJobs = useMemo(() => {
    return jobs
      .filter((job) => job.profileTarget === selectedProfile)
      .filter((job) => statusFilter === 'All' || job.status === statusFilter)
      .filter((job) => searchQuery === '' || [job.title, job.employer, job.location, job.description].some((field) => field.toLowerCase().includes(searchQuery.toLowerCase())));
  }, [jobs, selectedProfile, statusFilter, searchQuery]);

  const topJobs = useMemo(() => {
    return filteredJobs.slice().sort((a, b) => b.matchScore - a.matchScore).slice(0, 5);
  }, [filteredJobs]);

  const urgentJobs = useMemo(() => jobs.filter((job) => job.closingDate && job.status !== 'Accepted' && job.status !== 'Rejected' && job.status !== 'Archived' && new Date(job.closingDate).getTime() - Date.now() < 1000 * 60 * 60 * 24 * 5), [jobs]);

  const newJobsCount = jobs.filter((job) => job.status === 'New').length;
  const inProgressCount = jobs.filter((job) => ['Shortlisted', 'Asked Question', 'Applied', 'Interview'].includes(job.status)).length;

  return (
    <div className="min-h-screen bg-slate-50 px-4 py-6 sm:px-6 lg:px-10">
      <header className="mx-auto flex max-w-7xl flex-col gap-6 rounded-[2rem] border border-slate-200 bg-white p-6 shadow-soft">
        <div className="flex flex-col gap-4 lg:flex-row lg:items-center lg:justify-between">
          <div>
            <p className="text-sm uppercase tracking-[0.3em] text-emerald-600">Dubbo Job Radar</p>
            <h1 className="mt-2 text-3xl font-semibold text-slate-900 sm:text-4xl">Work tracking for Josh and Kristy</h1>
            <p className="mt-3 max-w-2xl text-sm leading-6 text-slate-600">Manual job imports, scoring, application workflow, and a calm dashboard for Thursday/Friday Dubbo work and Kristy’s nursing roles.</p>
          </div>
          <div className="grid gap-3 sm:grid-cols-2">
            <div className="rounded-3xl bg-emerald-600 px-5 py-4 text-white shadow-soft">
              <p className="text-xs uppercase tracking-[0.24em] text-emerald-100">New opportunities</p>
              <p className="mt-3 text-3xl font-semibold">{newJobsCount}</p>
            </div>
            <div className="rounded-3xl bg-slate-900 px-5 py-4 text-white shadow-soft">
              <p className="text-xs uppercase tracking-[0.24em] text-slate-300">In progress</p>
              <p className="mt-3 text-3xl font-semibold">{inProgressCount}</p>
            </div>
          </div>
        </div>
        <div className="grid gap-4 sm:grid-cols-3">
          <div className="rounded-3xl bg-slate-50 p-5 shadow-sm">
            <p className="text-xs uppercase tracking-[0.24em] text-slate-500">Top profile</p>
            <p className="mt-2 text-lg font-semibold text-slate-900">{profileNames[selectedProfile]}</p>
          </div>
          <div className="rounded-3xl bg-slate-50 p-5 shadow-sm">
            <p className="text-xs uppercase tracking-[0.24em] text-slate-500">Urgent closing soon</p>
            <p className="mt-2 text-lg font-semibold text-slate-900">{urgentJobs.length}</p>
          </div>
          <div className="rounded-3xl bg-slate-50 p-5 shadow-sm">
            <p className="text-xs uppercase tracking-[0.24em] text-slate-500">Jobs saved</p>
            <p className="mt-2 text-lg font-semibold text-slate-900">{jobs.length}</p>
          </div>
        </div>
      </header>

      <main className="mx-auto mt-8 grid max-w-7xl gap-8 lg:grid-cols-[1.3fr_0.95fr]">
        <section className="space-y-8">
          <div className="grid gap-4 lg:grid-cols-[1fr_320px]">
            <div className="rounded-3xl border border-slate-200 bg-white p-6 shadow-soft">
              <div className="flex flex-col gap-4 sm:flex-row sm:items-end sm:justify-between">
                <div>
                  <p className="text-sm font-semibold text-slate-900">Best matches for {profileNames[selectedProfile]}</p>
                  <p className="mt-2 text-sm text-slate-600">Sorted by score and fit.</p>
                </div>
                <div className="grid gap-3 sm:grid-cols-2">
                  <button className="inline-flex items-center justify-center gap-2 rounded-full bg-slate-900 px-4 py-3 text-sm font-semibold text-white transition hover:bg-slate-700"><Users className="h-4 w-4" /> {profileNames[selectedProfile]}</button>
                </div>
              </div>
              <div className="mt-6 grid gap-4">
                {topJobs.map((job) => (
                  <JobCard key={job.id} job={job} onSelect={(item) => setSelectedJobId(item.id)} />
                ))}
                {topJobs.length === 0 && <p className="text-sm text-slate-600">No matching jobs yet. Add a job alert or paste a role to score it.</p>}
              </div>
            </div>
            <div className="grid gap-4">
              <div className="rounded-3xl border border-slate-200 bg-white p-6 shadow-soft">
                <div className="flex items-center gap-3 text-slate-900">
                  <Inbox className="h-5 w-5" />
                  <div>
                    <p className="text-sm font-semibold">Live job feed inbox</p>
                    <p className="text-sm text-slate-600">Manual paste + CSV import for today’s leads.</p>
                  </div>
                </div>
              </div>
              <div className="rounded-3xl border border-slate-200 bg-white p-6 shadow-soft">
                <div className="flex items-center gap-3 text-slate-900">
                  <Filter className="h-5 w-5" />
                  <div>
                    <p className="text-sm font-semibold">Current filters</p>
                    <p className="text-sm text-slate-600">Profile, status, search query.</p>
                  </div>
                </div>
              </div>
              <div className="rounded-3xl border border-slate-200 bg-white p-6 shadow-soft">
                <div className="flex items-center gap-3 text-slate-900">
                  <FolderOpen className="h-5 w-5" />
                  <div>
                    <p className="text-sm font-semibold">Application tracker</p>
                    <p className="text-sm text-slate-600">Track progress from New to Interview and Accepted.</p>
                  </div>
                </div>
              </div>
            </div>
          </div>

          <JobForm onSave={addJob} />

          <section className="rounded-3xl border border-slate-200 bg-white p-6 shadow-soft">
            <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
              <div>
                <p className="text-sm font-semibold text-slate-900">{profileNames[selectedProfile]} role feed</p>
                <p className="mt-2 text-sm text-slate-600">Browse saved jobs, shortlist, and review details.</p>
              </div>
              <div className="grid gap-2 sm:grid-cols-3">
                <button onClick={() => setSelectedProfile('josh')} className={`rounded-full px-4 py-2 text-sm font-semibold transition ${selectedProfile === 'josh' ? 'bg-slate-900 text-white' : 'bg-slate-100 text-slate-700 hover:bg-slate-200'}`}>Josh</button>
                <button onClick={() => setSelectedProfile('kristy')} className={`rounded-full px-4 py-2 text-sm font-semibold transition ${selectedProfile === 'kristy' ? 'bg-slate-900 text-white' : 'bg-slate-100 text-slate-700 hover:bg-slate-200'}`}>Kristy</button>
              </div>
            </div>
            <div className="mt-6 grid gap-4 md:grid-cols-[1fr_220px]">
              <div className="space-y-4">
                <div className="grid gap-3 sm:grid-cols-3">
                  <label className="block text-sm text-slate-700">
                    Search
                    <input value={searchQuery} onChange={(event) => setSearchQuery(event.target.value)} placeholder="Keyword, location, employer" className="mt-2 block w-full rounded-2xl border border-slate-300 bg-white px-4 py-3 text-sm shadow-sm focus:border-slate-500 focus:outline-none focus:ring-2 focus:ring-slate-200" />
                  </label>
                  <label className="block text-sm text-slate-700">
                    Status
                    <select value={statusFilter} onChange={(event) => setStatusFilter(event.target.value)} className="mt-2 block w-full rounded-2xl border border-slate-300 bg-white px-4 py-3 text-sm shadow-sm focus:border-slate-500 focus:outline-none focus:ring-2 focus:ring-slate-200">
                      <option>All</option>
                      <option>New</option>
                      <option>Shortlisted</option>
                      <option>Asked Question</option>
                      <option>Applied</option>
                      <option>Interview</option>
                      <option>Rejected</option>
                      <option>Accepted</option>
                      <option>Archived</option>
                    </select>
                  </label>
                </div>
                <div className="grid gap-4">
                  {filteredJobs.length === 0 ? (
                    <p className="text-sm text-slate-600">No saved jobs match these filters.</p>
                  ) : (
                    filteredJobs.map((job) => (
                      <div key={job.id} className="rounded-3xl border border-slate-200 bg-slate-50 p-4">
                        <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
                          <div>
                            <p className="font-semibold text-slate-900">{job.title}</p>
                            <p className="text-sm text-slate-600">{job.employer} · {job.location}</p>
                          </div>
                          <button onClick={() => setSelectedJobId(job.id)} className="rounded-full bg-slate-900 px-4 py-2 text-sm font-semibold text-white transition hover:bg-slate-700">Review</button>
                        </div>
                        <p className="mt-3 text-sm text-slate-700">{job.fitLabel} · Score {job.matchScore} · {job.status}</p>
                      </div>
                    ))
                  )}
                </div>
              </div>
              <aside className="space-y-4 rounded-3xl border border-slate-200 bg-slate-50 p-5">
                <div className="rounded-3xl bg-white p-4 shadow-sm">
                  <div className="flex items-center gap-2 text-slate-900">
                    <Sparkles className="h-5 w-5" />
                    <p className="text-sm font-semibold">Quick prompts</p>
                  </div>
                  <ul className="mt-3 space-y-2 text-sm text-slate-600">
                    <li>Keep the app focused on Thursday/Friday Dubbo work for Josh.</li>
                    <li>Flag Kristy nursing roles and avoid aged care.</li>
                    <li>Use the inquiry note when the fit label is Ask questions first.</li>
                    <li>Track progress from New to Accepted in the job workflow.</li>
                  </ul>
                </div>
                <div className="rounded-3xl bg-white p-4 shadow-sm">
                  <div className="flex items-center gap-2 text-slate-900">
                    <Download className="h-5 w-5" />
                    <p className="text-sm font-semibold">Export support</p>
                  </div>
                  <p className="mt-3 text-sm text-slate-600">Copy job summaries from the detail panel to use in applications and follow-ups.</p>
                </div>
              </aside>
            </div>
          </section>
        </section>

        <aside className="space-y-8">
          <section className="rounded-3xl border border-slate-200 bg-white p-6 shadow-soft">
            <div className="flex items-center gap-3 text-slate-900">
              <ShieldCheck className="h-5 w-5" />
              <div>
                <p className="text-sm font-semibold">Job scoring engine</p>
                <p className="text-sm text-slate-600">Scores jobs for Josh and Kristy separately based on availability, role fit, income, sustainability and pathway.</p>
              </div>
            </div>
          </section>
          {selectedJob ? (
            <JobDetail job={selectedJob} onUpdateStatus={updateStatus} onSaveNotes={saveNotes} />
          ) : (
            <section className="rounded-3xl border border-slate-200 bg-white p-6 shadow-soft">
              <p className="text-sm font-semibold text-slate-900">Select a job to review details</p>
              <p className="mt-3 text-sm text-slate-600">Pick a saved role from the list to see score breakdown, questions and application advice.</p>
            </section>
          )}
          <section className="rounded-3xl border border-slate-200 bg-white p-6 shadow-soft">
            <div className="flex items-center gap-3 text-slate-900">
              <FolderOpen className="h-5 w-5" />
              <div>
                <p className="text-sm font-semibold">Weekly planning</p>
                <p className="text-sm text-slate-600">Keep track of which roles need follow-up and which roles are strong fits.</p>
              </div>
            </div>
          </section>
        </aside>
      </main>
    </div>
  );
}

export default App;
