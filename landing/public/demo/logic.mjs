export function analyzePatterns(pool) {
  const advanced = row => row.outcomeHistory.some(e => ['offered', 'accepted', 'hired'].includes(e.stage));
  const totalAdvanced = pool.filter(advanced).length;
  const totalOthers = pool.length - totalAdvanced;
  return [...new Set(pool.flatMap(p => p.characteristics || []))].map(characteristic => {
    const evidence = pool.filter(p => p.characteristics?.includes(characteristic));
    return { characteristic, advanced: evidence.filter(advanced).length, advancedTotal: totalAdvanced, others: evidence.filter(p => !advanced(p)).length, othersTotal: totalOthers, sources: evidence.map(p => p.source), uncertainty: 'Small, selected sample; association does not establish performance or causation.' };
  });
}
export function makeHypothesis(opportunity) {
  const count = opportunity.history.previousApplicants.length;
  const context = [...opportunity.history.employeeInterviews, ...opportunity.history.managerInterviews];
  return [
    `For ${opportunity.title} (${opportunity.seniority}), evaluate demonstrated work rather than school or employer prestige.`,
    'Proposed criterion: structure ambiguous problems into testable questions.',
    'Proposed criterion: use data, check assumptions, and explain uncertainty.',
    'Proposed criterion: work with others and incorporate specific feedback.',
    count ? `Historical context: ${count} imported sample records; stage associations are suggestions, not performance labels.` : 'Historical context: no previous pool imported; historical patterns are unknown.',
    context.length ? `Work context: ${context.length} saved interview note(s); review their original wording alongside this draft.` : 'Work context: employee and manager interview evidence has not been supplied.',
    'Evidence will come from credentials, work proposals, and three voice-response transcripts; acoustic suitability is unassessed.',
    'Uncertainty: criteria and weight choices need manager approval; no model has been trained or validated by this demo.',
  ];
}
export function validWeights(weights) {
  if (!weights || typeof weights !== 'object' || Array.isArray(weights) || !['composite_profile', 'voice_transcript', 'voice_behaviors'].every(k => Object.hasOwn(weights,k))) return false;
  const values = Object.values(weights);
  return values.length === 3 && values.every(v => typeof v === 'number' && Number.isFinite(v) && v >= 0 && v <= 100) && Math.abs(values.reduce((a, b) => a + b, 0) - 100) < 1e-6;
}
export function assessDemo(application, policy) {
  const sample = application.isSample === true;
  const profile = sample ? 88 : null;
  const transcript = sample ? 86 : null;
  const delivery = null;
  const components = { composite_profile: profile, voice_transcript: transcript, voice_behaviors: delivery };
  const configured = policy.managerApproved && validWeights(policy.weights);
  const unknown = Object.entries(components).some(([key, value]) => policy.weights[key] > 0 && value === null);
  const overall = configured && !unknown ? Math.round(Object.entries(components).reduce((sum, [key, value]) => sum + (policy.weights[key] > 0 ? value * policy.weights[key] / 100 : 0), 0) * 10) / 10 : null;
  return { ...components, overall, isIllustrative: true, policyVersion: policy.version, evidence: sample ? ['Credentials: food-cooperative problem decomposition.', 'Answer 2: scenario checks and a proposed pilot.', 'Answer 3: revised a conclusion after teammate feedback.'] : [], gaps: sample ? ['No original recordings in the sample-answer path.', 'No job-performance evidence; references are unverified.', 'Vocal delivery is unassessed.'] : ['Live evaluation is not connected. Your entries do not receive fabricated fit scores.'], reason: sample ? 'Prewritten fixture scores demonstrate the review layout; they are not calculated from your edits.' : 'Evidence is saved locally for the walkthrough; a backend evaluator is still needed.' };
}
export function canSubmit(applicant, opportunity, answers) {
  return applicant.onboarded && opportunity.scoring.managerApproved && answers.length === opportunity.questions.forApplicants.length && answers.every((a,i) => a.questionId === opportunity.questions.forApplicants[i].id && a.reviewedTranscript?.trim() && (a.isSample === true || a.audio?.blobId));
}
export function summary(opportunity) {
  return { id: opportunity.id, title: opportunity.title, team: opportunity.team, seniority: opportunity.seniority, questions: opportunity.questions.forApplicants.map(q => ({ id: q.id, text: q.text })), isDemo: true };
}
