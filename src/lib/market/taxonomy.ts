// Career Insights: every job posted in Bangladesh sorted into career paths a Bangladeshi
// student can choose between. Each path has sub-paths; jobs are matched by title (and, for
// government / banking, by employer). The guide text is general career information — the
// numbers on the page (openings, salary, experience asked, growth) come from real posts.

export type Barrier = "Low" | "Medium" | "High" | "Very high";

export interface Guide {
  /** What it takes to get in. */
  entry: string;
  barrier: Barrier;
  /** Typical monthly pay in BDT, entry → mid level. */
  salary: string;
  /** Where the field is heading. */
  outlook: string;
}

export interface SubCategory {
  key: string;
  name: string;
  /** Title (or employer, for government / banks) pattern. */
  match: RegExp;
  guide?: Guide;
}

export interface Category {
  key: string;
  name: string;
  icon: string;
  blurb: string;
  guide: Guide;
  subs: SubCategory[];
  /** BDJobs functional categories that fall here when no title rule matches. */
  bdCats?: number[];
}

const OTHER = (name: string): SubCategory => ({ key: "other", name: `Other ${name}`, match: /$^/ });

export const CATEGORIES: Category[] = [
  {
    key: "govt",
    name: "Government Jobs",
    icon: "🏛️",
    blurb: "Ministries, DC offices, police, defence, BGB, revenue, state corporations.",
    guide: {
      entry:
        "Apply to each circular (mostly via Teletalk). Written exam (Bangla, English, Math, GK) → viva; some posts add a practical or physical test. Grade 13–20 posts need SSC/HSC; Grade 9–10 need a bachelor's. Age limit 18–32 (relaxations for some quotas).",
      barrier: "High",
      salary: "Grade 20: ~16,000 · Grade 16: ~20,000 · Grade 10: ~32,000 · Grade 9: ~40,000 total with allowances (National Pay Scale 2015 + allowances)",
      outlook: "Very stable with pension and allowances; competition is extreme (often 100+ applicants a seat). Large recruitment rounds come in waves after budget approval.",
    },
    subs: [
      {
        key: "police",
        name: "Bangladesh Police",
        match: /\bpolice\b|পুলিশ|constable|কনস্টেবল|\bSI\b|sub[- ]inspector|\bASI\b/i,
        guide: {
          entry: "Constable: SSC (GPA 2.50+), 18–20 years, height 5'6\"+ (men). SI: bachelor's degree, 19–27 years. Physical test → written → viva → medical.",
          barrier: "High",
          salary: "Constable ~18,000–22,000 · SI ~30,000–38,000 with allowances",
          outlook: "Regular yearly recruitment (TRC) with thousands of seats; tough physical and written rounds.",
        },
      },
      {
        key: "army",
        name: "Bangladesh Army",
        match: /\barmy\b|সেনা|\bBMA\b|cantonment|military/i,
        guide: {
          entry: "Soldier: SSC (GPA 2.50+), 17–20 years. Officer (BMA long course): HSC (GPA 5 / A-levels), 16.5–21 years — ISSB is the key test.",
          barrier: "Very high",
          salary: "Sainik ~17,000–20,000 · Lieutenant ~45,000+ with allowances, housing, ration",
          outlook: "Two officer intakes a year; strong career path, UN missions boost income.",
        },
      },
      {
        key: "navy",
        name: "Bangladesh Navy",
        match: /\bnavy\b|নৌবাহিনী|naval/i,
        guide: {
          entry: "Sailor: SSC (science preferred), 17–20 years. Officer cadet: HSC science (GPA 5 often), ISSB.",
          barrier: "Very high",
          salary: "Sailor ~17,000–20,000 · Sub-Lieutenant ~45,000+ with allowances",
          outlook: "Regular intakes twice a year; technical branches value science backgrounds.",
        },
      },
      {
        key: "airforce",
        name: "Bangladesh Air Force",
        match: /air ?force|বিমান বাহিনী|\bBAF\b/i,
        guide: {
          entry: "Airman: HSC science (physics/math), 16–20 years. Officer (GDP/engineering): HSC science with high GPA, ISSB.",
          barrier: "Very high",
          salary: "Airman ~17,000–20,000 · Flying Officer ~45,000+ with allowances",
          outlook: "Small, selective intakes; technical trades are in demand.",
        },
      },
      {
        key: "bgb",
        name: "Border Guard Bangladesh (BGB)",
        match: /\bBGB\b|border guard|বিজিবি/i,
        guide: {
          entry: "Sepoy: SSC (GPA 2.50+), 18–23 years, physical fitness and height rules. Circular usually once a year.",
          barrier: "High",
          salary: "Sepoy ~17,000–20,000 with ration and housing",
          outlook: "Steady yearly recruitment; postings are often at borders.",
        },
      },
      { key: "ansar", name: "Ansar & VDP", match: /ansar|আনসার|\bVDP\b/i },
      { key: "fire", name: "Fire Service & Civil Defence", match: /fire service|civil defen[cs]e|ফায়ার সার্ভিস/i },
      {
        key: "revenue",
        name: "Tax, Customs & Revenue (NBR)",
        match: /tax|customs|\bvat\b|revenue|\bNBR\b|excise|কর অঞ্চল|withholding/i,
      },
      {
        key: "admin",
        name: "DC Office, Ministries & Administration",
        match: /deputy commissioner|\bDC\b|district|upazila|ministry|directorate|department|division|commission|জেলা|উপজেলা|মন্ত্রণালয়|অধিদপ্তর/i,
      },
      { key: "corp", name: "State Corporations & Utilities", match: /corporation|petrobangla|\bBCIC\b|\bBPDB\b|power|gas|\bWASA\b|railway|biman|\bBTCL\b|teletalk|authority|board/i },
      { key: "health", name: "Government Health", match: /hospital|medical college|health|স্বাস্থ্য/i },
      { key: "education", name: "Government Education", match: /school|college|university|madrasa|education|শিক্ষা/i },
      OTHER("government"),
    ],
  },
  {
    key: "bcs",
    name: "BCS (Civil Service)",
    icon: "🎖️",
    blurb: "The Bangladesh Civil Service cadres recruited by BPSC.",
    guide: {
      entry:
        "Bachelor's degree (4-year honours or 3-year + master's), age 21–32. Preliminary MCQ (200 marks) → written (900 marks general / cadre-specific) → viva (200). One BCS cycle takes 1.5–3 years.",
      barrier: "Very high",
      salary: "9th grade start: ~40,000–45,000 total with allowances, rising with grade; housing, car and pension at senior levels",
      outlook: "The most prestigious career for many graduates. ~2,000–3,000 cadre posts per BCS against 3–4 lakh applicants; also opens non-cadre 9th–12th grade posts.",
    },
    subs: [
      { key: "admin", name: "Admin Cadre", match: /\bBCS\b.*admin|প্রশাসন ক্যাডার/i },
      { key: "police", name: "Police Cadre", match: /\bBCS\b.*police|পুলিশ ক্যাডার/i },
      { key: "foreign", name: "Foreign Affairs Cadre", match: /\bBCS\b.*foreign|পররাষ্ট্র/i },
      { key: "tax", name: "Taxation & Customs Cadre", match: /\bBCS\b.*(tax|customs)/i },
      { key: "education", name: "General Education Cadre", match: /\bBCS\b.*(education|lecturer)|শিক্ষা ক্যাডার/i },
      { key: "health", name: "Health Cadre", match: /\bBCS\b.*(health|medical|doctor)|স্বাস্থ্য ক্যাডার/i },
      { key: "technical", name: "Technical / Professional Cadres", match: /\bBCS\b.*(engineer|agricultur|livestock|fisher)/i },
      { key: "general", name: "BCS & PSC circulars", match: /\bBCS\b|বিসিএস|\bBPSC\b|public service commission|non[- ]cadre/i },
    ],
  },
  {
    key: "it",
    name: "IT & Software",
    icon: "💻",
    blurb: "Web, software, mobile, QA, data, DevOps, networking and IT support.",
    guide: {
      entry:
        "A CSE/EEE degree helps but skills and a portfolio matter most. Juniors need 2–4 real projects on GitHub, one stack done well (e.g. MERN), problem solving and basic English. Many firms hire interns and freshers.",
      barrier: "Medium",
      salary: "Intern 8,000–15,000 · Junior 20,000–40,000 · Mid (2–4 yrs) 50,000–1,20,000 · Remote/foreign clients pay more",
      outlook: "Fast-growing: local software firms, fintech, e-commerce and remote work for foreign companies. Skill demand shifts quickly (AI, cloud), so keep learning.",
    },
    bdCats: [8],
    subs: [
      {
        key: "web",
        name: "Web Development",
        match: /web ?(developer|development|engineer|programmer|designer)|front[- ]?end|back[- ]?end|full[- ]?stack|\bmern\b|react|next\.?js|node|laravel|php|wordpress|django|javascript|typescript|shopify|angular|vue/i,
        guide: {
          entry: "HTML/CSS/JavaScript, then React/Next.js (front end) or Node/Express, Laravel (back end); databases (MongoDB/SQL); 3+ deployed projects and a GitHub profile.",
          barrier: "Medium",
          salary: "Intern 8,000–15,000 · Junior 20,000–40,000 · Mid 50,000–1,00,000+",
          outlook: "The largest IT hiring area in Bangladesh and the easiest entry into remote work.",
        },
      },
      {
        key: "mobile",
        name: "Mobile App Development",
        match: /mobile app|android|\bios\b|flutter|react native|kotlin|swift/i,
        guide: {
          entry: "Flutter or native Android (Kotlin) / iOS (Swift); 2–3 published or demo apps; REST APIs, state management.",
          barrier: "Medium",
          salary: "Junior 25,000–45,000 · Mid 60,000–1,20,000",
          outlook: "Steady demand from fintech, e-commerce and agencies; Flutter is very popular locally.",
        },
      },
      {
        key: "qa",
        name: "QA / SQA / Testing",
        match: /\bs?qa\b|quality assurance.*(software|engineer)|software test|\btester\b|test automation|automation (engineer|qa)|\bsdet\b/i,
        guide: {
          entry: "Manual testing basics (test cases, bug reports), then automation (Selenium/Playwright/Cypress), API testing (Postman), basic SQL. ISTQB is a plus.",
          barrier: "Low",
          salary: "Intern 10,000–15,000 · Junior 20,000–35,000 · Mid 45,000–90,000",
          outlook: "Every software company needs testers; automation skills are what raise pay.",
        },
      },
      {
        key: "uiux",
        name: "UI/UX & Product Design",
        match: /ui\/?ux|\bux\b|\bui\b designer|product designer|figma/i,
        guide: {
          entry: "Figma, design systems, user research basics; a case-study portfolio (Behance/Dribbble).",
          barrier: "Medium",
          salary: "Junior 20,000–40,000 · Mid 50,000–1,00,000",
          outlook: "Growing with product companies and remote freelancing.",
        },
      },
      {
        key: "data",
        name: "Data, AI & Machine Learning",
        match: /data (scien|analy|engineer)|machine learning|\bml\b|\bai\b|artificial intelligence|deep learning|\bnlp\b|business intelligence|\bbi\b developer|power bi/i,
        guide: {
          entry: "Python, SQL, statistics; for ML: pandas, scikit-learn, PyTorch; a few Kaggle-style projects. Analyst roles need Excel/Power BI.",
          barrier: "High",
          salary: "Junior 30,000–50,000 · Mid 70,000–1,50,000",
          outlook: "Rising fast with AI adoption, though local openings are still fewer than web roles.",
        },
      },
      {
        key: "devops",
        name: "DevOps, Cloud & Network",
        match: /devops|cloud|\baws\b|azure|kubernetes|docker|\bsre\b|network|system (admin|engineer)|\bnoc\b|linux|server|infrastructure|telecom|\bccna\b/i,
        guide: {
          entry: "Linux, networking (CCNA level), one cloud (AWS/Azure), Docker, CI/CD. Network roles often prefer CSE/EEE graduates.",
          barrier: "Medium",
          salary: "Junior 25,000–45,000 · Mid 60,000–1,50,000",
          outlook: "Strong demand in telecom, banks, ISPs and software firms.",
        },
      },
      {
        key: "security",
        name: "Cyber Security",
        match: /cyber|security (analyst|engineer|operations)|information security|\bsoc\b|penetration|pentest|ethical hack/i,
        guide: {
          entry: "Networking + Linux, security fundamentals (Security+, CEH), hands-on labs (TryHackMe).",
          barrier: "High",
          salary: "Junior 35,000–60,000 · Mid 80,000–1,80,000",
          outlook: "Banks and telecoms are building SOC teams; demand outpaces supply.",
        },
      },
      {
        key: "software",
        name: "Software Engineering",
        match: /software (engineer|developer|development)|programmer|\bsde\b|developer|\.net|java\b|python|golang|c\+\+|c#|erp (developer|programmer)|application development/i,
        guide: {
          entry: "Data structures & algorithms, one main language (Java, C#, Python, JS), OOP, databases; competitive programming helps at top firms.",
          barrier: "Medium",
          salary: "Junior 30,000–50,000 · Mid 60,000–1,50,000",
          outlook: "Core of the industry; top firms hire through coding tests and interviews.",
        },
      },
      {
        key: "support",
        name: "IT Support, Hardware & ERP",
        match: /it (support|officer|executive|assistant|manager)|hardware|help ?desk|desktop support|\berp\b|database admin|\bdba\b|computer (operator|technician)|\bmis\b|technical support/i,
        guide: {
          entry: "Diploma or bachelor's in CSE; hardware, Windows/Office, networking basics; ERP roles need the specific system (SAP, Odoo, Oracle).",
          barrier: "Low",
          salary: "15,000–30,000 entry · 35,000–70,000 mid",
          outlook: "Every company with offices needs IT support; ERP specialists earn well.",
        },
      },
      OTHER("IT"),
    ],
  },
  {
    key: "creative",
    name: "Digital Marketing & Creative",
    icon: "🎨",
    blurb: "Digital marketing, SEO, social media, graphic design, video editing, content.",
    guide: {
      entry: "Portfolio first. Tools: Meta Ads, Google Ads, SEO tools, Canva/Photoshop/Illustrator, Premiere/After Effects. No specific degree needed.",
      barrier: "Low",
      salary: "Entry 12,000–25,000 · Mid 30,000–70,000 · Freelance income can be higher",
      outlook: "Growing with e-commerce and F-commerce; very popular for freelancing (Fiverr, Upwork).",
    },
    bdCats: [18, 30, 71, 10],
    subs: [
      {
        key: "digital",
        name: "Digital Marketing & SEO",
        match: /digital market|\bseo\b|social media|facebook ads|google ads|performance market|e-?commerce market|\bsem\b|growth market|influencer|community manager/i,
        guide: {
          entry: "Meta & Google Ads, SEO, analytics; show results from a page or small business you ran.",
          barrier: "Low",
          salary: "Entry 15,000–25,000 · Mid 30,000–70,000",
          outlook: "In demand by nearly every brand and e-commerce shop.",
        },
      },
      {
        key: "graphic",
        name: "Graphic Design",
        match: /graphic|visuali[sz]er|illustrator|designer/i,
        guide: {
          entry: "Photoshop, Illustrator, Canva; a portfolio of logos, social posts and print work.",
          barrier: "Low",
          salary: "Entry 12,000–25,000 · Mid 30,000–60,000",
          outlook: "Steady demand; AI tools are changing simple work, so build strong concepts.",
        },
      },
      {
        key: "video",
        name: "Video Editing & Motion Graphics",
        match: /video|motion|animat|vfx|cameraman|\bdop\b|editor|photograph|youtube/i,
        guide: {
          entry: "Premiere Pro / CapCut / After Effects; a showreel of reels and ads.",
          barrier: "Low",
          salary: "Entry 12,000–25,000 · Mid 30,000–60,000",
          outlook: "Short-form video keeps demand rising for brands and creators.",
        },
      },
      { key: "content", name: "Content Writing & Creators", match: /content|copywrit|writer|presenter|anchor|script|journalist|reporter/i },
      OTHER("creative"),
    ],
  },
  {
    key: "banking",
    name: "Banks & Finance Institutions",
    icon: "🏦",
    blurb: "Commercial banks, mobile financial services, insurance, NBFIs, microfinance.",
    guide: {
      entry:
        "Bachelor's (any subject; BBA/economics preferred), good CGPA, often no third division. Probationary/MTO roles: written test (math, English, analytical) → viva. Govt banks recruit via the Bankers' Selection Committee.",
      barrier: "High",
      salary: "Officer/MTO: 35,000–60,000 · Senior officer 60,000–90,000 · plus festival bonuses",
      outlook: "Stable sector; digital banking and MFS (bKash, Nagad) growing; agent banking adds many entry posts.",
    },
    bdCats: [2],
    subs: [
      { key: "mto", name: "Officer / MTO / Probationary", match: /management trainee|\bMTO\b|probationary|trainee officer|junior officer|officer|cash/i },
      { key: "agent", name: "Agent & Mobile Banking", match: /agent banking|mobile (financial|banking)|\bMFS\b|bkash|nagad|rocket/i },
      { key: "insurance", name: "Insurance", match: /insurance|underwrit|claim|actuar/i },
      { key: "microfinance", name: "Microfinance & NGO Credit", match: /credit officer|microfinance|loan officer|field credit/i },
      { key: "relationship", name: "Relationship & Sales (Banking)", match: /relationship|sales|business development|branch/i },
      OTHER("banking"),
    ],
  },
  {
    key: "accounts",
    name: "Accounts & Finance",
    icon: "📊",
    blurb: "Accounting, audit, finance, VAT & tax compliance.",
    guide: {
      entry: "BBA/MBA or BCom/MCom in accounting/finance; Tally/ERP and Excel; CA/CMA/ACCA raises pay sharply.",
      barrier: "Medium",
      salary: "Entry 18,000–30,000 · Mid 40,000–80,000 · CA/CMA 1,00,000+",
      outlook: "Every company needs accountants; qualified professionals are always in demand.",
    },
    bdCats: [1],
    subs: [
      { key: "audit", name: "Audit & Internal Control", match: /audit|internal control|compliance officer \(finance/i },
      { key: "tax", name: "VAT & Tax", match: /\bvat\b|tax/i },
      { key: "finance", name: "Finance & Treasury", match: /finance|treasury|financial analyst|investment|budget/i },
      { key: "accounts", name: "Accounts", match: /account|cashier|bookkeep|billing|হিসাব|একাউন্টস|অ্যাকাউন্ট|credit|controller|economist/i },
      OTHER("accounts"),
    ],
  },
  {
    key: "rmg",
    name: "Garments (RMG) & Textile",
    icon: "🧵",
    blurb: "Merchandising, production, quality, compliance, textile engineering.",
    guide: {
      entry: "Textile engineering or any degree for merchandising; diploma for technical posts; operators need little formal education. English and buyer communication matter for merchandisers.",
      barrier: "Low",
      salary: "Operator 12,500–18,000 · Junior merchandiser 20,000–35,000 · Manager 80,000+",
      outlook: "Bangladesh's biggest export sector; automation and green factories are reshaping roles.",
    },
    bdCats: [6, 74, 78],
    subs: [
      { key: "merch", name: "Merchandising", match: /merchandis/i },
      { key: "quality", name: "Quality (QA/QC) & Lab", match: /quality|\bqc\b|\bqa\b|inspector|lab/i },
      { key: "compliance", name: "Compliance & CSR", match: /compliance|csr|sustainab|welfare/i },
      { key: "ie", name: "Industrial Engineering & Planning", match: /industrial engineer|\bie\b|planning|work study/i },
      { key: "operator", name: "Operators & Technicians", match: /operator|sewing|helper|technician|mechanic|tailor|cutting|knitting|dyeing/i },
      { key: "production", name: "Production & Factory Management", match: /production|factory|floor|line (chief|supervisor)|supervisor|manager/i },
      OTHER("RMG"),
    ],
  },
  {
    key: "engineering",
    name: "Engineering & Construction",
    icon: "🏗️",
    blurb: "Civil, electrical, mechanical, architecture, interior and site engineering.",
    guide: {
      entry: "BSc or diploma in engineering (civil/EEE/ME); AutoCAD, site experience. Diploma engineers fill many sub-assistant posts.",
      barrier: "Medium",
      salary: "Diploma 18,000–30,000 · BSc 30,000–50,000 entry · Mid 60,000–1,20,000",
      outlook: "Mega-projects, power and real estate drive steady demand.",
    },
    bdCats: [5, 62, 76],
    subs: [
      { key: "civil", name: "Civil & Structural", match: /civil|structural|site engineer|construction|quantity survey|estimat/i },
      { key: "electrical", name: "Electrical & Electronics", match: /electrical|electronic|\beee\b|power|substation|generator/i },
      { key: "mechanical", name: "Mechanical & HVAC", match: /mechanical|hvac|refrigeration|boiler|maintenance engineer|\bmep\b/i },
      { key: "architecture", name: "Architecture & Interior", match: /architect|interior|autocad|draftsman|3d/i },
      { key: "hse", name: "HSE & Safety", match: /\bhse\b|safety|fire/i },
      OTHER("engineering"),
    ],
  },
  {
    key: "medical",
    name: "Medical & Healthcare",
    icon: "🩺",
    blurb: "Doctors, nurses, medical technologists, pharmacists, physiotherapists.",
    guide: {
      entry: "MBBS/BDS + BMDC registration for doctors; Diploma/BSc in nursing + BNMC registration for nurses; diploma in medical technology for technologists.",
      barrier: "High",
      salary: "Medical officer 40,000–80,000 · Nurse 18,000–35,000 · Technologist 15,000–30,000",
      outlook: "Private hospitals and diagnostics are expanding; nurses also have strong overseas demand.",
    },
    bdCats: [11, 63, 65, 92],
    subs: [
      { key: "doctor", name: "Doctors & Specialists", match: /doctor|medical officer|physician|specialist|consultant|surgeon|\bmbbs\b|dental|\bbds\b|cardiolog|gyn|pediatric|sonolog|radiolog|patholog|মেডিকেল অফিসার|মেডিক্যাল অফিসার|ডাক্তার|কনসালটেন্ট|\brmo\b|\bsmo\b|embryolog|anesthes|microbiolog/i },
      { key: "nurse", name: "Nursing & Midwifery", match: /nurs|midwi|matron/i },
      { key: "tech", name: "Medical Technologists & Lab", match: /technolog|technician|\blab\b|x-?ray|phlebotom|radiograph|\becg\b|\busg\b|ল্যাব|মেডিকেল অ্যাসিস্ট্যান্ট|\bot\b|ও.টি/i },
      { key: "pharmacist", name: "Pharmacists", match: /pharmacist/i },
      { key: "therapy", name: "Physiotherapy & Therapy", match: /physio|therap|nutrition|dietit|psycholog|counsel/i },
      { key: "hospital", name: "Hospital Admin & Support", match: /hospital|patient|ward|billing|front desk|medical (records|assistant)/i },
      OTHER("medical"),
    ],
  },
  {
    key: "pharma",
    name: "Pharmaceuticals",
    icon: "💊",
    blurb: "Medical promotion (MPO), pharma production, QC/QA, regulatory.",
    guide: {
      entry: "B.Pharm/M.Pharm for production and QC; any bachelor's (science preferred) for MPO with good communication.",
      barrier: "Medium",
      salary: "MPO 20,000–35,000 + incentives · Production/QC officer 30,000–50,000",
      outlook: "A strong, export-growing industry; MPO roles hire in large numbers.",
    },
    bdCats: [29],
    subs: [
      { key: "mpo", name: "Medical Promotion (MPO)", match: /medical promotion|\bMPO\b|medical representative|territory|promotion officer/i },
      { key: "qc", name: "Quality Control & Assurance", match: /quality|\bqc\b|\bqa\b|validation|regulatory/i },
      { key: "production", name: "Production", match: /production|manufactur|formulation/i },
      OTHER("pharma"),
    ],
  },
  {
    key: "sales",
    name: "Sales & Business Development",
    icon: "📈",
    blurb: "Field sales, corporate sales, business development, retail and showroom sales.",
    guide: {
      entry: "Any HSC/bachelor's; communication, persistence, a two-wheeler and license help for field roles. Targets and incentives are part of pay.",
      barrier: "Low",
      salary: "SR/field 12,000–20,000 + incentive · Executive 20,000–40,000 · Manager 60,000+",
      outlook: "The largest hiring category in Bangladesh — always open, high turnover, good path for performers.",
    },
    bdCats: [9, 84, 83],
    subs: [
      { key: "bd", name: "Business Development & Corporate Sales", match: /business development|corporate sales|\bB2B\b|key account|account manager|partnership/i },
      { key: "field", name: "Field Sales & Distribution", match: /sales representative|\bSR\b|territory|area (sales|manager)|field|distribut|dealer|\bTSO\b|\bASM\b|\bRSM\b|বিক্রয়|সেলস|ডিস্ট্রিবিউটর|ফিল্ড|ক্রেডিট/i },
      { key: "retail", name: "Showroom & Retail Sales", match: /showroom|retail|salesman|sales (girl|boy|associate|man)|store|outlet|cashier/i },
      { key: "telesales", name: "Tele-sales", match: /tele ?sales|telemarketing/i },
      { key: "marketing", name: "Brand & Marketing", match: /marketing|brand|product manager|trade marketing|promotion|মার্কেটিং/i },
      { key: "exec", name: "Sales Executives & Managers", match: /sales/i },
      OTHER("sales"),
    ],
  },
  {
    key: "education",
    name: "Education & Training",
    icon: "🎓",
    blurb: "School and college teachers, university faculty, trainers, study-abroad counsellors.",
    guide: {
      entry: "Bachelor's/master's in the subject; NTRCA certificate for MPO-listed schools; university faculty need a strong CGPA and research. Counsellors need English (IELTS).",
      barrier: "Medium",
      salary: "School teacher 12,000–30,000 · Lecturer (private univ.) 35,000–60,000 · Counsellor 20,000–40,000",
      outlook: "Steady; English-medium schools and study-abroad agencies are growing fast.",
    },
    bdCats: [4],
    subs: [
      { key: "university", name: "University Faculty", match: /professor|lecturer|faculty|university|প্রভাষক|অধ্যাপক|vice[- ]chancellor|librar|controller of exam/i },
      { key: "counsellor", name: "Study Abroad & Student Counselling", match: /counsel|study abroad|admission|visa|student/i },
      { key: "trainer", name: "Trainers & Instructors", match: /trainer|instructor|coach|tutor/i },
      { key: "school", name: "School & College Teachers", match: /teacher|শিক্ষক|principal|head ?master|coordinator|মাদার টিচার|vice[- ]principal|ভাইস প্রিন্সিপাল|academic/i },
      OTHER("education"),
    ],
  },
  {
    key: "hradmin",
    name: "HR, Admin & Office",
    icon: "🗂️",
    blurb: "HR, administration, office assistants, receptionists, data entry.",
    guide: {
      entry: "Bachelor's (HR/management preferred for HR); MS Office; office support roles need SSC/HSC.",
      barrier: "Low",
      salary: "Office assistant 10,000–16,000 · HR/Admin executive 20,000–40,000 · Manager 70,000+",
      outlook: "Stable across every industry.",
    },
    bdCats: [7, 17, 14, 15, 61, 79],
    subs: [
      { key: "hr", name: "Human Resources", match: /\bhr\b|human resource|recruit|talent|payroll|learning & development|people/i },
      { key: "admin", name: "Administration", match: /admin|general manager|operations manager|office manager/i },
      { key: "frontdesk", name: "Reception & Personal Assistant", match: /reception|front desk|personal (secretary|assistant)|secretary/i },
      { key: "dataentry", name: "Data Entry & Computer Operator", match: /data entry|computer operator|typist|ডাটা|কম্পিউটার/i },
      { key: "support", name: "Office Assistant & Support Staff", match: /office (assistant|support|boy)|peon|support staff|অফিস সহায়ক|অফিস সহকারী/i },
      OTHER("office"),
    ],
  },
  {
    key: "customer",
    name: "Customer Service & Call Center",
    icon: "🎧",
    blurb: "Call centres, customer care, client support, BPO.",
    guide: {
      entry: "HSC/bachelor's, clear Bangla and English, basic computer skills; night shifts for international BPO.",
      barrier: "Low",
      salary: "Agent 12,000–20,000 · International BPO 20,000–40,000",
      outlook: "BPO and e-commerce support are growing; good first job for students.",
    },
    bdCats: [16],
    subs: [
      { key: "callcenter", name: "Call Center & BPO", match: /call cent|\bbpo\b|contact cent|night shift|tele|কল সেন্টার|কলিং|টেলিসেলস|\bcrm\b|moderator|appointment setter/i },
      { key: "care", name: "Customer Care & Support", match: /customer|client|service|support|care|কাস্টমার/i },
      OTHER("customer service"),
    ],
  },
  {
    key: "scm",
    name: "Supply Chain, Logistics & Commercial",
    icon: "🚚",
    blurb: "Procurement, warehouse, logistics, import-export commercial, delivery.",
    guide: {
      entry: "Bachelor's (any; SCM/BBA preferred) for executive roles; delivery and warehouse roles need SSC/HSC.",
      barrier: "Low",
      salary: "Delivery 12,000–18,000 · Executive 22,000–40,000 · Manager 70,000+",
      outlook: "E-commerce and exports keep logistics growing.",
    },
    bdCats: [3, 27, 19, 77],
    subs: [
      { key: "procurement", name: "Procurement & Purchase", match: /procure|purchas|sourcing|vendor/i },
      { key: "commercial", name: "Commercial (Import / Export)", match: /commercial|import|export|shipping|customs|\bLC\b/i },
      { key: "warehouse", name: "Warehouse & Inventory", match: /warehouse|store|inventory|depot/i },
      { key: "logistics", name: "Logistics & Transport", match: /logistic|transport|fleet|supply chain|\bscm\b|distribution/i },
      { key: "delivery", name: "Delivery & Riders", match: /deliver|rider|courier|ডেলিভারি/i },
      { key: "operations", name: "Operations & Production Planning", match: /operation|planning|production/i },
      OTHER("supply chain"),
    ],
  },
  {
    key: "ngo",
    name: "NGO & Development",
    icon: "🤝",
    blurb: "Development projects, field facilitators, M&E, programme roles.",
    guide: {
      entry: "Bachelor's/master's (social science, development studies); field posts need local language; M&E roles need data skills.",
      barrier: "Medium",
      salary: "Field facilitator 18,000–30,000 · Officer 35,000–60,000 · International NGOs pay more",
      outlook: "Project-based (contracts tied to funding); Rohingya response and climate work add posts.",
    },
    bdCats: [12],
    subs: [
      { key: "field", name: "Field Facilitators & Organisers", match: /field|facilitat|organi[sz]er|mobili[sz]er|community|ফিল্ড|ক্রেডিট/i },
      { key: "me", name: "Monitoring, Evaluation & Research", match: /monitor|evaluation|\bM&E\b|\bMEAL\b|research/i },
      { key: "programme", name: "Programme & Project Management", match: /program|project|coordinator|manager|officer|specialist|শাখা|branch|team leader|প্রকৌশলী/i },
      OTHER("NGO"),
    ],
  },
  {
    key: "hospitality",
    name: "Hospitality, Travel & Food",
    icon: "🍽️",
    blurb: "Hotels, restaurants, chefs, travel agencies, tourism.",
    guide: {
      entry: "Hotel management diploma helps; chefs learn on the job; travel agencies want ticketing (Amadeus/Galileo) skills.",
      barrier: "Low",
      salary: "Waiter 10,000–15,000 · Chef 18,000–50,000 · Travel executive 18,000–35,000",
      outlook: "Growing with tourism and food businesses; strong overseas demand for chefs.",
    },
    bdCats: [20, 64, 68, 69],
    subs: [
      { key: "chef", name: "Chefs & Kitchen", match: /chef|cook|kitchen|bak|barista|pastry|শেফ|বাবুর্চি|commis|\bcdp\b|bartender/i },
      { key: "travel", name: "Travel, Ticketing & Tourism", match: /travel|ticket|tour|reservation|visa|airline|hajj/i },
      { key: "hotel", name: "Hotel & Service Staff", match: /hotel|waiter|housekeep|room|guest|restaurant|resort|steward|f&b|ওয়েটার|হাউজকিপ|হাউসকিপ|hostess|front office|গেস্ট|catering/i },
      OTHER("hospitality"),
    ],
  },
  {
    key: "trades",
    name: "Driving, Security & Skilled Trades",
    icon: "🛠️",
    blurb: "Drivers, security guards, electricians, plumbers, welders, technicians.",
    guide: {
      entry: "Mostly skills-based: a driving license, trade certificate (BTEB/TTC) or experience. Overseas jobs often ask for a trade test.",
      barrier: "Low",
      salary: "Security guard 10,000–15,000 · Driver 15,000–25,000 · Electrician 15,000–30,000",
      outlook: "Constant demand locally and abroad (Middle East).",
    },
    bdCats: [67, 70, 24, 66, 72, 73, 75, 80, 82, 90, 89, 91],
    subs: [
      { key: "driver", name: "Drivers", match: /driver|চালক|ড্রাইভার/i },
      { key: "security", name: "Security", match: /security|guard|প্রহরী|bodyguard|gunman|সিকিউরিটি|protocol/i },
      { key: "electrician", name: "Electricians & Technicians", match: /electrician|technician|mechanic|ইলেকট্রিশিয়ান|টেকনিশিয়ান|মেকানিক/i },
      { key: "trade", name: "Plumbers, Welders & Construction", match: /plumb|weld|carpent|mason|foreman|fitter|boiler|প্লাম্বার|ওয়েল্ডার|মিস্ত্রি/i },
      { key: "care", name: "Cleaners, Caregivers & Helpers", match: /clean|caregiver|nanny|maid|\baya\b|ward ?boy|helper|পরিচ্ছন্ন|কেয়ারগিভার|আয়া/i },
      OTHER("trades"),
    ],
  },
  {
    key: "legal",
    name: "Legal",
    icon: "⚖️",
    blurb: "Legal officers, lawyers, company secretaries.",
    guide: {
      entry: "LLB (Hons) / LLM; Bar Council enrolment to practise; corporate legal roles prefer experience.",
      barrier: "High",
      salary: "Legal officer 30,000–60,000 · Senior 80,000+",
      outlook: "Steady corporate demand; the judicial service (BJSC) is a separate government path.",
    },
    bdCats: [22, 28],
    subs: [
      { key: "legal", name: "Legal Officers & Lawyers", match: /legal|law|advocate|lawyer|counsel|আইন/i },
      { key: "secretary", name: "Company Secretary & Corporate Affairs", match: /secretar|corporate affairs/i },
      OTHER("legal"),
    ],
  },
  {
    key: "agro",
    name: "Agriculture, Agro & Fisheries",
    icon: "🌾",
    blurb: "Agriculture officers, farms, feed, seed, veterinary, fisheries.",
    guide: {
      entry: "BSc in agriculture, DVM for veterinary, fisheries degrees; field posts welcome diploma holders.",
      barrier: "Medium",
      salary: "Officer 25,000–45,000 · Vet doctor 30,000–60,000",
      outlook: "Agro-processing, poultry and feed companies are expanding.",
    },
    bdCats: [26],
    subs: [
      { key: "vet", name: "Veterinary & Livestock", match: /veterin|livestock|poultry|dairy|\bdvm\b/i },
      { key: "agri", name: "Agriculture & Agronomy", match: /agricultur|agronom|seed|crop|farm|hydroponic/i },
      { key: "fish", name: "Fisheries", match: /fish|aqua/i },
      OTHER("agro"),
    ],
  },
  {
    key: "overseas",
    name: "Overseas Jobs",
    icon: "✈️",
    blurb: "Jobs abroad posted in Bangladesh — Middle East, Europe, Asia.",
    guide: {
      entry: "Passport, trade skill or certificate, medical fitness; register with BMET. Use licensed agencies only and never pay outside the official fee.",
      barrier: "Medium",
      salary: "Unskilled ~30,000–50,000 · Skilled ~50,000–1,20,000 (BDT equivalent)",
      outlook: "Remittance backbone of the economy; skilled workers (nurses, electricians, chefs) earn far more.",
    },
    subs: [
      { key: "middleeast", name: "Middle East", match: /saudi|\bksa\b|qatar|dubai|\buae\b|oman|kuwait|bahrain|jordan|সৌদি|কাতার/i },
      { key: "europe", name: "Europe", match: /romania|poland|croatia|serbia|hungary|malta|portugal|italy|europe|bulgaria|albania/i },
      { key: "asia", name: "Asia & Others", match: /malaysia|singapore|japan|korea|mauritius|maldives|brunei|china|thailand/i },
    ],
  },
];

export const OTHER_CATEGORY: Category = {
  key: "other",
  name: "Other Jobs",
  icon: "🧩",
  blurb: "Jobs that don't fit the paths above.",
  guide: { entry: "Varies by job.", barrier: "Medium", salary: "Varies", outlook: "Mixed." },
  subs: [OTHER("jobs")],
};

export const ALL_CATEGORIES = [...CATEGORIES, OTHER_CATEGORY];
export const categoryByKey = (key: string) => ALL_CATEGORIES.find((c) => c.key === key);

/**
 * Bengali য়/ড়/ঢ় can be one code point or a letter + nukta, and sites mix both. NFC turns both into
 * letter + nukta — the form the patterns in this file use.
 */
export function bnFix(s: string): string {
  return s.normalize("NFC");
}

// ── Classification ──────────────────────────────────────────────────────────────────────────

const GOVT_EMPLOYER =
  /government|\bgovt\b|ministry|public service commission|\bBPSC\b|border guard|directorate|deputy commissioner|\bDC office\b|upazila|zila parishad|police|army|navy|air force|\bBGB\b|ansar|fire service|commissioner of taxes|taxes zone|customs|\bNBR\b|petrobangla|\bBCIC\b|\bBPDB\b|\bBADC\b|\bBRTA\b|\bBTCL\b|bangladesh bank|sonali bank|janata bank|agrani bank|rupali bank|city corporation|pourashava|railway|সরকার|মন্ত্রণালয়|অধিদপ্তর|জেলা প্রশাসক/i;
const BANK_EMPLOYER = /\bbank\b|bkash|nagad|insurance|leasing|finance (ltd|limited|plc)|financial|microfinance|\bMFS\b/i;
const OVERSEAS = /\b(saudi|ksa|qatar|dubai|uae|oman|kuwait|bahrain|jordan|romania|poland|croatia|serbia|malta|portugal|malaysia|singapore|japan|korea|mauritius|maldives|brunei)\b|সৌদি আরব|কাতার/i;

/** Title rules tried in this order (first category whose sub matches wins). */
const TITLE_ORDER = ["bcs", "it", "creative", "medical", "pharma", "legal", "agro", "engineering", "accounts", "education", "customer", "hospitality", "trades", "hradmin", "scm", "rmg", "ngo", "sales"];

function pickSub(cat: Category, text: string): SubCategory | undefined {
  return cat.subs.find((s) => s.match.test(text));
}

export interface Classified {
  category: string;
  subcategory: string;
}

export function classify(input: { title: string; company?: string | null; location?: string | null; source: string; bdCat?: number }): Classified {
  const title = bnFix(input.title.normalize("NFKC"));
  const company = bnFix(input.company ?? "");
  const byKey = (k: string) => CATEGORIES.find((c) => c.key === k)!;

  // BCS circulars, wherever they come from (BPSC's other posts are ordinary government jobs).
  const bcs = byKey("bcs");
  if (/\bBCS\b|বিসিএস|non[- ]cadre|নন-ক্যাডার/i.test(title)) return { category: "bcs", subcategory: pickSub(bcs, title)?.key ?? "general" };

  // Government employer (every Teletalk circular is one).
  if (input.source === "teletalk" || GOVT_EMPLOYER.test(company)) {
    const govt = byKey("govt");
    // The employer says more than the post ("Office Support Staff" at the Police office).
    return { category: "govt", subcategory: (pickSub(govt, company) ?? pickSub(govt, title) ?? { key: "other" }).key };
  }

  // Work abroad.
  if (OVERSEAS.test(`${title} ${input.location ?? ""}`)) {
    const ov = byKey("overseas");
    return { category: "overseas", subcategory: pickSub(ov, `${title} ${input.location ?? ""}`)?.key ?? "asia" };
  }

  // Bank / finance employer: the job sits in banking unless it's plainly an IT or legal role.
  if (BANK_EMPLOYER.test(company) || input.bdCat === 2) {
    const it = byKey("it");
    const itSub = it.subs.find((s) => s.key !== "other" && s.match.test(title));
    if (itSub) return { category: "it", subcategory: itSub.key };
    return { category: "banking", subcategory: pickSub(byKey("banking"), title)?.key ?? "other" };
  }

  // The BDJobs functional category decides first when it's a specific field; then the title.
  const home = input.bdCat !== undefined ? CATEGORIES.find((c) => c.bdCats?.includes(input.bdCat!)) : undefined;
  if (home) {
    const sub = home.subs.find((s) => s.key !== "other" && s.match.test(title));
    if (sub) return { category: home.key, subcategory: sub.key };
  }
  for (const key of TITLE_ORDER) {
    const cat = byKey(key);
    const sub = cat.subs.find((s) => s.key !== "other" && s.match.test(title));
    if (sub) return { category: cat.key, subcategory: sub.key };
  }
  if (home) return { category: home.key, subcategory: "other" };
  return { category: "other", subcategory: "other" };
}

// ── Field parsing ───────────────────────────────────────────────────────────────────────────

/** "Executive/ Sr. Executive - Finance & Accounts (Factory) 07 Posts" → "Executive/Sr. Executive - Finance & Accounts". */
export function normTitle(title: string): string {
  let t = title.normalize("NFKC");
  t = t.replace(/\([^)]*\)|\[[^\]]*\]/g, " "); // parentheticals: (Night Shift), (Remote)
  t = t.replace(/\b\d+\s*posts?\b/gi, " ").replace(/[–—]/g, "-");
  t = t.replace(/\s*\/\s*/g, "/").replace(/\s+/g, " ").replace(/^[\s\-–,:.]+|[\s\-–,:.]+$/g, "");
  if (!t) return title.trim();
  // Same title, different capitalisation → one row.
  return t
    .split(" ")
    .map((w) => (w.length > 3 && w === w.toUpperCase() && !/[^A-Z]/.test(w) ? w : w.charAt(0).toUpperCase() + w.slice(1).toLowerCase()))
    .join(" ")
    .replace(/\b(It|Hr|Qa|Sqa|Qc|Ui|Ux|Seo|Ai|Ml|Mpo|Mto|Erp|Ceo|Gm|Agm|Bd|Ngo|Csr|Hse|Mis)\b/g, (m) => m.toUpperCase());
}

/** "Tk. 20000 - 28000 (Monthly)" → { min, max } in BDT a month. */
export function parseSalary(s?: string | null): { min?: number; max?: number } {
  if (!s) return {};
  const m = s.replace(/,/g, "").match(/(\d{3,7})(?:\s*-\s*(\d{3,7}))?\s*(?:\(?\s*(monthly|yearly|annual|hourly|daily|weekly))?/i);
  if (!m) return {};
  const per = (m[3] ?? "monthly").toLowerCase();
  const factor = per === "yearly" || per === "annual" ? 1 / 12 : per === "daily" ? 26 : per === "hourly" ? 208 : per === "weekly" ? 4.3 : 1;
  const min = Math.round(Number(m[1]) * factor);
  const max = Math.round(Number(m[2] ?? m[1]) * factor);
  // Ignore nonsense (e.g. "Tk. 100") and very large outliers.
  if (min < 3000 || max > 2_000_000) return {};
  return { min, max };
}

/** "At least 3 years" → 3, "0 to 2 years" → 0, "NA" → undefined. */
export function parseExperience(s?: string | null): number | undefined {
  if (!s || /^na$/i.test(s.trim())) return undefined;
  const m = s.match(/(\d+)/);
  return m ? Number(m[1]) : undefined;
}

const EDU: [string, RegExp][] = [
  ["ssc", /\bssc\b|secondary school|class ?(8|eight|10)|এসএসসি|অষ্টম/i],
  ["hsc", /\bhsc\b|higher secondary|এইচএসসি/i],
  ["diploma", /diploma|ডিপ্লোমা/i],
  ["bachelor", /bachelor|\bb\.?\s?sc\b|\bbba\b|\bb\.?a\b|\bbcom\b|honours|graduat|\bbss\b|\bllb\b|b\.?\s?pharm|\bbds\b|স্নাতক/i],
  ["mbbs", /\bmbbs\b/i],
  ["masters", /master|\bm\.?\s?sc\b|\bmba\b|\bm\.?a\b|\bmcom\b|\bmss\b|\bllm\b|স্নাতকোত্তর/i],
  ["phd", /ph\.?\s?d|doctorate/i],
];

/** The lowest education level a post accepts ("HSC or Diploma" → "hsc"). */
export function parseEducation(s?: string | null): string | undefined {
  if (!s) return undefined;
  return EDU.find(([, re]) => re.test(s))?.[0];
}

export const EDU_LABELS: Record<string, string> = {
  ssc: "SSC or below",
  hsc: "HSC",
  diploma: "Diploma",
  bachelor: "Bachelor's",
  mbbs: "MBBS",
  masters: "Master's",
  phd: "PhD",
};
