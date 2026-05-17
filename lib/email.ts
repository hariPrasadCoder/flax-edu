import { generateICS } from './ics'

// Graceful fallback: if no Resend key, log emails to console (dev/demo mode)
let resendClient: import('resend').Resend | null = null
if (process.env.RESEND_API_KEY) {
  // eslint-disable-next-line @typescript-eslint/no-require-imports
  const { Resend } = require('resend')
  resendClient = new Resend(process.env.RESEND_API_KEY)
}

const FROM = process.env.RESEND_FROM_EMAIL || 'Flax Admissions <onboarding@resend.dev>'
const APP_URL = process.env.NEXT_PUBLIC_APP_URL || 'http://localhost:3000'

type EmailApplicant = { id: string; name: string; email: string }

async function sendEmail(to: string, subject: string, html: string, attachments?: { filename: string; content: string }[]) {
  if (!resendClient) {
    console.log(`\n📧 [EMAIL] To: ${to}\n   Subject: ${subject}\n   (Add RESEND_API_KEY to .env.local to send real emails)\n`)
    return
  }
  try {
    await resendClient.emails.send({ from: FROM, to, subject, html, attachments })
  } catch (err) {
    console.error('[EMAIL ERROR]', err)
  }
}

function wrap(body: string, orgName: string) {
  return `<!DOCTYPE html>
<html>
<head>
<meta charset="utf-8">
<meta name="viewport" content="width=device-width,initial-scale=1">
<style>
  *{margin:0;padding:0;box-sizing:border-box}
  body{font-family:-apple-system,'Inter',Arial,sans-serif;background:#F3F4F6;padding:24px 16px;color:#111827}
  .wrap{max-width:560px;margin:0 auto}
  .card{background:#fff;border-radius:12px;overflow:hidden;border:1px solid #E5E7EB}
  .hdr{background:#473FCF;padding:24px 32px}
  .hdr-name{color:#fff;font-size:17px;font-weight:600;margin-bottom:2px}
  .hdr-org{color:rgba(255,255,255,0.65);font-size:13px}
  .body{padding:32px}
  p{font-size:15px;line-height:1.65;color:#374151;margin-bottom:16px}
  .box{background:#F9FAFB;border:1px solid #E5E7EB;border-radius:8px;padding:16px 20px;margin:20px 0}
  .row{display:flex;justify-content:space-between;align-items:center;padding:6px 0;border-bottom:1px solid #F3F4F6;font-size:14px}
  .row:last-child{border-bottom:none}
  .lbl{color:#6B7280}
  .val{color:#111827;font-weight:500;text-align:right}
  .btn{display:inline-block;background:#473FCF;color:#fff!important;text-decoration:none;padding:12px 24px;border-radius:8px;font-weight:500;font-size:14px;margin:8px 0}
  .note{font-size:13px;color:#9CA3AF;margin-top:24px;padding-top:20px;border-top:1px solid #F3F4F6}
  .ft{padding:16px 32px;background:#F9FAFB;border-top:1px solid #E5E7EB;font-size:12px;color:#9CA3AF}
</style>
</head>
<body>
<div class="wrap">
  <div class="card">
    <div class="hdr">
      <div class="hdr-name">Flax Admissions</div>
      <div class="hdr-org">${orgName}</div>
    </div>
    <div class="body">${body}</div>
    <div class="ft">This email was sent by ${orgName} via Flax Admissions. Please do not reply.</div>
  </div>
</div>
</body>
</html>`
}

// ── 1. Application received ────────────────────────────────────────────────

export async function sendApplicationConfirmation(
  applicant: EmailApplicant,
  orgName: string,
  courseName: string
) {
  const statusUrl = `${APP_URL}/status/${applicant.id}`
  const ref = applicant.id.slice(0, 8).toUpperCase()

  const html = wrap(`
    <p>Hi <strong>${applicant.name}</strong>,</p>
    <p>Thank you for applying to <strong>${orgName}</strong>. We've received your application and our admissions team will be in touch within <strong>3 working days</strong>.</p>
    <div class="box">
      <div class="row"><span class="lbl">Course</span><span class="val">${courseName}</span></div>
      <div class="row"><span class="lbl">Reference</span><span class="val">#${ref}</span></div>
      <div class="row"><span class="lbl">Status</span><span class="val" style="color:#473FCF">Application received ✓</span></div>
    </div>
    <p>You can track your application status at any time, no login needed:</p>
    <a class="btn" href="${statusUrl}">Track my application →</a>
    <p class="note">Questions? Contact our admissions team. Please keep your reference number safe.</p>
  `, orgName)

  await sendEmail(applicant.email, `Application received: ${orgName}`, html)
}

// ── 2. Assessment scheduled ───────────────────────────────────────────────

export async function sendAssessmentInvite(
  applicant: EmailApplicant,
  assessmentDate: Date,
  orgName: string
) {
  const statusUrl = `${APP_URL}/status/${applicant.id}`
  const dateStr = assessmentDate.toLocaleDateString('en-GB', { weekday: 'long', day: 'numeric', month: 'long', year: 'numeric' })
  const timeStr = assessmentDate.toLocaleTimeString('en-GB', { hour: '2-digit', minute: '2-digit' })

  const ics = generateICS({
    title: `Assessment at ${orgName}`,
    start: assessmentDate,
    durationMinutes: 60,
    description: `Assessment for your application to ${orgName}. Please arrive 10 minutes early at main reception. Bring photo ID. The assessment covers English and Mathematics.`,
    location: `${orgName}, Main Reception`,
  })

  const html = wrap(`
    <p>Hi <strong>${applicant.name}</strong>,</p>
    <p>Great news! We'd like to invite you to attend an <strong>assessment</strong> as the next step in your application.</p>
    <div class="box">
      <div class="row"><span class="lbl">Date</span><span class="val">${dateStr}</span></div>
      <div class="row"><span class="lbl">Time</span><span class="val">${timeStr}</span></div>
      <div class="row"><span class="lbl">Duration</span><span class="val">45–60 minutes</span></div>
      <div class="row"><span class="lbl">Location</span><span class="val">Main Reception</span></div>
    </div>
    <p>The assessment covers <strong>English and Mathematics</strong>. Please arrive <strong>10 minutes early</strong> and bring a form of <strong>photo ID</strong>.</p>
    <p>We've attached a calendar invite. Tap it to save the date.</p>
    <a class="btn" href="${statusUrl}">Track my application →</a>
    <p class="note">Need to reschedule? Please contact us as soon as possible so we can find another slot.</p>
  `, orgName)

  await sendEmail(
    applicant.email,
    `Assessment invitation: ${dateStr}`,
    html,
    [{ filename: 'assessment-invite.ics', content: Buffer.from(ics).toString('base64') }]
  )
}

// ── 3. Interview scheduled ────────────────────────────────────────────────

export async function sendInterviewInvite(
  applicant: EmailApplicant,
  interviewDate: Date,
  courseName: string,
  orgName: string
) {
  const statusUrl = `${APP_URL}/status/${applicant.id}`
  const dateStr = interviewDate.toLocaleDateString('en-GB', { weekday: 'long', day: 'numeric', month: 'long', year: 'numeric' })
  const timeStr = interviewDate.toLocaleTimeString('en-GB', { hour: '2-digit', minute: '2-digit' })

  const ics = generateICS({
    title: `Interview: ${courseName} at ${orgName}`,
    start: interviewDate,
    durationMinutes: 30,
    description: `Interview for ${courseName} at ${orgName}. Please bring any relevant qualifications or certificates.`,
    location: `${orgName}, Main Reception`,
  })

  const html = wrap(`
    <p>Hi <strong>${applicant.name}</strong>,</p>
    <p>Following your assessment, we'd like to invite you to an <strong>interview</strong> for your course.</p>
    <div class="box">
      <div class="row"><span class="lbl">Course</span><span class="val">${courseName}</span></div>
      <div class="row"><span class="lbl">Date</span><span class="val">${dateStr}</span></div>
      <div class="row"><span class="lbl">Time</span><span class="val">${timeStr}</span></div>
      <div class="row"><span class="lbl">Duration</span><span class="val">20–30 minutes</span></div>
      <div class="row"><span class="lbl">Location</span><span class="val">Main Reception</span></div>
    </div>
    <p>Please bring any relevant <strong>certificates or qualifications</strong>. We've attached a calendar invite.</p>
    <a class="btn" href="${statusUrl}">Track my application →</a>
    <p class="note">Need to reschedule? Please contact us as soon as possible.</p>
  `, orgName)

  await sendEmail(
    applicant.email,
    `Interview invitation: ${courseName}`,
    html,
    [{ filename: 'interview-invite.ics', content: Buffer.from(ics).toString('base64') }]
  )
}

// ── 4. Enrolled ───────────────────────────────────────────────────────────

export async function sendEnrolmentConfirmation(
  applicant: EmailApplicant,
  courseName: string,
  orgName: string
) {
  const html = wrap(`
    <p>Hi <strong>${applicant.name}</strong>,</p>
    <p style="font-size:18px;font-weight:600;color:#111827">Congratulations, you're enrolled! 🎉</p>
    <p>We are delighted to confirm your enrolment at <strong>${orgName}</strong>.</p>
    <div class="box">
      <div class="row"><span class="lbl">Course</span><span class="val">${courseName}</span></div>
      <div class="row"><span class="lbl">Status</span><span class="val" style="color:#16A34A;font-weight:600">Enrolled ✓</span></div>
    </div>
    <p>Our team will be in touch with details about your start date and what to expect on your first day. We look forward to welcoming you.</p>
    <p class="note">Questions? Contact our admissions team.</p>
  `, orgName)

  await sendEmail(applicant.email, `You're enrolled at ${orgName}: ${courseName}`, html)
}

// ── 5. Application declined ───────────────────────────────────────────────

export async function sendApplicationDeclined(
  applicant: EmailApplicant,
  reason: string,
  orgName: string
) {
  const html = wrap(`
    <p>Hi <strong>${applicant.name}</strong>,</p>
    <p>Thank you for your interest in studying at <strong>${orgName}</strong> and for taking the time to apply.</p>
    <p>After careful consideration, we are unable to offer you a place on this occasion${reason && reason !== 'Other' ? `: ${reason.toLowerCase()}` : ''}.</p>
    <p>We encourage you to explore other pathways and wish you every success in your studies and career ahead.</p>
    <p class="note">If you have any questions about this decision, please contact our admissions team.</p>
  `, orgName)

  await sendEmail(applicant.email, `Your application to ${orgName}`, html)
}

// ── 6. Quick status update (chaser) ───────────────────────────────────────

export async function sendStatusChaser(
  applicant: EmailApplicant,
  orgName: string
) {
  const statusUrl = `${APP_URL}/status/${applicant.id}`

  const html = wrap(`
    <p>Hi <strong>${applicant.name}</strong>,</p>
    <p>We just wanted to let you know that your application to <strong>${orgName}</strong> is still active and being reviewed by our admissions team.</p>
    <p>We'll be in touch very soon with your next steps. Thank you for your patience.</p>
    <a class="btn" href="${statusUrl}">Track my application →</a>
    <p class="note">Questions? Contact our admissions team directly.</p>
  `, orgName)

  await sendEmail(applicant.email, `Update on your application at ${orgName}`, html)
}
