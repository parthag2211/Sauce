export const SOURCES = [
  ['cv', 'CV archive', 'CV'], ['github', 'GitHub', 'GH'], ['arxiv', 'arXiv', 'aX'],
  ['hf', 'Hugging Face', 'HF'], ['scholar', 'Google Scholar', 'GS'], ['orcid', 'ORCID', 'iD'],
  ['labs', 'Lab pages', 'LP'], ['semantic', 'Semantic Scholar', 'SS'], ['openreview', 'OpenReview', 'OR'],
  ['patents', 'Patents', 'PT'], ['portfolio', 'Portfolios', 'PF'], ['linkedin', 'LinkedIn', 'in']
];
export const BUCKETS = { interview: 'Definitely interview', maybe: 'Maybe', reject: 'Reject' };
export const PRESETS = {
  scientist: { title: 'Research Scientist', focus: 'Robot learning', level: 'Senior', limit: 5 },
  engineer: { title: 'ML Engineer', focus: 'Machine learning', level: 'Mid-level', limit: 3 },
  robotics: { title: 'Robotics Engineer', focus: 'Robotics', level: 'Junior', limit: 2 }
};
const FIRST = ['Jordan', 'Avery', 'Morgan', 'Taylor', 'Casey', 'Robin', 'Jamie', 'Drew', 'Cameron', 'Riley', 'Quinn', 'Skyler', 'Reese', 'Blair', 'Emerson', 'Hayden'];
const LAST = ['Williams', 'Patel', 'Garcia', 'Brown', 'Kim', 'Wilson', 'Singh', 'Thomas', 'Lee', 'Davis', 'Martin', 'Lewis', 'Clark', 'Walker', 'Hall', 'Allen'];
const NAMED = ['Dr. Alex Rivera', 'Dr. Maya Chen', 'Dr. Sam Okafor', 'Dr. Priya Nair', 'Dr. Leo Park', 'Dr. Jordan Lee', 'Dr. Avery Patel', 'Dr. Morgan Garcia'];
export function seedHistory() {
  const names = ['Dr. Aria Stone','Dr. James Lin','Dr. Ellis Cole','Dr. Nina Shah'];
  return Array.from({length:10000},(_,i)=>({
    name:names[i]||`${FIRST[i%16]} ${LAST[Math.floor(i/16)%16]} ${Math.floor(i/256)+1}`,
    outcome:i<84?'Hired':i<384?'Interviewed':'Not selected',
    skills:i<84?'RL / VLA research, physical robots, public code and reproducible benchmarks':i%2?'Offline prediction research':'Simulation-only research'
  }));
}

export function seedCandidates() {
  return Array.from({ length: 2400 }, (_, i) => {
    const definite = i < 5, maybe = i >= 5 && i < 52, relevant = i < 1248;
    const type = i % 3;
    return {
      id: `candidate-${i + 1}`, name: NAMED[i] || `${FIRST[i % FIRST.length]} ${LAST[Math.floor(i / FIRST.length) % LAST.length]} ${Math.floor(i / 256) + 1}`,
      role: relevant ? 'Research Scientist' : 'Business Analyst', focus: relevant ? 'Robot learning' : 'Business operations',
      cvFit: relevant, expertise: relevant, problemSolving: definite || maybe || type !== 1,
      research: definite || maybe || type === 1, code: definite ? true : maybe ? (type === 0 ? null : true) : type === 0,
      robots: definite ? true : maybe ? (type === 1 ? null : true) : type === 2,
      authorization: definite ? true : maybe ? null : type !== 0,
      claim: definite ? 'I built action-generating policies for real robots.' : maybe ? 'I developed learning systems for robotics research.' : 'I built machine learning models for offline experiments.',
      contribution: definite ? 'First author' : maybe ? 'Co-author' : 'Unverified',
      paper: definite ? 'Action-generating policies for dexterous robot learning' : 'Learning from visual demonstrations',
      benchmark: definite ? '82% task success across 50 physical robot trials' : 'Offline evaluation on simulated tasks',
      cv: relevant ? 'PhD in Machine Learning. Robot learning, reinforcement learning, and visual policies. Developed reproducible research systems.' : 'Business analytics and reporting. No robot learning experience in the submitted CV.',
      notes: '', overrides: null
    };
  });
}

export function newState() {
  return {
    version: 3, view: 'brain', preset: 'scientist', role: { ...PRESETS.scientist },
    context: {
      company: 'Northstar Robotics',
      companyBrain: 'Build reliable robot learning systems that work outside the lab.',
      team: 'Robot learning team. Research scientists and engineers work together from paper to deployment.',
      role: 'Own action-generating policies. Publish research, release code, and prove results on physical robots.',
      process: 'Review supporting evidence. Interview at most five people. A hiring manager makes every final decision.'
    },
    criteria: [
      { id: 'research', label: 'First-author RL / VLA work', dimension: 'Expertise', required: true, enabled: true },
      { id: 'code', label: 'Public code, models and benchmarks', dimension: 'Problem solving', required: true, enabled: true },
      { id: 'robots', label: 'Real-robot evaluation', dimension: 'Problem solving', required: true, enabled: true },
      { id: 'authorization', label: 'US work authorization', dimension: 'Role requirement', required: true, enabled: true }
    ],
    approved: false, hypothesis: false, screening: false, researched: false,
    sources: SOURCES.map(([id]) => ({ id, enabled: true, status: 'Ready' })),
    imported: null, importedHistory: null, decisions: {}, selected: [], outcomes: {}, notes: {}, history: [],
    learning: [], researchRun: 0, bucket: 'interview', query: '', page: 1
  };
}

export function criterionState(candidate, criterion, state) {
  const sourceGroups = { research: ['arxiv','scholar','semantic','openreview'], code: ['github','hf','portfolio'], robots: ['labs','portfolio'] };
  if (state && sourceGroups[criterion.id] && !state.sources.some(s => sourceGroups[criterion.id].includes(s.id) && s.enabled)) return 'unknown';
  if (criterion.id === 'research' && candidate.research && candidate.contribution !== 'First author') return 'unknown';
  const value = candidate[criterion.id];
  return value === true ? 'meets' : value === false ? 'mismatch' : 'unknown';
}
export function evaluate(candidate, state) {
  const override = state.decisions[candidate.id];
  if (override) return override;
  const checks = state.criteria.filter(c => c.enabled).map(c => ({ ...c, state: criterionState(candidate, c, state) }));
  if (checks.some(c => c.required && c.state === 'mismatch')) return 'reject';
  if (checks.some(c => c.required && c.state === 'unknown')) return 'maybe';
  return 'interview';
}
export function candidates(state) { return state.imported || seedCandidates(); }
export function screeningPool(state) { return candidates(state).filter(c => c.cvFit !== false); }
export function counts(state) {
  const pool = screeningPool(state);
  return pool.reduce((acc, c) => { acc[evaluate(c, state)]++; return acc; }, { interview: 0, maybe: 0, reject: 0 });
}

export function parseCSV(text) {
  const rows = []; let row = [], field = '', quoted = false;
  for (let i = 0; i < text.length; i++) {
    const ch = text[i];
    if (ch === '"' && quoted && text[i + 1] === '"') { field += '"'; i++; }
    else if (ch === '"') quoted = !quoted;
    else if (ch === ',' && !quoted) { row.push(field.trim()); field = ''; }
    else if ((ch === '\n' || ch === '\r') && !quoted) {
      if (ch === '\r' && text[i + 1] === '\n') i++;
      row.push(field.trim()); if (row.some(Boolean)) rows.push(row); row = []; field = '';
    } else field += ch;
  }
  row.push(field.trim()); if (row.some(Boolean)) rows.push(row);
  if (quoted) throw new Error('CSV has an unclosed quote.');
  const header = rows.shift()?.map(h => h.trim().toLowerCase());
  if (!header?.includes('name')) throw new Error('The file needs a name column.');
  return rows.map(r => Object.fromEntries(header.map((h, i) => [h, r[i] || ''])));
}
export function parseFile(text, filename) {
  let rows = filename.toLowerCase().endsWith('.json') ? JSON.parse(text) : parseCSV(text);
  if (!Array.isArray(rows) || !rows.length) throw new Error('Add at least one record.');
  if (rows.length > 10000) throw new Error('Use 10,000 records or fewer.');
  return rows;
}
export function normalizeCandidates(rows) {
  const bool = v => v === true || String(v).toLowerCase() === 'true' ? true : v === false || String(v).toLowerCase() === 'false' ? false : null;
  return rows.map((r, i) => {
    if (typeof r.name !== 'string' || !r.name.trim()) throw new Error(`Record ${i + 1} needs a name.`);
    return { id: `import-${i + 1}`, name: r.name.trim().slice(0,120), role: String(r.role || 'Research Scientist'),
      focus: String(r.focus || 'Robot learning'), cvFit: bool(r.cvfit ?? r.cvFit) !== false, research: bool(r.research),
      contribution: String(r.contribution || 'Unknown'), code: bool(r.code), robots: bool(r.robots), authorization: bool(r.authorization),
      claim: String(r.claim || 'Candidate-supplied experience.'), paper: String(r.paper || 'Evidence not supplied'),
      benchmark: String(r.benchmark || 'Evidence not supplied'), cv: String(r.cv || 'CV details not supplied.') };
  });
}
