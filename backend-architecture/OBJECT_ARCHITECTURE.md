# Sauce — four main objects

This is the current architecture for Sagar, Danish and the frontend team. There are exactly four main objects: **Organization, HiringManager, Applicant and Opportunity**. Everything else is nested data. This replaces the earlier two-object and Person-based explanations.

## The four objects

```text
Organization
  id, name
  organizationMarkdown
  teams[]
  hiringManagerIds[]
  opportunityIds[]

HiringManager
  id, name, contactInformation
  organizationId
  opportunityIds[]

Applicant
  id, name
  credentials                 academic/work history + original files
  workProposal                work they want + original file
  contactInformation          LinkedIn, email, phone
  references[]
  opportunityIds[]

Opportunity                   the whole job and its applications
  id, organizationId, hiringManagerId
  title, team, seniority
  jobDescription              Markdown + current requirements
  managerVision               original voice + transcript
  organizationContext         reference/copy of the organization's MD
  questions
    forApplicants[]           maximum 3; answers are voice based
    fromApplicants[]          applicant asks; employer replies
  scoring
    criteria[]
    weights                   profile / transcript / vocal delivery
    managerApproved
  applications[]
    applicantId
    submittedProfile          copy of credentials/proposal/contacts
    voiceAnswers[]            question + audio + transcript
    assessment                three results, evidence and gaps
    status
    outcomeHistory[]          shortlisted / offered / accepted / hired
  history
    previousApplicants[]      imported resumes and recorded stages
    employeeInterviews[]
    managerInterviews[]
    patternNotes[]
    hiringSummary             optional 7–8-line hypothesis
    previousRevisions[]
```

**Opportunity means the complete job container:** the job description/listing, its questions, applications, answers and results. A job application is an entry in `Opportunity.applications[]`, not a fifth main object. Questions, files, assessments and history are also nested fields, not additional main resources. `Person` is not a main object in this design.

The manager still provides three inputs: organization MD, JD MD and voice vision. Organization owns the organization MD; Opportunity references it and stores the JD/vision. The applicant still provides three sections: credentials, work proposal, and contacts/references. Opportunity captures the applicant's submitted information so later profile edits do not change an earlier application.

## The basic workflow

1. **Manager creates an opportunity:** choose organization, add the JD and voice vision, approve up to three questions and set scoring criteria/weights.
2. **Applicant applies:** supply the three profile sections, answer the questions by voice and submit. They can also ask the employer questions.
3. **Manager reviews:** see the three assessments, supporting evidence and gaps, then record the outcome.

Historical imports, employee interviews, pattern suggestions and the hiring hypothesis are optional tools within `Opportunity.history`. They enrich the same job; they are not required screens or extra stages in the basic flow. Any proposed changes stay reviewable by the manager.

## Keep implementation simple too

Expose these four object shapes to the frontend. Internal storage can index nested entries and keep revision IDs without introducing more product objects or workflows. Keep original files/audio and reviewed transcripts, scope private applications to their applicant and authorized managers, and record corrections without rewriting submitted evidence.

The three assessments remain profile/credential fit, transcript content, and explicitly approved observable vocal delivery. Manager weights belong to `Opportunity.scoring`; assessment results belong to each nested application. Missing evidence stays unknown. Contacts do not affect fit, and audio analysis does not infer emotions or personality for hiring. Historical stages stay distinct; accepted does not imply hired. Saving recordings is not model training.

Read [the short Danish handoff](../docs/DANISH_OBJECT_AND_VOICE_HANDOFF.md), [frontend handoff](../docs/FRONTEND_HANDOFF.md), and [four-object example](examples/four-object-example.json). This is a design contract; a working hiring backend is not implemented yet.
