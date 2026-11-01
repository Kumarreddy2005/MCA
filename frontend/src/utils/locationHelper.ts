/**
 * Location Helper & Resolution Utilities for VCGIS Citizen Grievance Flow.
 *
 * Implements strict precedence rules:
 * 1. Explicit location entered or selected by citizen.
 * 2. Location extracted from complaint text when no explicit location is supplied.
 * 3. Reliable location-resolution result (e.g. mapping Bangalore/Bengaluru -> Bengaluru Urban).
 * 4. If location cannot be established, leaves it unresolved for citizen clarification.
 *
 * Prevents silent fallback to arbitrary defaults (such as Mysuru).
 */

// Authoritative 31 Districts of Karnataka
export const KARNATAKA_DISTRICTS: string[] = [
  "Bagalkote",
  "Ballari",
  "Belagavi",
  "Bengaluru Rural",
  "Bengaluru Urban",
  "Bidar",
  "Chamarajanagar",
  "Chikkaballapura",
  "Chikkamagaluru",
  "Chitradurga",
  "Dakshina Kannada",
  "Davanagere",
  "Dharwad",
  "Gadag",
  "Hassan",
  "Haveri",
  "Kalaburagi",
  "Kodagu",
  "Kolar",
  "Koppal",
  "Mandya",
  "Mysuru",
  "Raichur",
  "Ramanagara",
  "Shivamogga",
  "Tumakuru",
  "Udupi",
  "Uttara Kannada",
  "Vijayanagara",
  "Vijayapura",
  "Yadgir",
];

// District Aliases & Common Spellings -> Canonical Karnataka District
export const DISTRICT_ALIASES: Record<string, string> = {
  bangalore: "Bengaluru Urban",
  "bangalore urban": "Bengaluru Urban",
  "bangalore city": "Bengaluru Urban",
  "bangalore rural": "Bengaluru Rural",
  bengaluru: "Bengaluru Urban",
  "bengaluru urban": "Bengaluru Urban",
  "bengaluru city": "Bengaluru Urban",
  "bengaluru rural": "Bengaluru Rural",
  mysore: "Mysuru",
  mysuru: "Mysuru",
  belgaum: "Belagavi",
  belagavi: "Belagavi",
  gulbarga: "Kalaburagi",
  kalaburagi: "Kalaburagi",
  hubli: "Dharwad",
  hubballi: "Dharwad",
  dharwad: "Dharwad",
  mangalore: "Dakshina Kannada",
  mangaluru: "Dakshina Kannada",
  "dakshina kannada": "Dakshina Kannada",
  "south canara": "Dakshina Kannada",
  bellary: "Ballari",
  ballari: "Ballari",
  bijapur: "Vijayapura",
  vijayapura: "Vijayapura",
  shimoga: "Shivamogga",
  shivamogga: "Shivamogga",
  chikmagalur: "Chikkamagaluru",
  chikkamagaluru: "Chikkamagaluru",
  chickballapur: "Chikkaballapura",
  chikkaballapur: "Chikkaballapura",
  chikkaballapura: "Chikkaballapura",
  bagalkot: "Bagalkote",
  bagalkote: "Bagalkote",
  tumkur: "Tumakuru",
  tumakuru: "Tumakuru",
  coorg: "Kodagu",
  kodagu: "Kodagu",
  "uttara kannada": "Uttara Kannada",
  "north canara": "Uttara Kannada",
  karwar: "Uttara Kannada",
  hospet: "Vijayanagara",
  vijayanagara: "Vijayanagara",
  yadgir: "Yadgir",
  raichur: "Raichur",
  bidar: "Bidar",
  kolar: "Kolar",
  koppal: "Koppal",
  mandya: "Mandya",
  hassan: "Hassan",
  haveri: "Haveri",
  gadag: "Gadag",
  davanagere: "Davanagere",
  chitradurga: "Chitradurga",
  chamarajanagar: "Chamarajanagar",
  ramanagara: "Ramanagara",
  udupi: "Udupi",
};

// Common Localities in Major Karnataka Urban & Rural Centers for reliable district mapping
const LOCALITY_TO_DISTRICT: Record<string, string> = {
  // Bengaluru Localities
  "kr puram": "Bengaluru Urban",
  "k.r. puram": "Bengaluru Urban",
  "k r puram": "Bengaluru Urban",
  krishnarajapuram: "Bengaluru Urban",
  "tc palya": "Bengaluru Urban",
  "t.c. palya": "Bengaluru Urban",
  "tc palya main road": "Bengaluru Urban",
  "tc palya road": "Bengaluru Urban",
  whitefield: "Bengaluru Urban",
  indiranagar: "Bengaluru Urban",
  koramangala: "Bengaluru Urban",
  jayanagar: "Bengaluru Urban",
  "electronic city": "Bengaluru Urban",
  marathahalli: "Bengaluru Urban",
  hebbal: "Bengaluru Urban",
  yelahanka: "Bengaluru Urban",
  banashankari: "Bengaluru Urban",
  malleshwaram: "Bengaluru Urban",
  rajajinagar: "Bengaluru Urban",
  "hsr layout": "Bengaluru Urban",
  "btm layout": "Bengaluru Urban",
  kammanahalli: "Bengaluru Urban",
  bellandur: "Bengaluru Urban",
  bidrahalli: "Bengaluru Urban",
  sarjapur: "Bengaluru Urban",
  mahadevapura: "Bengaluru Urban",
  bommanahalli: "Bengaluru Urban",
  yeshwanthpur: "Bengaluru Urban",
  peenya: "Bengaluru Urban",
  vijayanagar: "Bengaluru Urban",
  basavanagudi: "Bengaluru Urban",
  shantinagar: "Bengaluru Urban",
  shivajinagar: "Bengaluru Urban",
  madiwala: "Bengaluru Urban",
  nagawara: "Bengaluru Urban",
  kengeri: "Bengaluru Urban",

  // Bengaluru Rural Localities
  devanahalli: "Bengaluru Rural",
  doddaballapura: "Bengaluru Rural",
  nelamangala: "Bengaluru Rural",
  hoskote: "Bengaluru Rural",

  // Mysuru Localities
  jayalakshmipuram: "Mysuru",
  kuvempunagar: "Mysuru",
  saraswathipuram: "Mysuru",
  gokulam: "Mysuru",
  vijayanagar_mysuru: "Mysuru",
  hebbal_mysuru: "Mysuru",
  rampura: "Mysuru",
  nanjangud: "Mysuru",
  hunsur: "Mysuru",
  t_narasipura: "Mysuru",

  // Belagavi Localities
  tilakwadi: "Belagavi",
  vadgaon: "Belagavi",
  shahapur: "Belagavi",
  gokak: "Belagavi",
  bailhongal: "Belagavi",

  // Dharwad / Hubli Localities
  vidyanagar_hubli: "Dharwad",
  keshwapur: "Dharwad",
  navanagar: "Dharwad",
};

// Generic words that should NOT be treated as specific locations
const GENERIC_LOCATION_TERMS = new Set([
  "our village",
  "my village",
  "the village",
  "this village",
  "our area",
  "my area",
  "the area",
  "this area",
  "our locality",
  "my locality",
  "our street",
  "my street",
  "the street",
  "this street",
  "our town",
  "my town",
  "this town",
  "the road",
  "our road",
  "my road",
  "this place",
  "our place",
  "here",
  "there",
  "village",
  "area",
  "locality",
  "town",
  "city",
  "street",
  "road",
  "somewhere",
]);

export interface ExtractedLocationResult {
  reportedLocation: string | null;
  locality: string | null;
  landmark: string | null;
  district: string | null;
  isReliableDistrict: boolean;
  rawMatchedSnippet: string | null;
}

/**
 * Resolves a district string or text mention to an authoritative Karnataka district.
 * Returns null if not reliably resolved. Never defaults to an arbitrary district.
 */
export function resolveKarnatakaDistrict(text: string): string | null {
  if (!text) return null;
  const cleaned = text.trim().toLowerCase();

  // 1. Direct match with alias dictionary
  if (DISTRICT_ALIASES[cleaned]) {
    return DISTRICT_ALIASES[cleaned];
  }

  // 2. Direct match with canonical districts
  for (const d of KARNATAKA_DISTRICTS) {
    if (d.toLowerCase() === cleaned) {
      return d;
    }
  }

  // 3. Substring match for known district names within text
  for (const [alias, canonical] of Object.entries(DISTRICT_ALIASES)) {
    const regex = new RegExp(`\\b${alias.replace(/\s+/g, "\\s+")}\\b`, "i");
    if (regex.test(text)) {
      return canonical;
    }
  }

  // 4. Locality-to-district lookup
  for (const [locality, district] of Object.entries(LOCALITY_TO_DISTRICT)) {
    const regex = new RegExp(`\\b${locality.replace(/\s+/g, "\\s+")}\\b`, "i");
    if (regex.test(text)) {
      return district;
    }
  }

  return null;
}

/**
 * Extracts reported location, locality, landmark, and district from complaint text.
 * Returns null for location fields if no specific location was mentioned.
 */
export function extractLocationFromText(text: string): ExtractedLocationResult {
  if (!text || text.trim().length === 0) {
    return {
      reportedLocation: null,
      locality: null,
      landmark: null,
      district: null,
      isReliableDistrict: false,
      rawMatchedSnippet: null,
    };
  }

  const cleanText = text.trim();
  let candidateLocation: string | null = null;
  let candidateLandmark: string | null = null;

  // 1. Look for preposition followed by locality and optional city:
  // e.g. "in KR Puram, Bangalore", "near TC Palya Main Road", "at Bidrahalli", "near KR Puram, Bengaluru"
  const prepRegex = /\b(?:in|at|near|around|from|opposite to|in front of)\s+([A-Z0-9][A-Za-z0-9/.'-]*(?:\s+[A-Z0-9][A-Za-z0-9/.'-]*){0,3}(?:\s*,\s*[A-Za-z0-9/.'-]+)?)/i;
  const prepMatch = cleanText.match(prepRegex);
  if (prepMatch && prepMatch[1]) {
    let cand = prepMatch[1].trim().replace(/[.,;:]+$/, "");
    cand = cand.replace(/\s+(?:since|due|because|for|where|having|and|with).*$/i, "").trim();
    if (/^front of\s+/i.test(cand)) {
      cand = cand.replace(/^front of\s+/i, "").trim();
    }

    if (!GENERIC_LOCATION_TERMS.has(cand.toLowerCase()) && cand.length >= 3) {
      candidateLocation = cand;
      if (/near|around/i.test(prepMatch[0])) {
        candidateLandmark = cand;
      }
    }
  }

  // 2. Standalone Locality, City pattern (without preposition):
  // e.g. "KR Puram, Bangalore", "Whitefield, Bengaluru"
  if (!candidateLocation) {
    const cityRegex = /\b([A-Z0-9][A-Za-z0-9/.'-]*(?:\s+[A-Z0-9][A-Za-z0-9/.'-]*){0,2}\s*,\s*(?:Bangalore|Bengaluru|Mysore|Mysuru|Belgaum|Belagavi|Dharwad|Hubli|Kalaburagi|Gulbarga|Mangalore|Mangaluru))\b/i;
    const cityMatch = cleanText.match(cityRegex);
    if (cityMatch && cityMatch[1]) {
      candidateLocation = cityMatch[1].trim();
    }
  }

  // 3. Standalone road or landmark pattern:
  // e.g. "TC Palya Main Road", "Old Madras Road"
  if (!candidateLocation) {
    const roadRegex = /\b([A-Z0-9][A-Za-z0-9/.'-]*(?:\s+[A-Z0-9][A-Za-z0-9/.'-]*){0,3}\s+(?:Main Road|Cross Road|Ring Road|Road|Street|Circle|Cross|Layout|Nagar|Puram|Palya|Halli))\b/i;
    const roadMatch = cleanText.match(roadRegex);
    if (roadMatch && roadMatch[1]) {
      const cand = roadMatch[1].trim();
      if (!GENERIC_LOCATION_TERMS.has(cand.toLowerCase())) {
        candidateLocation = cand;
        candidateLandmark = cand;
      }
    }
  }

  // Validate generic words
  if (candidateLocation && GENERIC_LOCATION_TERMS.has(candidateLocation.toLowerCase())) {
    candidateLocation = null;
  }

  // Resolve District from the matched location snippet or full text
  const textDistrict = resolveKarnatakaDistrict(cleanText);

  // Derive final reported location
  let reportedLocation = candidateLocation;
  if (!reportedLocation && textDistrict) {
    // Only district was mentioned, e.g. "in Bengaluru"
    const distMatch = cleanText.match(new RegExp(`\\b(?:in|at|near)\\s+(${textDistrict}|Bangalore|Bengaluru|Mysore|Mysuru)\\b`, "i"));
    if (distMatch && distMatch[1]) {
      reportedLocation = distMatch[1];
    }
  }

  return {
    reportedLocation: reportedLocation ? reportedLocation.trim() : null,
    locality: candidateLocation ? candidateLocation.trim() : null,
    landmark: candidateLandmark ? candidateLandmark.trim() : null,
    district: textDistrict,
    isReliableDistrict: Boolean(textDistrict),
    rawMatchedSnippet: candidateLocation,
  };
}

/**
 * Detects if the citizen-entered location conflicts with the location extracted from complaint text.
 * E.g. Entered: "Rampura, Mysuru", Mentioned in text: "KR Puram, Bangalore".
 */
export function detectLocationConflict(
  enteredLocation: string,
  textLocation: string | null
): {
  hasConflict: boolean;
  enteredLocation: string;
  textLocation: string | null;
} {
  if (!enteredLocation || !textLocation) {
    return { hasConflict: false, enteredLocation, textLocation };
  }

  const normEntered = enteredLocation.trim().toLowerCase();
  const normText = textLocation.trim().toLowerCase();

  if (!normEntered || !normText) {
    return { hasConflict: false, enteredLocation, textLocation };
  }

  // If one contains the other, they are compatible, not conflicting
  if (normEntered.includes(normText) || normText.includes(normEntered)) {
    return { hasConflict: false, enteredLocation, textLocation };
  }

  // Check if both mention different districts
  const enteredDist = resolveKarnatakaDistrict(normEntered);
  const textDist = resolveKarnatakaDistrict(normText);

  if (enteredDist && textDist && enteredDist !== textDist) {
    return { hasConflict: true, enteredLocation, textLocation };
  }

  // If both are non-trivial (> 3 chars) and do not share key tokens
  const enteredTokens = normEntered.split(/[\s,.-]+/).filter((t) => t.length > 2);
  const textTokens = normText.split(/[\s,.-]+/).filter((t) => t.length > 2);
  const sharesToken = enteredTokens.some((t) => textTokens.includes(t));

  if (!sharesToken && enteredTokens.length > 0 && textTokens.length > 0) {
    return { hasConflict: true, enteredLocation, textLocation };
  }

  return { hasConflict: false, enteredLocation, textLocation };
}

/**
 * Derives a clean, concise problem title without repetitive text,
 * speech stuttering, or boilerplate meta-sentences ("Citizen filed a grievance regarding...").
 */
export function deriveCleanProblemTitle(
  description: string,
  department?: string,
  category?: string
): string {
  if (!description || description.trim().length === 0) {
    return category || (department ? `${department} Issue` : "Public Grievance");
  }

  let text = description.trim();

  // Strip any existing nested "Citizen filed a grievance regarding '...'" prefix
  const metaMatch = text.match(/Citizen filed a grievance regarding ['"]?([^'"]+)['"]?\s+under/i);
  if (metaMatch && metaMatch[1]) {
    text = metaMatch[1].trim();
  }

  // Clean consecutive duplicate phrases from speech recognition stutters
  // E.g. "water problem is a water problem is there" -> "water problem is there"
  text = text.replace(/\b(\w+(?:\s+\w+){1,4})\s+\1\b/gi, "$1");

  // Extract first clean sentence or up to 80 chars
  const firstSentenceMatch = text.match(/^([^.!?\n]+)/);
  let cleanSentence = (firstSentenceMatch && firstSentenceMatch[1]) ? firstSentenceMatch[1].trim() : text.slice(0, 80).trim();

  // Capitalize first character
  if (cleanSentence.length > 0) {
    cleanSentence = cleanSentence.charAt(0).toUpperCase() + cleanSentence.slice(1);
  }

  // If sentence is concise and informative (< 90 chars), use it directly
  if (cleanSentence.length >= 8 && cleanSentence.length <= 90) {
    return cleanSentence;
  }

  // Fallback: concise descriptive title with location if present
  const loc = extractLocationFromText(text);
  const issueName = category || (department ? `${department} Issue` : "Public Grievance");

  if (loc.reportedLocation) {
    return `${issueName} at ${loc.reportedLocation}`;
  }

  return cleanSentence.slice(0, 80) || issueName;
}
