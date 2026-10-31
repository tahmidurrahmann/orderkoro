/**
 * All 64 Administrative Districts (Zilas) of Bangladesh
 * Includes English name, Bangla name, Division, and search aliases (old spellings).
 */

export interface DistrictInfo {
  id: string; // Canonical English name used as key in districtZoneMap
  en: string;
  bn: string;
  division: string;
  aliases?: string[];
}

export const BANGLADESH_DISTRICTS: readonly DistrictInfo[] = [
  // Dhaka Division (13)
  { id: "Dhaka", en: "Dhaka", bn: "ঢাকা", division: "Dhaka", aliases: ["dacca", "savar", "keraniganj", "tongi"] },
  { id: "Gazipur", en: "Gazipur", bn: "গাজীপুর", division: "Dhaka" },
  { id: "Narayanganj", en: "Narayanganj", bn: "নারায়ণগঞ্জ", division: "Dhaka" },
  { id: "Narsingdi", en: "Narsingdi", bn: "নরসিংদী", division: "Dhaka" },
  { id: "Manikganj", en: "Manikganj", bn: "মানিকগঞ্জ", division: "Dhaka" },
  { id: "Munshiganj", en: "Munshiganj", bn: "মুন্সীগঞ্জ", division: "Dhaka" },
  { id: "Tangail", en: "Tangail", bn: "টাঙ্গাইল", division: "Dhaka" },
  { id: "Kishoreganj", en: "Kishoreganj", bn: "কিশোরগঞ্জ", division: "Dhaka" },
  { id: "Faridpur", en: "Faridpur", bn: "ফরিদপুর", division: "Dhaka" },
  { id: "Gopalganj", en: "Gopalganj", bn: "গোপালগঞ্জ", division: "Dhaka" },
  { id: "Madaripur", en: "Madaripur", bn: "মাদারীপুর", division: "Dhaka" },
  { id: "Rajbari", en: "Rajbari", bn: "রাজবাড়ী", division: "Dhaka" },
  { id: "Shariatpur", en: "Shariatpur", bn: "শরীয়তপুর", division: "Dhaka" },

  // Chattogram Division (11)
  { id: "Chattogram", en: "Chattogram", bn: "চট্টগ্রাম", division: "Chattogram", aliases: ["chittagong", "ctg"] },
  { id: "Cox's Bazar", en: "Cox's Bazar", bn: "কক্সবাজার", division: "Chattogram", aliases: ["coxsbazar", "coxs bazar"] },
  { id: "Cumilla", en: "Cumilla", bn: "কুমিল্লা", division: "Chattogram", aliases: ["comilla"] },
  { id: "Brahmanbaria", en: "Brahmanbaria", bn: "ব্রাহ্মণবাড়িয়া", division: "Chattogram", aliases: ["bbaria"] },
  { id: "Chandpur", en: "Chandpur", bn: "চাঁদপুর", division: "Chattogram" },
  { id: "Feni", en: "Feni", bn: "ফেনী", division: "Chattogram" },
  { id: "Lakshmipur", en: "Lakshmipur", bn: "লক্ষ্মীপুর", division: "Chattogram", aliases: ["laxmipur"] },
  { id: "Noakhali", en: "Noakhali", bn: "নোয়াখালী", division: "Chattogram" },
  { id: "Bandarban", en: "Bandarban", bn: "বান্দরবান", division: "Chattogram" },
  { id: "Khagrachhari", en: "Khagrachhari", bn: "খাগড়াছড়ি", division: "Chattogram", aliases: ["khagrachari"] },
  { id: "Rangamati", en: "Rangamati", bn: "রাঙ্গামাটি", division: "Chattogram" },

  // Rajshahi Division (8)
  { id: "Rajshahi", en: "Rajshahi", bn: "রাজশাহী", division: "Rajshahi" },
  { id: "Bogura", en: "Bogura", bn: "বগুড়া", division: "Rajshahi", aliases: ["bogra"] },
  { id: "Chapainawabganj", en: "Chapainawabganj", bn: "চাঁপাইনবাবগঞ্জ", division: "Rajshahi", aliases: ["nawabganj"] },
  { id: "Joypurhat", en: "Joypurhat", bn: "জয়পুরহাট", division: "Rajshahi" },
  { id: "Naogaon", en: "Naogaon", bn: "নওগাঁ", division: "Rajshahi" },
  { id: "Natore", en: "Natore", bn: "নাটোর", division: "Rajshahi" },
  { id: "Pabna", en: "Pabna", bn: "পাবনা", division: "Rajshahi" },
  { id: "Sirajganj", en: "Sirajganj", bn: "সিরাজগঞ্জ", division: "Rajshahi" },

  // Khulna Division (10)
  { id: "Khulna", en: "Khulna", bn: "খুলনা", division: "Khulna" },
  { id: "Jashore", en: "Jashore", bn: "যশোর", division: "Khulna", aliases: ["jessore"] },
  { id: "Kushtia", en: "Kushtia", bn: "কুষ্টিয়া", division: "Khulna" },
  { id: "Satkhira", en: "Satkhira", bn: "সাতক্ষীরা", division: "Khulna" },
  { id: "Bagerhat", en: "Bagerhat", bn: "বাগেরহাট", division: "Khulna" },
  { id: "Chuadanga", en: "Chuadanga", bn: "চুয়াডাঙ্গা", division: "Khulna" },
  { id: "Jhenaidah", en: "Jhenaidah", bn: "ঝিনাইদহ", division: "Khulna" },
  { id: "Magura", en: "Magura", bn: "মাগুরা", division: "Khulna" },
  { id: "Meherpur", en: "Meherpur", bn: "মেহেরপুর", division: "Khulna" },
  { id: "Narail", en: "Narail", bn: "নড়াইল", division: "Khulna" },

  // Sylhet Division (4)
  { id: "Sylhet", en: "Sylhet", bn: "সিলেট", division: "Sylhet" },
  { id: "Moulvibazar", en: "Moulvibazar", bn: "মৌলভীবাজার", division: "Sylhet", aliases: ["maulvibazar"] },
  { id: "Habiganj", en: "Habiganj", bn: "হবিগঞ্জ", division: "Sylhet" },
  { id: "Sunamganj", en: "Sunamganj", bn: "সুনামগঞ্জ", division: "Sylhet" },

  // Barishal Division (6)
  { id: "Barishal", en: "Barishal", bn: "বরিশাল", division: "Barishal", aliases: ["barisal"] },
  { id: "Bhola", en: "Bhola", bn: "ভোলা", division: "Barishal" },
  { id: "Barguna", en: "Barguna", bn: "বরগুনা", division: "Barishal" },
  { id: "Jhalokati", en: "Jhalokati", bn: "ঝালকাঠি", division: "Barishal", aliases: ["jhalokathi"] },
  { id: "Patuakhali", en: "Patuakhali", bn: "পটুয়াখালী", division: "Barishal" },
  { id: "Pirojpur", en: "Pirojpur", bn: "পিরোজপুর", division: "Barishal" },

  // Rangpur Division (8)
  { id: "Rangpur", en: "Rangpur", bn: "রংপুর", division: "Rangpur" },
  { id: "Dinajpur", en: "Dinajpur", bn: "দিনাজপুর", division: "Rangpur" },
  { id: "Gaibandha", en: "Gaibandha", bn: "গাইবান্ধা", division: "Rangpur" },
  { id: "Kurigram", en: "Kurigram", bn: "কুড়িগ্রাম", division: "Rangpur" },
  { id: "Lalmonirhat", en: "Lalmonirhat", bn: "লালমনিরহাট", division: "Rangpur" },
  { id: "Nilphamari", en: "Nilphamari", bn: "নীলফামারী", division: "Rangpur" },
  { id: "Panchagarh", en: "Panchagarh", bn: "পঞ্চগড়", division: "Rangpur" },
  { id: "Thakurgaon", en: "Thakurgaon", bn: "ঠাকুরগাঁও", division: "Rangpur" },

  // Mymensingh Division (4)
  { id: "Mymensingh", en: "Mymensingh", bn: "ময়মনসিংহ", division: "Mymensingh" },
  { id: "Jamalpur", en: "Jamalpur", bn: "জামালপুর", division: "Mymensingh" },
  { id: "Netrokona", en: "Netrokona", bn: "নেত্রকোণা", division: "Mymensingh", aliases: ["netrakona"] },
  { id: "Sherpur", en: "Sherpur", bn: "শেরপুর", division: "Mymensingh" },
] as const;

export const DISTRICT_IDS = new Set(BANGLADESH_DISTRICTS.map((d) => d.id));

export function findDistrictById(id: string): DistrictInfo | undefined {
  return BANGLADESH_DISTRICTS.find((d) => d.id === id);
}

export function filterDistricts(query: string): DistrictInfo[] {
  const q = query.trim().toLowerCase();
  if (!q) {
    return [...BANGLADESH_DISTRICTS];
  }
  return BANGLADESH_DISTRICTS.filter(
    (d) =>
      d.en.toLowerCase().includes(q) ||
      d.bn.includes(q) ||
      d.division.toLowerCase().includes(q) ||
      (d.aliases && d.aliases.some((a) => a.toLowerCase().includes(q)))
  );
}
