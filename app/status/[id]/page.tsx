import { db } from '@/lib/db'
import { applicants, courses, organisations } from '@/drizzle/schema'
import { eq } from 'drizzle-orm'
import { notFound } from 'next/navigation'
import { format } from 'date-fns'
import { CheckCircle2, Circle, Clock } from 'lucide-react'
import { cn } from '@/lib/utils'

const STATUS_STEPS = [
  { key: 'applied', label: 'Application received', description: 'Your application has been submitted and is with our admissions team.' },
  { key: 'assessment_scheduled', label: 'Assessment booked', description: 'Your English & Maths assessment has been scheduled.' },
  { key: 'assessment_done', label: 'Assessment complete', description: 'Your assessment results are being reviewed.' },
  { key: 'course_matched', label: 'Course confirmed', description: 'A course has been identified for you based on your assessment.' },
  { key: 'interview_scheduled', label: 'Interview booked', description: 'Your course interview has been scheduled.' },
  { key: 'interviewed', label: 'Interview complete', description: 'Your interview is done. A decision is being made.' },
  { key: 'enrolled', label: 'Enrolled', description: 'Congratulations! You have been enrolled on your course.' },
]

const STATUS_ORDER = ['applied', 'assessment_scheduled', 'assessment_done', 'course_matched', 'interview_scheduled', 'interviewed', 'enrolled']

function getNextStepMessage(status: string, assessmentDate: Date | null, interviewDate: Date | null, courseName: string | null): string {
  const now = new Date()
  switch (status) {
    case 'applied':
      return 'Our admissions team will contact you within 3 working days to schedule your assessment.'
    case 'assessment_scheduled':
      if (assessmentDate && assessmentDate > now) {
        return `Your assessment is on ${format(assessmentDate, 'EEEE d MMMM')} at ${format(assessmentDate, 'HH:mm')}. Please arrive 10 minutes early and bring photo ID.`
      }
      return 'Your assessment date has been confirmed. Check your email for details.'
    case 'assessment_done':
      return 'Your assessment results are being reviewed. We will be in touch within 5 working days about the next step.'
    case 'course_matched':
      return courseName
        ? `You've been matched to ${courseName}. We'll be in touch to schedule your course interview.`
        : 'A course has been confirmed for you. We\'ll be in touch to schedule your interview.'
    case 'interview_scheduled':
      if (interviewDate && interviewDate > now) {
        return `Your interview is on ${format(interviewDate, 'EEEE d MMMM')} at ${format(interviewDate, 'HH:mm')}. Please bring any relevant qualifications.`
      }
      return 'Your interview date is confirmed. Check your email for details.'
    case 'interviewed':
      return 'Your interview is complete. Our team will contact you with a decision within 5 working days.'
    case 'enrolled':
      return courseName
        ? `Welcome to ${courseName}! Our team will be in touch with details about your start date.`
        : 'Congratulations on your enrolment! We will be in touch with your start date soon.'
    default:
      return 'Our admissions team will be in touch with you soon.'
  }
}

export default async function StatusPage({ params }: { params: { id: string } }) {
  // Basic UUID format check
  const uuidRegex = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i
  if (!uuidRegex.test(params.id)) notFound()

  const [result] = await db
    .select({ applicant: applicants, courseName: courses.name, orgName: organisations.name })
    .from(applicants)
    .leftJoin(courses, eq(applicants.matchedCourseId, courses.id))
    .leftJoin(organisations, eq(applicants.orgId, organisations.id))
    .where(eq(applicants.id, params.id))
    .limit(1)

  if (!result) notFound()

  const { applicant, courseName, orgName } = result
  const isDeclined = applicant.status === 'rejected'
  const isDeferred = applicant.status === 'deferred'
  const isEnrolled = applicant.status === 'enrolled'
  const currentIdx = STATUS_ORDER.indexOf(applicant.status)
  const ref = applicant.id.slice(0, 8).toUpperCase()

  const nextStep = getNextStepMessage(
    applicant.status,
    applicant.assessmentDate ? new Date(applicant.assessmentDate) : null,
    applicant.interviewDate ? new Date(applicant.interviewDate) : null,
    courseName
  )

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Header */}
      <div className="bg-[#473FCF] text-white px-6 py-5">
        <div className="max-w-lg mx-auto flex items-center justify-between">
          <div>
            <p className="text-white/60 text-xs font-medium uppercase tracking-widest mb-0.5">Flax Admissions</p>
            <p className="text-white font-semibold">{orgName}</p>
          </div>
          <div className="text-right">
            <p className="text-white/60 text-xs">Reference</p>
            <p className="text-white font-mono font-semibold text-sm">#{ref}</p>
          </div>
        </div>
      </div>

      <div className="max-w-lg mx-auto px-6 py-8">
        {/* Greeting */}
        <div className="mb-6">
          <h1 className="text-2xl font-bold text-gray-900 mb-1">Hi {applicant.name.split(' ')[0]}!</h1>
          <p className="text-gray-500 text-sm">Here&apos;s the latest on your application to {orgName}.</p>
        </div>

        {/* Declined / Deferred special states */}
        {isDeclined && (
          <div className="bg-red-50 border border-red-100 rounded-xl p-5 mb-6">
            <h2 className="text-base font-semibold text-red-800 mb-1">Application not progressed</h2>
            <p className="text-sm text-red-600">
              Thank you for applying. Unfortunately, we are unable to offer you a place at this time.
              {applicant.rejectionReason && applicant.rejectionReason !== 'Other' && ` Reason: ${applicant.rejectionReason.toLowerCase()}.`}
            </p>
            <p className="text-xs text-red-400 mt-2">Please contact the admissions team if you have any questions.</p>
          </div>
        )}

        {isDeferred && (
          <div className="bg-amber-50 border border-amber-100 rounded-xl p-5 mb-6">
            <h2 className="text-base font-semibold text-amber-800 mb-1">Application deferred</h2>
            <p className="text-sm text-amber-700">
              Your application has been deferred to a future intake.
              {applicant.deferralReason && ` ${applicant.deferralReason}.`}
            </p>
            <p className="text-xs text-amber-500 mt-2">The admissions team will be in touch about next steps.</p>
          </div>
        )}

        {/* What happens next */}
        {!isDeclined && !isDeferred && (
          <div className={cn(
            'rounded-xl p-5 mb-6 border',
            isEnrolled
              ? 'bg-green-50 border-green-100'
              : 'bg-indigo-50 border-indigo-100'
          )}>
            {isEnrolled ? (
              <>
                <div className="flex items-center gap-2 mb-1">
                  <CheckCircle2 className="w-5 h-5 text-green-600" />
                  <h2 className="text-base font-semibold text-green-800">You&apos;re enrolled!</h2>
                </div>
                <p className="text-sm text-green-700">{nextStep}</p>
              </>
            ) : (
              <>
                <div className="flex items-center gap-2 mb-1">
                  <Clock className="w-4 h-4 text-indigo-600" />
                  <h2 className="text-sm font-semibold text-indigo-700">What happens next</h2>
                </div>
                <p className="text-sm text-indigo-800 leading-relaxed">{nextStep}</p>
              </>
            )}
          </div>
        )}

        {/* Journey timeline */}
        <div className="bg-white border border-gray-100 rounded-xl p-5 mb-6">
          <h2 className="text-xs font-semibold text-gray-400 uppercase tracking-wide mb-4">Your journey</h2>
          <div className="space-y-0">
            {STATUS_STEPS.filter(s => s.key !== 'enrolled' || applicant.status === 'enrolled').map((step, i) => {
              const stepIdx = STATUS_ORDER.indexOf(step.key)
              const isDone = !isDeclined && !isDeferred && (stepIdx < currentIdx || applicant.status === step.key)
              const isCurrent = applicant.status === step.key
              const isFuture = stepIdx > currentIdx && !isDeclined && !isDeferred

              return (
                <div key={step.key} className="flex gap-3">
                  {/* Connector */}
                  <div className="flex flex-col items-center">
                    <div className={cn(
                      'w-6 h-6 rounded-full flex items-center justify-center flex-none',
                      isCurrent && !isDeclined ? 'bg-[#473FCF] ring-4 ring-indigo-100' :
                      isDone ? 'bg-[#473FCF]' :
                      'bg-gray-100'
                    )}>
                      {isDone || isCurrent ? (
                        <CheckCircle2 className="w-3.5 h-3.5 text-white" />
                      ) : (
                        <Circle className="w-3 h-3 text-gray-300" />
                      )}
                    </div>
                    {i < STATUS_STEPS.length - 1 && (
                      <div className={cn('w-0.5 my-1 flex-1', isDone && !isCurrent ? 'bg-[#473FCF]' : 'bg-gray-100')} style={{ minHeight: '20px' }} />
                    )}
                  </div>

                  {/* Content */}
                  <div className="flex-1 pb-4">
                    <p className={cn(
                      'text-sm font-medium leading-tight',
                      isCurrent ? 'text-[#473FCF]' : isDone ? 'text-gray-900' : isFuture ? 'text-gray-300' : 'text-gray-400'
                    )}>
                      {step.label}
                      {isCurrent && <span className="ml-2 text-[0.625rem] bg-indigo-100 text-[#473FCF] px-1.5 py-0.5 rounded-full font-semibold uppercase tracking-wide">Now</span>}
                    </p>

                    {/* Show scheduled dates inline */}
                    {step.key === 'assessment_scheduled' && applicant.assessmentDate && (isDone || isCurrent) && (
                      <p className="text-xs text-gray-500 mt-0.5">
                        {format(new Date(applicant.assessmentDate), 'EEEE d MMMM \'at\' HH:mm')}
                      </p>
                    )}
                    {step.key === 'interview_scheduled' && applicant.interviewDate && (isDone || isCurrent) && (
                      <p className="text-xs text-gray-500 mt-0.5">
                        {format(new Date(applicant.interviewDate), 'EEEE d MMMM \'at\' HH:mm')}
                        {courseName && <span className="text-gray-400"> · {courseName}</span>}
                      </p>
                    )}
                    {step.key === 'enrolled' && isDone && courseName && (
                      <p className="text-xs text-green-600 font-medium mt-0.5">{courseName}</p>
                    )}
                  </div>
                </div>
              )
            })}
          </div>
        </div>

        {/* Applied date */}
        <div className="text-center text-xs text-gray-400">
          Applied {format(new Date(applicant.createdAt), 'dd MMMM yyyy')} · Ref #{ref}
        </div>
      </div>
    </div>
  )
}
