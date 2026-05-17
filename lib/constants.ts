export const APPLICANT_STATUSES = [
  { value: 'applied', label: 'Just Applied', color: 'bg-gray-100 text-gray-700', dot: 'bg-gray-400' },
  { value: 'assessment_scheduled', label: 'Assessment Booked', color: 'bg-blue-50 text-blue-700', dot: 'bg-blue-500' },
  { value: 'assessment_done', label: 'Scores Needed', color: 'bg-indigo-50 text-indigo-700', dot: 'bg-indigo-500' },
  { value: 'course_matched', label: 'Ready to Interview', color: 'bg-violet-50 text-violet-700', dot: 'bg-violet-500' },
  { value: 'interview_scheduled', label: 'Interview Booked', color: 'bg-amber-50 text-amber-700', dot: 'bg-amber-500' },
  { value: 'interviewed', label: 'Awaiting Decision', color: 'bg-orange-50 text-orange-700', dot: 'bg-orange-500' },
  { value: 'enrolled', label: 'Enrolled', color: 'bg-green-50 text-green-700', dot: 'bg-green-500' },
  { value: 'deferred', label: 'Deferred', color: 'bg-yellow-50 text-yellow-700', dot: 'bg-yellow-400' },
  { value: 'rejected', label: 'Rejected', color: 'bg-red-50 text-red-700', dot: 'bg-red-500' },
] as const

export type ApplicantStatus = typeof APPLICANT_STATUSES[number]['value']

export const STATUS_ORDER: ApplicantStatus[] = [
  'applied',
  'assessment_scheduled',
  'assessment_done',
  'course_matched',
  'interview_scheduled',
  'interviewed',
  'enrolled',
  'deferred',
  'rejected',
]

export const ACTIVE_STAGES: ApplicantStatus[] = [
  'applied',
  'assessment_scheduled',
  'assessment_done',
  'course_matched',
  'interview_scheduled',
  'interviewed',
]

export const TERMINAL_STAGES: ApplicantStatus[] = ['enrolled', 'deferred', 'rejected']

// The 6 pipeline steps shown in the progress stepper (excludes terminal outcomes)
export const STAGE_STEPS = [
  'applied',
  'assessment_scheduled',
  'assessment_done',
  'course_matched',
  'interview_scheduled',
  'interviewed',
] as const

export const STEP_LABELS: Record<string, string> = {
  applied: 'Applied',
  assessment_scheduled: 'Assessment',
  assessment_done: 'Scored',
  course_matched: 'Course Set',
  interview_scheduled: 'Interview',
  interviewed: 'Decision',
}

// Plain-English guidance shown at the top of each stage's action card
export const STAGE_PROMPTS: Record<string, { heading: string; guidance: string }> = {
  applied: {
    heading: 'Schedule their assessment',
    guidance: 'Choose a date and time for the English & Maths test, then send them the invitation email.',
  },
  assessment_scheduled: {
    heading: 'Enter their scores after the assessment',
    guidance: "Once they've completed the bksb test, record their English and Maths scores below, then mark it done.",
  },
  assessment_done: {
    heading: 'Get an AI recommendation, then confirm their course',
    guidance: 'Run AI analysis to see which courses suit this applicant, confirm the course, and schedule the interview.',
  },
  course_matched: {
    heading: 'Schedule the interview',
    guidance: 'Pick a date and time for the course interview, then send the invitation email.',
  },
  interview_scheduled: {
    heading: 'Interview booked: record the outcome after',
    guidance: 'After the interview takes place, come back here to enrol, defer, or decline the applicant.',
  },
  interviewed: {
    heading: 'Make a decision',
    guidance: 'Enrol this applicant on their course, defer them to another intake or level, or decline their application.',
  },
}

export const REJECTION_REASONS = [
  'Insufficient qualifications',
  'Course full, next intake',
  'No response from applicant',
  'Withdrew application',
  'Does not meet entry requirements',
  'Deferred to lower-level course',
  'Other',
]

export const SOURCE_OPTIONS = [
  { value: 'website', label: 'College Website' },
  { value: 'walk-in', label: 'Walk-in' },
  { value: 'referral', label: 'Referral' },
  { value: 'open-day', label: 'Open Day' },
  { value: 'phone', label: 'Phone Enquiry' },
  { value: 'social-media', label: 'Social Media' },
  { value: 'school', label: 'School / Sixth Form' },
  { value: 'other', label: 'Other' },
]

export const EVENT_LABELS: Record<string, string> = {
  status_changed: 'Status updated',
  cv_uploaded: 'CV uploaded',
  ai_analysis: 'AI analysis run',
  scores_recorded: 'Assessment scores recorded',
  assessment_scheduled: 'Assessment scheduled',
  interview_scheduled: 'Interview scheduled',
  note_added: 'Note added',
  enrolled: 'Enrolled',
  rejected: 'Application declined',
  deferred: 'Deferred',
}
