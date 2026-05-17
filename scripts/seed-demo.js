// Demo seed script - creates WAES courses + fake applicants with PDF CVs
// Run: NEON_DATABASE_URL=... node scripts/seed-demo.js
// Or: add NEON_DATABASE_URL to .env.local and run: node -r dotenv/config scripts/seed-demo.js

const { neon } = require('@neondatabase/serverless')
const { randomUUID } = require('crypto')
const PDFDocument = require('pdfkit')
const fs = require('fs')
const path = require('path')

const DB_URL = process.env.NEON_DATABASE_URL
if (!DB_URL) { console.error('NEON_DATABASE_URL is required'); process.exit(1) }
const USER_EMAIL = process.env.SEED_EMAIL || 'hpprasad2000@gmail.com'

const sql = neon(DB_URL)

// ─── COURSES ────────────────────────────────────────────────────────────────

const COURSES = [
  {
    name: 'GCSE English Language',
    level: 'Level 2 (GCSE Grade 4–9)',
    description: 'Develop your reading, writing and spoken language skills to achieve a recognised GCSE qualification in English Language, essential for employment and further study.',
    requirements: 'Entry Level 3 English or equivalent. Applicants will take a short assessment before enrolment. Commitment to weekly homework required.',
  },
  {
    name: 'GCSE Mathematics',
    level: 'Level 2 (GCSE Grade 4–9)',
    description: 'Achieve a GCSE in Maths covering number, algebra, geometry, ratio, probability and statistics. Widely required by employers and universities.',
    requirements: 'Entry Level 3 Maths or equivalent. Assessment at interview. Strong motivation and regular attendance essential.',
  },
  {
    name: 'Level 2 Functional Skills English',
    level: 'Level 2',
    description: 'A practical qualification covering reading, writing and communicating. Equivalent to GCSE Grade C/4, accepted by most employers.',
    requirements: 'Level 1 English or equivalent literacy skills. Suitable for those who narrowly missed GCSE English or need a quick route to Level 2.',
  },
  {
    name: 'Level 2 Functional Skills Maths',
    level: 'Level 2',
    description: 'Covers practical maths skills including fractions, percentages, data and problem-solving. Widely accepted as a GCSE Maths equivalent.',
    requirements: 'Level 1 Maths or good numeracy skills. Short initial assessment required.',
  },
  {
    name: 'Level 2 Certificate in Accounting (AAT)',
    level: 'Level 2',
    description: 'The AAT Foundation Certificate in Accounting covers bookkeeping transactions, controls, elements of costing, and using accounting software. An ideal entry into a finance career.',
    requirements: 'No prior accounting knowledge needed. Good numeracy skills and basic IT literacy required. GCSE Maths Grade D/3 or equivalent recommended.',
  },
  {
    name: 'Level 3 Diploma in Accounting (AAT)',
    level: 'Level 3',
    description: 'The AAT Advanced Diploma covers financial accounting, management accounting, business awareness and tax. Leads directly to AAT Level 4 or employment as a bookkeeper/accounts assistant.',
    requirements: 'AAT Level 2 Certificate or equivalent. Applicants without the Level 2 may be considered following a competency interview.',
  },
  {
    name: 'Level 3 Diploma in Digital Marketing for Business',
    level: 'Level 3',
    description: 'Covers SEO, social media strategy, content marketing, email campaigns, Google Analytics and paid advertising. Prepares students for entry-level digital marketing roles.',
    requirements: 'Level 2 qualification or equivalent work experience in a business or marketing environment. Basic computer literacy essential.',
  },
  {
    name: 'Level 2 Advanced Digital Skills',
    level: 'Level 2',
    description: 'Develop practical digital skills including spreadsheets, databases, word processing, online communication, and digital safety. Ideal for improving employability.',
    requirements: 'Level 1 Digital Skills or comfortable using a computer independently. No formal qualifications required.',
  },
  {
    name: 'Level 1 Certificate in Web Design (Interactive Media)',
    level: 'Level 1',
    description: 'Learn the fundamentals of web design including HTML basics, layout principles, image editing and publishing simple websites. Progression available to Level 2.',
    requirements: 'No prior web design experience needed. Basic computer skills (internet browsing, typing, saving files). Interest in design or technology.',
  },
  {
    name: 'Level 2 UAL Diploma in Art and Design (Graphic Design)',
    level: 'Level 2',
    description: 'A studio-based course exploring typography, branding, digital illustration, layout and print design using industry software including Adobe Illustrator and InDesign.',
    requirements: 'Level 1 in Art & Design or Graphic Design, or a portfolio showing creative potential. Interview and portfolio review required.',
  },
  {
    name: 'Level 3 UAL Diploma in Creative Practice (Art)',
    level: 'Level 3',
    description: 'An advanced fine art programme covering painting, drawing, mixed media and conceptual practice. Ideal progression to BA(Hons) degree or professional art practice.',
    requirements: 'Level 2 Art & Design qualification or equivalent. Portfolio of recent work required at interview. Commitment to an independent creative practice essential.',
  },
  {
    name: 'Level 2 UAL Diploma in Art and Design (Fashion)',
    level: 'Level 2',
    description: 'Explore fashion illustration, pattern cutting, garment construction and textile design. Combines technical skills with creative design practice.',
    requirements: 'Level 1 in Art, Fashion or Creative Craft, or demonstrated creative ability. Portfolio or examples of previous creative work required.',
  },
  {
    name: 'Level 2 Technical Certificate in Floristry',
    level: 'Level 2',
    description: 'An intensive vocational course covering wiring, conditioning, hand-tied bouquets, funeral and wedding work. Designed for those seeking employment or self-employment in floristry.',
    requirements: 'Level 1 Floristry or Flower Arranging for Beginners, or relevant work experience. Two-day per week commitment. Interview required.',
  },
  {
    name: 'Level 3 Diploma in Supporting Teaching and Learning',
    level: 'Level 3',
    description: 'A comprehensive teaching assistant qualification covering child development, SEN support, safeguarding, behaviour management and curriculum delivery in primary and secondary settings.',
    requirements: 'Level 2 in Supporting Teaching and Learning, or current voluntary/paid work experience in a school. Enhanced DBS check required prior to placement.',
  },
  {
    name: 'Level 2 Certificate in Supporting Teaching and Learning',
    level: 'Level 2',
    description: 'Covers the roles and responsibilities of a teaching assistant, communication with children and staff, and supporting learning activities. Includes a school placement component.',
    requirements: 'Level 1 literacy and numeracy or equivalent. Some experience working with children (paid or voluntary) preferred. DBS check required.',
  },
  {
    name: 'Level 2 Technical Occupational Entry: Early Years',
    level: 'Level 2',
    description: 'Provides the knowledge and skills needed to work as an early years practitioner. Covers child development (0–5 years), safeguarding, health and safety, and play-based learning.',
    requirements: 'No prior childcare qualifications required. Literacy and numeracy at Level 1. A genuine interest in working with young children. DBS check required.',
  },
  {
    name: 'ESOL (English for Speakers of Other Languages)',
    level: 'Entry Level 1 – Level 2',
    description: 'Improve your spoken and written English in a supportive environment. Courses are based on the ESOL Skills for Life curriculum and available at multiple levels from beginner to advanced.',
    requirements: 'Initial assessment to determine appropriate level. No formal qualifications needed. Open to all adults for whom English is not a first language.',
  },
  {
    name: 'Level 1 Award in Caring for Children',
    level: 'Level 1',
    description: 'An introductory qualification for those considering a career in childcare. Topics include child development basics, nutrition, play, and maintaining a safe environment.',
    requirements: 'No prior qualifications required. Basic English literacy recommended. Suitable for those aged 19+ with an interest in childcare.',
  },
]

// ─── APPLICANTS ─────────────────────────────────────────────────────────────

const APPLICANTS = [
  {
    name: 'Maria Santos',
    email: 'maria.santos@example.com',
    phone: '07712 345 678',
    status: 'course_matched',
    source: 'website',
    assessmentEnglishScore: 5,
    assessmentMathScore: 4,
    interestedCourse: 'ESOL (English for Speakers of Other Languages)',
    matchedCourse: 'ESOL (English for Speakers of Other Languages)',
    notes: 'Maria arrived from Portugal 18 months ago. Very motivated. Struggles with formal written English but communicates well verbally.',
    cv: {
      summary: 'Motivated adult learner relocating from Portugal seeking to improve English language skills for better employment prospects in London.',
      experience: [
        { role: 'Retail Sales Assistant', org: 'Zara, Lisbon', period: '2019–2023', detail: 'Customer service in a fast-paced retail environment. Handled cash and card transactions, stock management and visual merchandising.' },
        { role: 'Waitress', org: 'Café Central, Lisbon', period: '2016–2019', detail: 'Front-of-house service, managing customer orders and complaints. Trained two new members of staff.' },
      ],
      education: [
        { qual: 'Certificado de Educação Básica (Basic Education Certificate)', org: 'Escola Secundária António Arroio, Lisbon', year: '2015' },
      ],
      skills: ['Portuguese (native)', 'Basic English', 'Customer service', 'POS systems', 'Team work'],
      interests: 'Cooking, community volunteering, learning English through TV and podcasts.',
    },
  },
  {
    name: 'James Okafor',
    email: 'james.okafor@example.com',
    phone: '07823 456 789',
    status: 'interview_scheduled',
    source: 'referral',
    assessmentEnglishScore: 8,
    assessmentMathScore: 9,
    interviewDate: new Date(Date.now() + 3 * 24 * 60 * 60 * 1000), // 3 days from now
    interestedCourse: 'Level 2 Certificate in Accounting (AAT)',
    matchedCourse: 'Level 2 Certificate in Accounting (AAT)',
    notes: 'James has strong numeracy from his finance background in Nigeria. Referred by a former student. Keen to progress to Level 3 AAT.',
    cv: {
      summary: 'Finance professional with 6 years of experience in accounts administration and bookkeeping, seeking a UK-recognised accounting qualification to advance my career in London.',
      experience: [
        { role: 'Accounts Administrator', org: 'Zenith Bank PLC, Lagos', period: '2018–2024', detail: 'Managed accounts payable and receivable for a portfolio of 50+ corporate clients. Prepared monthly reconciliation reports and assisted with year-end audits.' },
        { role: 'Finance Clerk', org: 'Lagos State Government, Finance Division', period: '2016–2018', detail: 'Processed supplier invoices, petty cash management, and maintained financial records in compliance with government standards.' },
      ],
      education: [
        { qual: 'BSc Accounting', org: 'University of Lagos', year: '2016' },
        { qual: 'WAEC Certificate (A grades in Maths and Economics)', org: 'Federal Government College, Lagos', year: '2012' },
      ],
      skills: ['QuickBooks', 'Microsoft Excel (advanced)', 'Financial reporting', 'Payroll processing', 'SAGE basics'],
      interests: 'Personal finance, football, mentoring young people in financial literacy.',
    },
  },
  {
    name: 'Priya Sharma',
    email: 'priya.sharma@example.com',
    phone: '07934 567 890',
    status: 'applied',
    source: 'website',
    assessmentEnglishScore: null,
    assessmentMathScore: null,
    interestedCourse: 'Level 3 Diploma in Digital Marketing for Business',
    notes: 'Applied online. Has a social media following and runs a small Instagram business. Wants to formalise her skills.',
    cv: {
      summary: 'Creative self-starter with hands-on experience growing social media audiences and running e-commerce operations. Looking to formalise my digital marketing knowledge with a recognised qualification.',
      experience: [
        { role: 'Social Media Manager (Self-employed)', org: 'PriyaCreates (@priyacreates_uk)', period: '2021–present', detail: 'Grew Instagram account from 0 to 14,000 followers. Managed brand collaborations, created sponsored content, and ran paid Meta ad campaigns with up to £500/month budget.' },
        { role: 'Customer Service Advisor', org: 'ASOS, Leavesden', period: '2020–2021', detail: 'Handled customer queries via email, live chat and phone. Achieved consistently high CSAT scores.' },
      ],
      education: [
        { qual: 'A-Levels: Media Studies (B), Sociology (C), English Language (C)', org: 'Watford Grammar School for Girls', year: '2020' },
        { qual: 'GCSEs: 8 subjects including English (5) and Maths (4)', org: 'Watford Grammar School for Girls', year: '2018' },
      ],
      skills: ['Instagram, TikTok, Facebook (Ads Manager)', 'Canva', 'Hootsuite', 'Basic copywriting', 'Email marketing (Mailchimp)', 'Google Analytics'],
      interests: 'Content creation, fashion, yoga, personal branding.',
    },
  },
  {
    name: 'Emma Thompson',
    email: 'emma.thompson@example.com',
    phone: '07645 678 901',
    status: 'assessment_scheduled',
    source: 'open-day',
    assessmentEnglishScore: null,
    assessmentMathScore: null,
    assessmentDate: new Date(Date.now() + 5 * 24 * 60 * 60 * 1000), // 5 days from now
    interestedCourse: 'Level 3 UAL Diploma in Creative Practice (Art)',
    notes: 'Attended open day. Strong portfolio — oil paintings and charcoal life drawing. Has been working as a freelance illustrator.',
    cv: {
      summary: 'Practising visual artist and freelance illustrator with 5 years of professional experience. Seeking structured academic grounding to develop conceptual fine art practice and progress to degree-level study.',
      experience: [
        { role: 'Freelance Illustrator', org: 'Self-employed (clients include Penguin Random House, Time Out London)', period: '2019–present', detail: 'Editorial illustration for books, magazines and digital media. Worked to tight briefs and deadlines across print and digital formats.' },
        { role: 'Gallery Assistant', org: 'Saatchi Gallery, Chelsea', period: '2017–2019', detail: 'Front-of-house and education support at a leading contemporary art gallery. Delivered talks to school groups and assisted with installation.' },
      ],
      education: [
        { qual: 'Foundation Diploma in Art and Design (Merit)', org: 'Chelsea College of Arts (UAL)', year: '2017' },
        { qual: 'A-Levels: Fine Art (A*), Photography (A), English Literature (B)', org: 'St Francis Xavier Sixth Form College', year: '2016' },
      ],
      skills: ['Oil, acrylic, watercolour painting', 'Life drawing', 'Adobe Illustrator', 'Photoshop', 'Procreate', 'Printmaking'],
      interests: 'Gallery visiting, life drawing groups, cinema, independent travel.',
    },
  },
  {
    name: 'David Chen',
    email: 'david.chen@example.com',
    phone: '07756 789 012',
    status: 'enrolled',
    source: 'website',
    assessmentEnglishScore: 7,
    assessmentMathScore: 8,
    interestedCourse: 'Level 1 Certificate in Web Design (Interactive Media)',
    matchedCourse: 'Level 2 Advanced Digital Skills',
    notes: 'Initially interested in web design. After AI analysis and interview, enrolled onto Advanced Digital Skills as stronger foundation. Plans to progress to web design after.',
    enrolledDate: new Date(Date.now() - 14 * 24 * 60 * 60 * 1000),
    cv: {
      summary: 'Recent school leaver with strong interest in computers, technology and web development. Looking to gain formal IT qualifications to support a career in the digital sector.',
      experience: [
        { role: 'IT Support (Volunteer)', org: 'Hackney Community Centre', period: '2023–2024', detail: 'Helped older adults use computers and smartphones. Set up Wi-Fi, resolved printer issues, and ran basic digital literacy workshops.' },
        { role: 'Shop Assistant', org: 'Tesco Express, Bethnal Green', period: '2022–2023', detail: 'Stock replenishment, cash handling and customer service.' },
      ],
      education: [
        { qual: 'GCSEs: Computer Science (6), Maths (5), English Language (4), 5 further subjects', org: 'Bethnal Green Academy', year: '2022' },
      ],
      skills: ['HTML/CSS basics', 'Python (beginner)', 'Microsoft Office', 'Adobe Photoshop (self-taught)', 'Social media'],
      interests: 'Gaming, building PCs, watching YouTube tech tutorials, photography.',
    },
  },
  {
    name: 'Fatima Al-Hassan',
    email: 'fatima.alhassan@example.com',
    phone: '07867 890 123',
    status: 'assessment_done',
    source: 'walk-in',
    assessmentEnglishScore: 6,
    assessmentMathScore: 5,
    interestedCourse: 'Level 2 Technical Occupational Entry: Early Years',
    notes: 'Walk-in enquiry. Currently works informally as a childminder. Wants to get formally qualified. Mother tongue is Arabic. English is strong but written skills need support.',
    cv: {
      summary: 'Dedicated carer and informal childminder with 4 years of experience supporting children aged 0–7. Passionate about early years education and seeking formal qualification to work professionally in the sector.',
      experience: [
        { role: 'Childminder (informal)', org: 'Self-employed, Westminster area', period: '2020–present', detail: 'Cared for 3–5 children aged 1–6 years simultaneously. Planned age-appropriate activities, managed mealtimes, and liaised with parents daily.' },
        { role: 'Nursery Volunteer', org: 'Pimlico Community Nursery', period: '2019–2020', detail: 'Supported qualified practitioners in activities, reading sessions and outdoor play. Completed first aid training.' },
      ],
      education: [
        { qual: 'Secondary School Certificate', org: 'Al-Andalus Secondary School, Casablanca, Morocco', year: '2012' },
      ],
      skills: ['Childcare and supervision', 'Arabic (native)', 'English (conversational and written)', 'Patience and empathy', 'Activity planning', 'First Aid (2019)'],
      interests: 'Baking with children, storytelling, Islamic art, community events.',
    },
  },
  {
    name: 'Michael Roberts',
    email: 'michael.roberts@example.com',
    phone: '07978 901 234',
    status: 'rejected',
    source: 'phone',
    assessmentEnglishScore: 3,
    assessmentMathScore: 2,
    interestedCourse: 'GCSE Mathematics',
    rejectionReason: 'Assessment scores indicate Entry Level 2 — applicant needs pre-GCSE support before attempting GCSE Maths or English. Referred to Entry Level programme.',
    notes: 'Michael is keen but assessment showed significant gaps. Recommended to start with Entry Level 3 Maths and English before returning for GCSE.',
    cv: {
      summary: 'Looking to return to education after 15 years in manual work. Want to get my Maths GCSE to support a career change into logistics and supply chain.',
      experience: [
        { role: 'Warehouse Operative', org: 'Amazon Fulfilment Centre, Tilbury', period: '2016–2024', detail: 'Pick and pack, goods-in processing, forklift operation (licensed). Reliable attendance record, exceeded productivity targets.' },
        { role: 'Labourer', org: 'Various construction sites, London', period: '2008–2016', detail: 'General labouring, groundwork, assisting trades. Multiple CSCS health and safety certifications.' },
      ],
      education: [
        { qual: 'School leaving certificate (no formal GCSEs)', org: 'Crofton School, Bromley', year: '2008' },
        { qual: 'CSCS Green Card (Labourer)', org: 'CITB', year: '2010' },
        { qual: 'Forklift Operator Licence (counterbalance)', org: 'RTITB approved centre', year: '2017' },
      ],
      skills: ['Forklift operation', 'Stock management systems (Amazon WMS)', 'Manual handling', 'Health & Safety awareness', 'Teamwork'],
      interests: 'Football (plays Sunday league), DIY, spending time with his two children.',
    },
  },
  {
    name: 'Aisha Patel',
    email: 'aisha.patel@example.com',
    phone: '07789 012 345',
    status: 'interviewed',
    source: 'website',
    assessmentEnglishScore: 9,
    assessmentMathScore: 7,
    interviewDate: new Date(Date.now() - 2 * 24 * 60 * 60 * 1000), // 2 days ago
    interestedCourse: 'Level 3 Diploma in Supporting Teaching and Learning',
    matchedCourse: 'Level 3 Diploma in Supporting Teaching and Learning',
    notes: 'Excellent interview. Currently works as a 1:1 TA with SEN pupils. School placement already confirmed. Awaiting decision to enrol.',
    cv: {
      summary: 'Experienced teaching assistant with 3 years supporting children with special educational needs in a mainstream primary school. Seeking Level 3 qualification to formalise skills and progress to senior TA or HLTA role.',
      experience: [
        { role: '1:1 Teaching Assistant (SEN)', org: 'St George the Martyr C of E Primary School, Southwark', period: '2021–present', detail: 'Providing dedicated support to a pupil with autism and ADHD in Years 3 and 4. Implementing EHCP targets, attending review meetings, and working closely with the SENCO.' },
        { role: 'Classroom Teaching Assistant', org: 'Oliver Goldsmith Primary School, Camberwell', period: '2019–2021', detail: 'General classroom support across Key Stage 1. Led phonics groups and reading interventions.' },
      ],
      education: [
        { qual: 'Level 2 Certificate in Supporting Teaching and Learning', org: 'Lambeth College', year: '2021' },
        { qual: 'BA (Hons) Psychology (2:2)', org: 'University of East London', year: '2019' },
        { qual: 'A-Levels and GCSEs', org: 'Forest Hill School, Lewisham', year: '2016' },
      ],
      skills: ['SEN support (autism, ADHD, SEMH)', 'EHCP implementation', 'Phonics (RWI trained)', 'Behaviour management', 'Makaton basics', 'Safeguarding Level 1'],
      interests: 'Reading, child psychology, community volunteering, attending Quran classes.',
    },
  },
  {
    name: 'Carlos Mendez',
    email: 'carlos.mendez@example.com',
    phone: '07890 123 456',
    status: 'course_matched',
    source: 'referral',
    assessmentEnglishScore: 7,
    assessmentMathScore: 8,
    interestedCourse: 'Level 3 Diploma in Accounting (AAT)',
    matchedCourse: 'Level 2 Certificate in Accounting (AAT)',
    notes: 'Carlos applied for Level 3 AAT but assessment and background suggest Level 2 is the right entry point. He accepted the recommendation positively.',
    cv: {
      summary: 'Administration professional from Spain with experience in office finance tasks. Aiming to gain a formal accounting qualification in the UK and build a career in finance.',
      experience: [
        { role: 'Office Administrator', org: 'Constructora Seville S.L., Seville', period: '2020–2024', detail: 'Managed supplier invoices, employee expense claims, and bank reconciliations. Supported the accountant with month-end reporting using Excel.' },
        { role: 'Receptionist', org: 'Hotel Alfonso XIII, Seville', period: '2017–2020', detail: 'Front desk operations, billing, and customer relations for a luxury hotel. Managed foreign currency transactions.' },
      ],
      education: [
        { qual: 'Técnico Superior en Administración y Finanzas (Higher Technician in Administration and Finance)', org: 'IES Joaquín Turina, Seville', year: '2017' },
      ],
      skills: ['Microsoft Excel (intermediate)', 'SAP (basic)', 'Accounts payable/receivable', 'Spanish (native)', 'English (B2 level)', 'Customer service'],
      interests: 'Cycling, cooking, Spanish cinema, learning about UK financial regulations.',
    },
  },
  {
    name: 'Sophie Williams',
    email: 'sophie.williams@example.com',
    phone: '07901 234 567',
    status: 'assessment_scheduled',
    source: 'open-day',
    assessmentEnglishScore: null,
    assessmentMathScore: null,
    assessmentDate: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000), // 7 days from now
    interestedCourse: 'Level 2 Technical Certificate in Floristry',
    notes: 'Met at open day. Has been doing floristry hobby for 3 years. Wants to turn it into a career. Has a small Instagram with flower arrangements.',
    cv: {
      summary: 'Creative individual with a deep passion for floristry and botanical design. Self-taught over 3 years with experience running a small community flower-arranging group. Seeking to professionalise through formal qualification.',
      experience: [
        { role: 'Florist Assistant (voluntary)', org: 'Lilac & Ivy Flowers, Notting Hill', period: '2023–present', detail: 'Volunteering alongside the head florist on weekends. Assisted with hand-tied bouquets, event styling and funeral tributes.' },
        { role: 'Community Flower Arranging Group Leader', org: 'Self-organised, local community centre', period: '2022–present', detail: 'Run monthly workshops for 10–15 participants. Source wholesale flowers from New Covent Garden Market. Handle bookings and materials.' },
        { role: 'Primary School Teacher', org: 'Westbourne Park Primary School', period: '2015–2022', detail: 'Year 3 class teacher. Left the profession to care for family and pursue a career change.' },
      ],
      education: [
        { qual: 'PGCE (Primary Education)', org: 'Institute of Education, UCL', year: '2015' },
        { qual: 'BA (Hons) English Literature (2:1)', org: 'University of Exeter', year: '2014' },
      ],
      skills: ['Floristry (self-taught)', 'Hand-tied bouquets', 'Wreath-making', 'Workshop facilitation', 'Budget management', 'Instagram content creation'],
      interests: 'Botanical illustration, visiting RHS Chelsea Flower Show, gardening, reading.',
    },
  },
]

// ─── PDF GENERATION ─────────────────────────────────────────────────────────

function generateCV(applicant) {
  return new Promise((resolve, reject) => {
    const doc = new PDFDocument({ margin: 50, size: 'A4' })
    const chunks = []
    doc.on('data', c => chunks.push(c))
    doc.on('end', () => resolve(Buffer.concat(chunks)))
    doc.on('error', reject)

    const cv = applicant.cv
    const INDIGO = '#473FCF'
    const DARK = '#1a1a2e'
    const GREY = '#6B7280'
    const LIGHT_GREY = '#F3F4F6'
    const pageWidth = doc.page.width - 100

    // Header band
    doc.rect(0, 0, doc.page.width, 110).fill(INDIGO)
    doc.fillColor('#ffffff')
      .font('Helvetica-Bold')
      .fontSize(22)
      .text(applicant.name, 50, 30, { width: pageWidth })
    doc.font('Helvetica')
      .fontSize(10)
      .text(`${applicant.email}  |  ${applicant.phone}  |  London, UK`, 50, 60)
    doc.fontSize(10).text(`Interested in: ${applicant.interestedCourse}`, 50, 78)

    doc.fillColor(DARK)
    let y = 130

    // Summary
    doc.rect(50, y, pageWidth, 14).fill(INDIGO)
    doc.fillColor('#ffffff').font('Helvetica-Bold').fontSize(9).text('PERSONAL STATEMENT', 56, y + 3)
    y += 20
    doc.fillColor(DARK).font('Helvetica').fontSize(9.5)
      .text(cv.summary, 50, y, { width: pageWidth })
    y = doc.y + 14

    // Work Experience
    doc.rect(50, y, pageWidth, 14).fill(INDIGO)
    doc.fillColor('#ffffff').font('Helvetica-Bold').fontSize(9).text('WORK EXPERIENCE', 56, y + 3)
    y += 20

    for (const exp of cv.experience) {
      doc.fillColor(DARK).font('Helvetica-Bold').fontSize(9.5)
        .text(exp.role, 50, y, { continued: true, width: pageWidth - 80 })
        .fillColor(GREY).font('Helvetica').fontSize(9)
        .text(`  ${exp.period}`, { align: 'right' })
      y = doc.y + 1
      doc.fillColor(GREY).font('Helvetica-Oblique').fontSize(9)
        .text(exp.org, 50, y)
      y = doc.y + 3
      doc.fillColor(DARK).font('Helvetica').fontSize(9)
        .text(exp.detail, 50, y, { width: pageWidth })
      y = doc.y + 10
    }

    y += 4

    // Education
    doc.rect(50, y, pageWidth, 14).fill(INDIGO)
    doc.fillColor('#ffffff').font('Helvetica-Bold').fontSize(9).text('EDUCATION & QUALIFICATIONS', 56, y + 3)
    y += 20

    for (const ed of cv.education) {
      doc.fillColor(DARK).font('Helvetica-Bold').fontSize(9.5)
        .text(ed.qual, 50, y, { width: pageWidth })
      y = doc.y + 1
      doc.fillColor(GREY).font('Helvetica').fontSize(9)
        .text(`${ed.org}  ·  ${ed.year}`, 50, y)
      y = doc.y + 9
    }

    y += 4

    // Skills
    doc.rect(50, y, pageWidth, 14).fill(INDIGO)
    doc.fillColor('#ffffff').font('Helvetica-Bold').fontSize(9).text('KEY SKILLS', 56, y + 3)
    y += 20

    const skillsText = cv.skills.join('   ·   ')
    doc.fillColor(DARK).font('Helvetica').fontSize(9)
      .text(skillsText, 50, y, { width: pageWidth })
    y = doc.y + 12

    // Interests
    doc.rect(50, y, pageWidth, 14).fill(INDIGO)
    doc.fillColor('#ffffff').font('Helvetica-Bold').fontSize(9).text('INTERESTS', 56, y + 3)
    y += 20
    doc.fillColor(DARK).font('Helvetica').fontSize(9)
      .text(cv.interests, 50, y, { width: pageWidth })

    doc.end()
  })
}

// ─── MAIN ────────────────────────────────────────────────────────────────────

async function main() {
  console.log('🌱 Starting demo seed...\n')

  // 1. Get user + org
  const userRows = await sql`
    SELECT u.id::text, u.email, u.name, om.org_id::text, o.name as org_name
    FROM users u
    JOIN org_members om ON u.id::text = om.user_id
    JOIN organisations o ON om.org_id = o.id
    WHERE u.email = ${USER_EMAIL}
  `
  if (!userRows[0]) throw new Error('User not found: ' + USER_EMAIL)

  const { id: userId, name: userName, org_id: orgId, org_name: orgName } = userRows[0]
  console.log(`✅ Found user: ${userName} (org: ${orgName}, orgId: ${orgId})\n`)

  // 2. Wipe existing courses + applicants for this org (clean demo)
  console.log('🗑️  Clearing existing courses and applicants...')
  await sql`DELETE FROM applicant_events WHERE applicant_id IN (SELECT id FROM applicants WHERE org_id = ${orgId}::uuid)`
  await sql`DELETE FROM applicants WHERE org_id = ${orgId}::uuid`
  await sql`DELETE FROM courses WHERE org_id = ${orgId}::uuid`
  console.log('   Done.\n')

  // 3. Create courses
  console.log('📚 Creating courses...')
  const courseIdMap = {}
  for (const c of COURSES) {
    const id = randomUUID()
    courseIdMap[c.name] = id
    await sql`
      INSERT INTO courses (id, org_id, name, description, level, requirements)
      VALUES (${id}::uuid, ${orgId}::uuid, ${c.name}, ${c.description}, ${c.level}, ${c.requirements})
    `
    console.log(`   ✅ ${c.name} (${c.level})`)
  }

  // 4. Create uploads dir
  const uploadsDir = path.join(process.cwd(), 'public', 'uploads')
  if (!fs.existsSync(uploadsDir)) fs.mkdirSync(uploadsDir, { recursive: true })

  // 5. Create applicants
  console.log('\n👥 Creating applicants...')
  for (const a of APPLICANTS) {
    const applicantId = randomUUID()

    // Generate + save PDF
    const pdfBuffer = await generateCV(a)
    const filename = `${applicantId}-demo.pdf`
    const pdfPath = path.join(uploadsDir, filename)
    fs.writeFileSync(pdfPath, pdfBuffer)

    const cvUrl = `/uploads/${filename}`
    const interestedCourseId = a.interestedCourse ? courseIdMap[a.interestedCourse] || null : null
    const matchedCourseId = a.matchedCourse ? courseIdMap[a.matchedCourse] || null : null

    await sql`
      INSERT INTO applicants (
        id, org_id, name, email, phone, status, source,
        cv_url, cv_text,
        assessment_english_score, assessment_math_score,
        assessment_date, interview_date,
        interested_course_id, matched_course_id,
        notes, rejection_reason, enrolled_date,
        created_at, updated_at
      ) VALUES (
        ${applicantId}::uuid, ${orgId}::uuid,
        ${a.name}, ${a.email}, ${a.phone || null},
        ${a.status}, ${a.source || null},
        ${cvUrl}, ${null},
        ${a.assessmentEnglishScore ?? null}, ${a.assessmentMathScore ?? null},
        ${a.assessmentDate ?? null}, ${a.interviewDate ?? null},
        ${interestedCourseId}::uuid, ${matchedCourseId}::uuid,
        ${a.notes || null}, ${a.rejectionReason || null}, ${a.enrolledDate ?? null},
        NOW(), NOW()
      )
    `

    // Add a seed event (actor_id is text in DB)
    await sql`
      INSERT INTO applicant_events (id, applicant_id, actor_id, actor_name, event_type, to_value, created_at)
      VALUES (
        ${randomUUID()}::uuid, ${applicantId}::uuid,
        ${userId}, ${userName},
        'status_changed', ${a.status}, NOW()
      )
    `

    console.log(`   ✅ ${a.name} (${a.status}) — CV saved to ${cvUrl}`)
  }

  console.log(`\n🎉 Seed complete!`)
  console.log(`   ${COURSES.length} courses created`)
  console.log(`   ${APPLICANTS.length} applicants created with PDF CVs`)
  console.log(`\nLog in at http://localhost:3000/auth/sign-in to see the demo data.`)
}

main().catch(err => { console.error('❌', err); process.exit(1) })
