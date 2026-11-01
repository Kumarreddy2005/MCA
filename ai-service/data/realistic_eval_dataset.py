"""Realistic Benchmark Evaluation Suite for VCGIS AI Models.
Contains realistic, anonymized complaints with regional variations, misspellings,
colloquial phrasing, Kannada transliterations, multi-issue ambiguities, and out-of-scope queries.
NEVER uses synthetic templates.
"""

REALISTIC_EVALUATION_DATASET = [
    # --- WATER DEPARTMENT CASES ---
    {
        "id": "REAL-W-01",
        "title": "water problem in kr puram",
        "text": "There is a severe water problem in KR Puram bangalore. Pipe line broke 3 days back and clean drinking water is wasting on street while our taps are totally dry.",
        "expected_department": "WATER",
        "expected_priority_min": "MEDIUM",
        "expected_district": "Bengaluru Urban",
        "category": "Water Supply & Distribution",
        "notes": "Regression case: KR Puram, Bangalore must not resolve to Mysuru"
    },
    {
        "id": "REAL-W-02",
        "title": "nange drinking water supply illa",
        "text": "nange drinking water supply illa for 4 days in rampura village. borewell pump motor coil burnt out. people walking 2 km to get drinking water.",
        "expected_department": "WATER",
        "expected_priority_min": "HIGH",
        "expected_district": None,
        "category": "Borewell & Motor Breakdown",
        "notes": "Kannada transliteration (nange drinking water supply illa)"
    },
    {
        "id": "REAL-W-03",
        "title": "dirty muddy water from gram panchayat tap",
        "text": "Drinking water coming from public tap is yellowish black with terrible smell. Children falling sick with stomach pain. Sewage line mixed with drinking pipe.",
        "expected_department": "WATER",
        "expected_priority_min": "CRITICAL",
        "expected_district": None,
        "category": "Water Contamination & Health Hazard",
        "notes": "Health hazard contamination"
    },
    {
        "id": "REAL-W-04",
        "title": "watar tank leakage",
        "text": "Overhed sintex water tank near anganwadi center is leaking heavily from bottom valve. watar is overflowing on road whole day.",
        "expected_department": "WATER",
        "expected_priority_min": "LOW",
        "expected_district": None,
        "category": "Water Tank Leakage",
        "notes": "Misspelling: 'watar', 'overhed'"
    },

    # --- ROAD DEPARTMENT CASES ---
    {
        "id": "REAL-R-01",
        "title": "huge pot hole near tc palya road",
        "text": "Massive pothole crater on TC Palya main road near Anandapura circle. Two bike riders slipped and got injured yesterday evening.",
        "expected_department": "ROAD",
        "expected_priority_min": "HIGH",
        "expected_district": "Bengaluru Urban",
        "category": "Road Damage & Potholes",
        "notes": "Accident hazard on main road"
    },
    {
        "id": "REAL-R-02",
        "title": "road blocked due to drainage soil",
        "text": "PWD contractor dug trench for underground culvert 2 weeks ago and left mud heap blocking half the village link road. Bus service stopped.",
        "expected_department": "ROAD",
        "expected_priority_min": "HIGH",
        "expected_district": None,
        "category": "Road Obstruction & Debris",
        "notes": "Contractor trench block"
    },
    {
        "id": "REAL-R-03",
        "title": "rasta kharab aagide near bellary bypass",
        "text": "bellary bypass road totally damaged full of loose gravel and stones. heavy dust and vehicle tyre punctures happening every day.",
        "expected_department": "ROAD",
        "expected_priority_min": "MEDIUM",
        "expected_district": "Ballari",
        "category": "Road Surface Damage",
        "notes": "Kannada phrase 'rasta kharab aagide' + district Bellary alias"
    },
    {
        "id": "REAL-R-04",
        "title": "speed braker required near school",
        "text": "Vehicles speeding near government high school. Need speed braker or rumble strips immediately before any accident occurs.",
        "expected_department": "ROAD",
        "expected_priority_min": "MEDIUM",
        "expected_district": None,
        "category": "Road Safety & Signage",
        "notes": "Misspelling 'braker'"
    },

    # --- ELECTRICITY DEPARTMENT CASES ---
    {
        "id": "REAL-E-01",
        "title": "11kv wire snapped and hanging low",
        "text": "Live 11kv electric wire snapped during heavy wind and hanging at 5 feet height near paddy field. Sparks flying when touching tree branch. Cattle and farmers walking nearby.",
        "expected_department": "ELECTRICITY",
        "expected_priority_min": "CRITICAL",
        "expected_district": None,
        "category": "Live Wire Hazard",
        "notes": "Extreme hazard requiring immediate dispatch"
    },
    {
        "id": "REAL-E-02",
        "title": "street light not working since 10 days",
        "text": "Pole no 14 and 15 streetlights not glowing on 3rd cross. Very dark at night and snakes coming from vacant plot.",
        "expected_department": "ELECTRICITY",
        "expected_priority_min": "LOW",
        "expected_district": None,
        "category": "Power Outage & Street Lighting",
        "notes": "Low priority standard lighting issue"
    },
    {
        "id": "REAL-E-03",
        "title": "bescom transformer blast sound",
        "text": "Huge blast sound from neighborhood transformer yesterday night. Full ward in dark. Current illa since 14 hours. Fridge and appliances damaged due to voltage spike.",
        "expected_department": "ELECTRICITY",
        "expected_priority_min": "HIGH",
        "expected_district": None,
        "category": "Transformer Failure",
        "notes": "Mixed English + Kannada 'Current illa'"
    },
    {
        "id": "REAL-E-04",
        "title": "electric pole tilted over house roof",
        "text": "Cement electric pole got tilted after tractor hit it in dharwad taluk. Wire tension is pulling on residential roof tin sheet.",
        "expected_department": "ELECTRICITY",
        "expected_priority_min": "HIGH",
        "expected_district": "Dharwad",
        "category": "Damaged Pole",
        "notes": "Location entity Dharwad"
    },

    # --- AMBIGUOUS / MULTI-DEPARTMENT CASES (MUST ABSTAIN OR REQUIRE VOLUNTEER REVIEW) ---
    {
        "id": "REAL-AMBIG-01",
        "title": "serious problem in our colony",
        "text": "There is a very bad situation in our village corner since Monday. People are facing lot of difficulty and nobody is looking into it. Please send someone.",
        "expected_department": "UNCERTAIN",
        "expected_needs_review": True,
        "notes": "Completely ambiguous text; must abstain and require Volunteer review"
    },
    {
        "id": "REAL-AMBIG-02",
        "title": "water leaking on road causing electric shock",
        "text": "Water pipeline burst is flooding the road and water reached the base of rusted electric pole. Locals fear electric shock in standing water.",
        "expected_department": "UNCERTAIN_OR_MULTI",
        "expected_needs_review": True,
        "notes": "Cross-domain conflict (Water + Electricity + Road)"
    },

    # --- OUT-OF-SCOPE CASES (MUST BE FLAGGED AS OUT_OF_SCOPE) ---
    {
        "id": "REAL-OOS-01",
        "title": "old age pension not credited for 3 months",
        "text": "My grandmother did not receive widow pension scheme amount in her Canara bank account since June. Revenue inspector asked to apply online again.",
        "expected_department": "OUT_OF_SCOPE",
        "expected_needs_review": True,
        "notes": "Revenue/Welfare out of scope"
    },
    {
        "id": "REAL-OOS-02",
        "title": "government hospital doctor absent",
        "text": "Duty medical officer absent at Primary Health Centre in taluk. Patients waiting with fever since 9 AM.",
        "expected_department": "OUT_OF_SCOPE",
        "expected_needs_review": True,
        "notes": "Health/PHC out of scope"
    }
]
