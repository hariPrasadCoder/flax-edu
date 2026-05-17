import { neon } from '@neondatabase/serverless'
import { drizzle } from 'drizzle-orm/neon-http'
import * as schema from './schema'
import { v4 as uuidv4 } from 'uuid'

async function seed() {
  const sql = neon(process.env.NEON_DATABASE_URL!)
  const db = drizzle(sql, { schema })

  console.log('Seeding database...')

  // Create a demo org
  const orgId = uuidv4()
  await db.insert(schema.organisations).values({
    id: orgId,
    name: 'City of Bristol College',
  })

  // Create sample courses
  const course1Id = uuidv4()
  const course2Id = uuidv4()
  const course3Id = uuidv4()

  await db.insert(schema.courses).values([
    {
      id: course1Id,
      orgId,
      name: 'Level 3 Digital Marketing',
      level: 'Level 3',
      description: 'A comprehensive course covering SEO, social media, content strategy and analytics.',
      requirements: 'Interest in marketing and social media. Basic computer literacy. GCSE English at grade 4 or above preferred. Creative mindset and good communication skills.',
    },
    {
      id: course2Id,
      orgId,
      name: 'Level 5 Health & Social Care',
      level: 'Level 5',
      description: 'Advanced qualification for those looking to progress in the health and social care sector.',
      requirements: 'Level 3 qualification in health or social care or relevant work experience. Good literacy and numeracy skills. Empathy and interpersonal skills. DBS check required.',
    },
    {
      id: course3Id,
      orgId,
      name: 'Level 3 Business Administration',
      level: 'Level 3',
      description: 'Covers office management, business communication, HR processes and financial administration.',
      requirements: 'GCSE Maths and English at grade 4 or above. Organisational skills. Proficiency in Microsoft Office. Good written and verbal communication.',
    },
  ])

  // Create sample applicants
  await db.insert(schema.applicants).values([
    {
      id: uuidv4(),
      orgId,
      name: 'Amara Osei',
      email: 'amara.osei@example.com',
      phone: '07700 900123',
      status: 'applied',
      cvText: 'Amara has 2 years experience in retail and customer service. Completed A-levels in Business and English. Interested in marketing and social media management.',
    },
    {
      id: uuidv4(),
      orgId,
      name: 'Callum Byrne',
      email: 'callum.byrne@example.com',
      phone: '07700 900456',
      status: 'assessment_done',
      assessmentEnglishScore: 8,
      assessmentMathScore: 7,
      cvText: 'Callum has 5 years experience as a healthcare assistant at Bristol Royal Infirmary. NVQ Level 2 in Health and Social Care. Looking to progress to a supervisory role.',
    },
    {
      id: uuidv4(),
      orgId,
      name: 'Priya Sharma',
      email: 'priya.sharma@example.com',
      phone: '07700 900789',
      status: 'course_matched',
      assessmentEnglishScore: 9,
      assessmentMathScore: 8,
      matchedCourseId: course1Id,
      aiSuitabilityScore: 87,
      aiSuitabilitySummary: 'Priya demonstrates strong digital skills and marketing enthusiasm. Her background in content creation and social media management makes her an excellent candidate for the Digital Marketing course.',
      aiMatchedCourses: [
        { course_name: 'Level 3 Digital Marketing', score: 87, reason: 'Strong social media background and content creation experience aligns perfectly.' },
        { course_name: 'Level 3 Business Administration', score: 62, reason: 'Business awareness but lacks administrative experience.' },
      ],
      cvText: 'Priya has managed Instagram and TikTok for a local café chain growing followers by 300%. GCSE English A, Maths B. Strong interest in digital marketing and analytics.',
    },
    {
      id: uuidv4(),
      orgId,
      name: 'Jordan Fletcher',
      email: 'jordan.fletcher@example.com',
      phone: '07700 900321',
      status: 'interviewed',
      assessmentEnglishScore: 7,
      assessmentMathScore: 9,
      matchedCourseId: course3Id,
      aiSuitabilityScore: 75,
      aiSuitabilitySummary: 'Jordan has solid numeracy skills and office administration experience. Well-suited for Business Administration with good progression potential.',
      aiMatchedCourses: [
        { course_name: 'Level 3 Business Administration', score: 75, reason: 'Office admin experience and strong maths score are ideal.' },
        { course_name: 'Level 3 Digital Marketing', score: 45, reason: 'Limited marketing exposure but good organisational skills.' },
      ],
      cvText: 'Jordan worked as an administrator for 3 years. Proficient in Excel and Microsoft Office. GCSE Maths A*, English B.',
    },
    {
      id: uuidv4(),
      orgId,
      name: 'Sophie Williams',
      email: 'sophie.williams@example.com',
      phone: '07700 900654',
      status: 'enrolled',
      assessmentEnglishScore: 9,
      assessmentMathScore: 6,
      matchedCourseId: course2Id,
      aiSuitabilityScore: 91,
      aiSuitabilitySummary: 'Sophie has an exceptional background in care work with strong qualifications. Her Level 3 qualification and extensive practical experience make her the strongest candidate for Level 5 Health & Social Care.',
      aiMatchedCourses: [
        { course_name: 'Level 5 Health & Social Care', score: 91, reason: 'Level 3 qualification and 4 years care experience directly meets requirements.' },
        { course_name: 'Level 3 Business Administration', score: 30, reason: 'Limited business background.' },
      ],
      cvText: 'Sophie has Level 3 Health and Social Care qualification and 4 years experience as a senior carer. Completed safeguarding training. DBS certified. Excellent references from NHS placement.',
    },
  ])

  console.log('Seed complete!')
  process.exit(0)
}

seed().catch(console.error)
