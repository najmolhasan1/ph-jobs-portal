export interface BdDistrict {
  id: string;
  nameEn: string;
  nameBn: string;
  division: string;
  x: number; // Percentage 0 - 100 for SVG map
  y: number; // Percentage 0 - 100 for SVG map
}

export const BD_DISTRICTS: BdDistrict[] = [
  // Dhaka Division
  { id: "dhaka", nameEn: "Dhaka", nameBn: "ঢাকা", division: "Dhaka", x: 50, y: 55 },
  { id: "gazipur", nameEn: "Gazipur", nameBn: "গাজীপুর", division: "Dhaka", x: 51, y: 49 },
  { id: "narayanganj", nameEn: "Narayanganj", nameBn: "নারায়ণগঞ্জ", division: "Dhaka", x: 53, y: 58 },
  { id: "tangail", nameEn: "Tangail", nameBn: "টাঙ্গাইল", division: "Dhaka", x: 44, y: 44 },
  { id: "faridpur", nameEn: "Faridpur", nameBn: "ফরিদপুর", division: "Dhaka", x: 42, y: 59 },
  { id: "manikganj", nameEn: "Manikganj", nameBn: "মানিকগঞ্জ", division: "Dhaka", x: 45, y: 53 },
  { id: "munshiganj", nameEn: "Munshiganj", nameBn: "মুন্সীগঞ্জ", division: "Dhaka", x: 51, y: 61 },
  { id: "narsingdi", nameEn: "Narsingdi", nameBn: "নরসিংদী", division: "Dhaka", x: 56, y: 51 },
  { id: "gopalganj", nameEn: "Gopalganj", nameBn: "গোপালগঞ্জ", division: "Dhaka", x: 43, y: 67 },
  { id: "madaripur", nameEn: "Madaripur", nameBn: "মাদারীপুর", division: "Dhaka", x: 48, y: 64 },
  { id: "rajbari", nameEn: "Rajbari", nameBn: "রাজবাড়ী", division: "Dhaka", x: 38, y: 54 },
  { id: "shariatpur", nameEn: "Shariatpur", nameBn: "শরীয়তপুর", division: "Dhaka", x: 51, y: 66 },
  { id: "kishoreganj", nameEn: "Kishoreganj", nameBn: "কিশোরগঞ্জ", division: "Dhaka", x: 57, y: 43 },

  // Chattogram Division
  { id: "chattogram", nameEn: "Chattogram", nameBn: "চট্টগ্রাম", division: "Chattogram", x: 74, y: 72 },
  { id: "coxsbazar", nameEn: "Cox's Bazar", nameBn: "কক্সবাজার", division: "Chattogram", x: 80, y: 86 },
  { id: "cumilla", nameEn: "Cumilla", nameBn: "কুমিল্লা", division: "Chattogram", x: 62, y: 60 },
  { id: "feni", nameEn: "Feni", nameBn: "ফেনী", division: "Chattogram", x: 68, y: 66 },
  { id: "brahmanbaria", nameEn: "Brahmanbaria", nameBn: "ব্রাহ্মণবাড়িয়া", division: "Chattogram", x: 62, y: 51 },
  { id: "chandpur", nameEn: "Chandpur", nameBn: "চাঁদপুর", division: "Chattogram", x: 56, y: 65 },
  { id: "lakshmipur", nameEn: "Lakshmipur", nameBn: "লক্ষ্মীপুর", division: "Chattogram", x: 59, y: 71 },
  { id: "noakhali", nameEn: "Noakhali", nameBn: "নোয়াখালী", division: "Chattogram", x: 64, y: 71 },
  { id: "khagrachhari", nameEn: "Khagrachhari", nameBn: "খাগড়াছড়ি", division: "Chattogram", x: 78, y: 58 },
  { id: "rangamati", nameEn: "Rangamati", nameBn: "রাঙ্গামাটি", division: "Chattogram", x: 82, y: 67 },
  { id: "bandarban", nameEn: "Bandarban", nameBn: "বান্দরবান", division: "Chattogram", x: 84, y: 80 },

  // Sylhet Division
  { id: "sylhet", nameEn: "Sylhet", nameBn: "সিলেট", division: "Sylhet", x: 78, y: 35 },
  { id: "moulvibazar", nameEn: "Moulvibazar", nameBn: "মৌলভীবাজার", division: "Sylhet", x: 75, y: 42 },
  { id: "habiganj", nameEn: "Habiganj", nameBn: "হবিগঞ্জ", division: "Sylhet", x: 68, y: 46 },
  { id: "sunamganj", nameEn: "Sunamganj", nameBn: "সুনামগঞ্জ", division: "Sylhet", x: 68, y: 32 },

  // Rajshahi Division
  { id: "rajshahi", nameEn: "Rajshahi", nameBn: "রাজশাহী", division: "Rajshahi", x: 23, y: 44 },
  { id: "bogura", nameEn: "Bogura", nameBn: "বগুড়া", division: "Rajshahi", x: 37, y: 37 },
  { id: "pabna", nameEn: "Pabna", nameBn: "পাবনা", division: "Rajshahi", x: 34, y: 50 },
  { id: "sirajganj", nameEn: "Sirajganj", nameBn: "সিরাজগঞ্জ", division: "Rajshahi", x: 42, y: 45 },
  { id: "naogaon", nameEn: "Naogaon", nameBn: "নওগাঁ", division: "Rajshahi", x: 26, y: 36 },
  { id: "natore", nameEn: "Natore", nameBn: "নাটোর", division: "Rajshahi", x: 30, y: 45 },
  { id: "chapai_nawabganj", nameEn: "Chapai Nawabganj", nameBn: "চাঁপাইনবাবগঞ্জ", division: "Rajshahi", x: 17, y: 41 },
  { id: "joypurhat", nameEn: "Joypurhat", nameBn: "জয়পুরহাট", division: "Rajshahi", x: 30, y: 31 },

  // Khulna Division
  { id: "khulna", nameEn: "Khulna", nameBn: "খুলনা", division: "Khulna", x: 39, y: 73 },
  { id: "jashore", nameEn: "Jashore", nameBn: "যশোর", division: "Khulna", x: 31, y: 64 },
  { id: "satkhira", nameEn: "Satkhira", nameBn: "সাতক্ষীরা", division: "Khulna", x: 31, y: 75 },
  { id: "bagerhat", nameEn: "Bagerhat", nameBn: "বাগেরহাট", division: "Khulna", x: 45, y: 76 },
  { id: "kushtia", nameEn: "Kushtia", nameBn: "কুষ্টিয়া", division: "Khulna", x: 28, y: 53 },
  { id: "chuadanga", nameEn: "Chuadanga", nameBn: "চুয়াডাঙ্গা", division: "Khulna", x: 24, y: 58 },
  { id: "jhenaidah", nameEn: "Jhenaidah", nameBn: "ঝিনাইদহ", division: "Khulna", x: 31, y: 58 },
  { id: "magura", nameEn: "Magura", nameBn: "মাগুরা", division: "Khulna", x: 37, y: 60 },
  { id: "meherpur", nameEn: "Meherpur", nameBn: "মেহেরপুর", division: "Khulna", x: 22, y: 54 },
  { id: "narail", nameEn: "Narail", nameBn: "নড়াইল", division: "Khulna", x: 39, y: 66 },

  // Barishal Division
  { id: "barishal", nameEn: "Barishal", nameBn: "বরিশাল", division: "Barishal", x: 50, y: 72 },
  { id: "bhola", nameEn: "Bhola", nameBn: "ভোলা", division: "Barishal", x: 58, y: 78 },
  { id: "patuakhali", nameEn: "Patuakhali", nameBn: "পটুয়াখালী", division: "Barishal", x: 50, y: 81 },
  { id: "pirojpur", nameEn: "Pirojpur", nameBn: "পিরোজপুর", division: "Barishal", x: 43, y: 74 },
  { id: "barguna", nameEn: "Barguna", nameBn: "বরগুনা", division: "Barishal", x: 45, y: 83 },
  { id: "jhalokati", nameEn: "Jhalokati", nameBn: "ঝালকাঠি", division: "Barishal", x: 46, y: 73 },

  // Rangpur Division
  { id: "rangpur", nameEn: "Rangpur", nameBn: "রংপুর", division: "Rangpur", x: 30, y: 22 },
  { id: "dinajpur", nameEn: "Dinajpur", nameBn: "দিনাজপুর", division: "Rangpur", x: 23, y: 23 },
  { id: "gaibandha", nameEn: "Gaibandha", nameBn: "গাইবান্ধা", division: "Rangpur", x: 38, y: 28 },
  { id: "kurigram", nameEn: "Kurigram", nameBn: "কুড়িগ্রাম", division: "Rangpur", x: 40, y: 20 },
  { id: "lalmonirhat", nameEn: "Lalmonirhat", nameBn: "লালমনিরহাট", division: "Rangpur", x: 36, y: 16 },
  { id: "nilphamari", nameEn: "Nilphamari", nameBn: "নীলফামারী", division: "Rangpur", x: 25, y: 17 },
  { id: "panchagarh", nameEn: "Panchagarh", nameBn: "পঞ্চগড়", division: "Rangpur", x: 17, y: 10 },
  { id: "thakurgaon", nameEn: "Thakurgaon", nameBn: "ঠাকুরগাঁও", division: "Rangpur", x: 18, y: 18 },

  // Mymensingh Division
  { id: "mymensingh", nameEn: "Mymensingh", nameBn: "ময়মনসিংহ", division: "Mymensingh", x: 50, y: 37 },
  { id: "jamalpur", nameEn: "Jamalpur", nameBn: "জামালপুর", division: "Mymensingh", x: 41, y: 34 },
  { id: "netrokona", nameEn: "Netrokona", nameBn: "নেত্রকোণা", division: "Mymensingh", x: 59, y: 34 },
  { id: "sherpur", nameEn: "Sherpur", nameBn: "শেরপুর", division: "Mymensingh", x: 46, y: 30 },
];

export interface WorldCountry {
  code: string;
  nameEn: string;
  nameBn: string;
  x: number; // Percentage 0 - 100 on world projection
  y: number; // Percentage 0 - 100 on world projection
}

export const WORLD_COUNTRIES: WorldCountry[] = [
  { code: "BD", nameEn: "Bangladesh", nameBn: "বাংলাদেশ", x: 71, y: 50 },
  { code: "US", nameEn: "United States", nameBn: "যুক্তরাষ্ট্র", x: 22, y: 38 },
  { code: "GB", nameEn: "United Kingdom", nameBn: "যুক্তরাজ্য", x: 48, y: 30 },
  { code: "CA", nameEn: "Canada", nameBn: "কানাডা", x: 23, y: 26 },
  { code: "DE", nameEn: "Germany", nameBn: "জার্মানি", x: 52, y: 32 },
  { code: "AU", nameEn: "Australia", nameBn: "অস্ট্রেলিয়া", x: 86, y: 76 },
  { code: "SG", nameEn: "Singapore", nameBn: "সিঙ্গাপুর", x: 74, y: 58 },
  { code: "AE", nameEn: "United Arab Emirates", nameBn: "সংযুক্ত আরব আমিরাত", x: 61, y: 47 },
  { code: "SA", nameEn: "Saudi Arabia", nameBn: "সৌদি আরব", x: 58, y: 48 },
  { code: "IN", nameEn: "India", nameBn: "ভারত", x: 69, y: 49 },
  { code: "MY", nameEn: "Malaysia", nameBn: "মালয়েশিয়া", x: 74, y: 56 },
  { code: "NL", nameEn: "Netherlands", nameBn: "নেদারল্যান্ডস", x: 50, y: 31 },
  { code: "SE", nameEn: "Sweden", nameBn: "সুইডেন", x: 53, y: 22 },
  { code: "CH", nameEn: "Switzerland", nameBn: "সুইজারল্যান্ড", x: 51, y: 34 },
  { code: "FR", nameEn: "France", nameBn: "ফ্রান্স", x: 49, y: 34 },
  { code: "JP", nameEn: "Japan", nameBn: "জাপান", x: 84, y: 42 },
  { code: "KR", nameEn: "South Korea", nameBn: "দক্ষিণ কোরিয়া", x: 81, y: 42 },
  { code: "IE", nameEn: "Ireland", nameBn: "আয়ারল্যান্ড", x: 46, y: 30 },
  { code: "NZ", nameEn: "New Zealand", nameBn: "নিউজিল্যান্ড", x: 94, y: 84 },
  { code: "BR", nameEn: "Brazil", nameBn: "ব্রাজিল", x: 36, y: 68 },
  { code: "TR", nameEn: "Turkey", nameBn: "তুরস্ক", x: 56, y: 38 },
  { code: "QA", nameEn: "Qatar", nameBn: "কাতার", x: 60, y: 47 },
  { code: "KW", nameEn: "Kuwait", nameBn: "কুয়েত", x: 59, y: 45 },
  { code: "TH", nameEn: "Thailand", nameBn: "থাইল্যান্ড", x: 73, y: 52 },
  { code: "VN", nameEn: "Vietnam", nameBn: "ভিয়েতনাম", x: 75, y: 52 },
  { code: "ID", nameEn: "Indonesia", nameBn: "ইন্দোনেশিয়া", x: 78, y: 64 },
  { code: "NO", nameEn: "Norway", nameBn: "নরওয়ে", x: 51, y: 20 },
  { code: "DK", nameEn: "Denmark", nameBn: "ডেনমার্ক", x: 51, y: 28 },
  { code: "FI", nameEn: "Finland", nameBn: "ফিনল্যান্ড", x: 56, y: 20 },
  { code: "ES", nameEn: "Spain", nameBn: "স্পেন", x: 47, y: 38 },
  { code: "IT", nameEn: "Italy", nameBn: "ইতালি", x: 52, y: 36 },
  { code: "PL", nameEn: "Poland", nameBn: "পোল্যান্ড", x: 54, y: 30 },
  { code: "ZA", nameEn: "South Africa", nameBn: "দক্ষিণ আফ্রিকা", x: 55, y: 78 },
];

export const PROFESSION_PRESETS = {
  programmer: {
    label: "Programmer or Coder",
    tools: ["TypeScript", "React", "Next.js", "Node.js", "Python", "Docker", "Tailwind CSS", "PostgreSQL"],
    metricSuggestions: [
      { label: "Projects Shipped", defaultValue: "18+" },
      { label: "Lines of Code", defaultValue: "250K" },
      { label: "Production Apps", defaultValue: "6" },
    ],
  },
  marketer: {
    label: "Marketer or Growth Lead",
    tools: ["Meta Ads", "Google Ads", "HubSpot", "SEO / Ahrefs", "Google Analytics", "Canva", "Mailchimp", "Figma"],
    metricSuggestions: [
      { label: "Ad Spend Managed", defaultValue: "$120K+" },
      { label: "Campaigns Run", defaultValue: "45+" },
      { label: "Audience Reached", defaultValue: "2.4M" },
    ],
  },
  freelancer: {
    label: "Freelancer or Consultant",
    tools: ["Upwork", "Figma", "Webflow", "WordPress", "Stripe", "Notion", "Slack", "Zoom"],
    metricSuggestions: [
      { label: "Happy Clients", defaultValue: "35+" },
      { label: "Five Star Ratings", defaultValue: "100%" },
      { label: "Countries Served", defaultValue: "12" },
    ],
  },
  hr: {
    label: "HR or Corporate Professional",
    tools: ["BambooHR", "LinkedIn Recruiter", "Notion", "Workday", "Asana", "Jira", "Google Workspace", "Loom"],
    metricSuggestions: [
      { label: "Talents Hired", defaultValue: "80+" },
      { label: "Teams Scaled", defaultValue: "4" },
      { label: "Retention Rate", defaultValue: "94%" },
    ],
  },
  student: {
    label: "Student or Early Learner",
    tools: ["JavaScript", "HTML / CSS", "Git / GitHub", "VS Code", "Python", "React", "Figma", "C++"],
    metricSuggestions: [
      { label: "Milestones Done", defaultValue: "12" },
      { label: "Problems Solved", defaultValue: "150+" },
      { label: "Learning Hours", defaultValue: "400+" },
    ],
  },
  other: {
    label: "Other Professional",
    tools: ["Notion", "Figma", "Excel / Sheets", "Slack", "Canva", "Trello", "Zapier", "Zoom"],
    metricSuggestions: [
      { label: "Projects Completed", defaultValue: "20+" },
      { label: "Years Experience", defaultValue: "3+" },
      { label: "Collaborators", defaultValue: "15+" },
    ],
  },
};
