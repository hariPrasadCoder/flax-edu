import { pgTable, uuid, text, timestamp, integer, boolean, jsonb } from 'drizzle-orm/pg-core'
import { relations } from 'drizzle-orm'

export const organisations = pgTable('organisations', {
  id: uuid('id').primaryKey().defaultRandom(),
  name: text('name').notNull(),
  slug: text('slug'),
  createdAt: timestamp('created_at').defaultNow().notNull(),
})

export const orgMembers = pgTable('org_members', {
  id: uuid('id').primaryKey().defaultRandom(),
  orgId: uuid('org_id').references(() => organisations.id).notNull(),
  userId: text('user_id').notNull(),
  role: text('role').default('staff').notNull(),
  createdAt: timestamp('created_at').defaultNow().notNull(),
})

export const courses = pgTable('courses', {
  id: uuid('id').primaryKey().defaultRandom(),
  orgId: uuid('org_id').references(() => organisations.id).notNull(),
  name: text('name').notNull(),
  description: text('description').notNull(),
  level: text('level').notNull(),
  requirements: text('requirements').notNull(),
  capacity: integer('capacity'),
  createdAt: timestamp('created_at').defaultNow().notNull(),
})

export const applicants = pgTable('applicants', {
  id: uuid('id').primaryKey().defaultRandom(),
  orgId: uuid('org_id').references(() => organisations.id).notNull(),
  name: text('name').notNull(),
  email: text('email').notNull(),
  phone: text('phone'),
  cvUrl: text('cv_url'),
  cvText: text('cv_text'),
  status: text('status').default('applied').notNull(),
  source: text('source'), // website|walk-in|referral|open-day|phone|other
  interestedCourseId: uuid('interested_course_id'),
  assessmentDate: timestamp('assessment_date'),
  assessmentEnglishScore: integer('assessment_english_score'),
  assessmentMathScore: integer('assessment_math_score'),
  interviewDate: timestamp('interview_date'),
  matchedCourseId: uuid('matched_course_id'),
  aiSuitabilityScore: integer('ai_suitability_score'),
  aiSuitabilitySummary: text('ai_suitability_summary'),
  aiMatchedCourses: jsonb('ai_matched_courses'),
  notes: text('notes'),
  rejectionReason: text('rejection_reason'),
  deferralReason: text('deferral_reason'),
  enrolledDate: timestamp('enrolled_date'),
  createdAt: timestamp('created_at').defaultNow().notNull(),
  updatedAt: timestamp('updated_at').defaultNow().notNull(),
})

export const applicantEvents = pgTable('applicant_events', {
  id: uuid('id').primaryKey().defaultRandom(),
  applicantId: uuid('applicant_id').references(() => applicants.id).notNull(),
  actorId: text('actor_id').notNull(),
  actorName: text('actor_name'),
  eventType: text('event_type').notNull(), // status_changed|cv_uploaded|ai_analysis|scores_recorded|assessment_scheduled|interview_scheduled|note_added|enrolled|rejected|deferred
  fromValue: text('from_value'),
  toValue: text('to_value'),
  metadata: jsonb('metadata'),
  createdAt: timestamp('created_at').defaultNow().notNull(),
})

export const invites = pgTable('invites', {
  id: uuid('id').primaryKey().defaultRandom(),
  orgId: uuid('org_id').references(() => organisations.id).notNull(),
  email: text('email').notNull(),
  role: text('role').default('staff').notNull(),
  token: text('token').unique().notNull(),
  accepted: boolean('accepted').default(false).notNull(),
  createdAt: timestamp('created_at').defaultNow().notNull(),
})

export const users = pgTable('users', {
  id: uuid('id').primaryKey().defaultRandom(),
  email: text('email').unique().notNull(),
  name: text('name').notNull(),
  passwordHash: text('password_hash').notNull(),
  createdAt: timestamp('created_at').defaultNow().notNull(),
})

export const orgMembersRelations = relations(orgMembers, ({ one }) => ({
  org: one(organisations, {
    fields: [orgMembers.orgId],
    references: [organisations.id],
  }),
  user: one(users, {
    fields: [orgMembers.userId],
    references: [users.id],
  }),
}))

export const organisationsRelations = relations(organisations, ({ many }) => ({
  members: many(orgMembers),
  courses: many(courses),
  applicants: many(applicants),
}))
