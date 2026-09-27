"""Generative AI Decision Support Service for Citizen, Volunteer, Official & Admin personas."""

import re
from typing import Dict, List, Optional
from app.schemas.genai import (
    AdminSummaryRequest,
    AdminSummaryResponse,
    CitizenAssistRequest,
    CitizenAssistResponse,
    MissingChecklistItem,
    OfficialDraftRequest,
    OfficialDraftResponse,
    TranslationRequest,
    TranslationResponse,
    VolunteerStructureRequest,
    VolunteerStructureResponse,
)
from app.services.classifier_service import classifier_service
from app.services.priority_service import priority_service

# Kannada <-> English Vocabulary dictionary for common civic & governance terminology
KANNADA_ENGLISH_MAP = {
    # Kannada to English
    "ನೀರು": "water",
    "ಕುಡಿಯುವ ನೀರು": "drinking water",
    "ವಿದ್ಯುತ್": "electricity",
    "ಕರೆಂಟ್": "power/electricity",
    "ರಸ್ತೆ": "road",
    "ಚರಂಡಿ": "drainage",
    "ಕಸ": "garbage/waste",
    "ಆಸ್ಪತ್ರೆ": "hospital/clinic",
    "ಶಾಲೆ": "school",
    "ರೇಷನ್": "ration",
    "ಪೆನ್ಷನ್": "pension",
    "ಗ್ರಾಮ ಪಂಚಾಯಿತಿ": "gram panchayat",
    "ತಾಲೂಕು": "taluk",
    "ಜಿಲ್ಲೆ": "district",
    "ಬೆಸ್ಕಾಂ": "BESCOM",
    "ಕಂಬ": "electric pole",
    "ಟ್ರಾನ್ಸ್‌ಫಾರ್ಮರ್": "transformer",
    "ತೊಂದರೆ": "trouble/issue",
    "ಹಾಳಾಗಿದೆ": "damaged/broken",
    "ಬರುತ್ತಿಲ್ಲ": "not coming/unavailable",
    "ಅಪಾಯ": "danger/hazard",

    # English to Kannada
    "water": "ನೀರು",
    "drinking water": "ಕುಡಿಯುವ ನೀರು",
    "electricity": "ವಿದ್ಯುತ್",
    "road": "ರಸ್ತೆ",
    "drainage": "ಚರಂಡಿ",
    "garbage": "ಕಸ",
    "hospital": "ಆಸ್ಪತ್ರೆ",
    "school": "ಶಾಲೆ",
    "ration": "ಪಡಿತರ (ರೇಷನ್)",
    "pension": "ಪಿಂಚಣಿ (ಪೆನ್ಷನ್)",
    "gram panchayat": "ಗ್ರಾಮ ಪಂಚಾಯಿತಿ",
    "danger": "ಅಪಾಯ",
    "urgent": "ತುರ್ತು",
    "resolved": "ಪರಿಹರಿಸಲಾಗಿದೆ",
    "complaint": "ದೂರು",
    "status": "ಸ್ಥಿತಿ",
}

DEPARTMENT_INSPECTION_CHECKLISTS: Dict[str, List[str]] = {
    "Energy Department": [
        "Inspect 11kV High Tension (HT) line clearances from tree branches and structures",
        "Verify transformer oil dielectric strength, level, and silica gel breather condition",
        "Check Low Tension (LT) circuit breakers, earthing resistance (< 2 ohms), and neutral continuity",
        "Inspect snapped conductors or sagging spans and verify stay wire insulation",
        "Ensure public safety cordon and de-energization confirmation before physical contact"
    ],
    "Rural Development & Panchayat Raj": [
        "Inspect borewell yield, pump motor capacitor, and electrical switchgear",
        "Verify pipeline pressure, main gate valves, and overhead reservoir inlet flow",
        "Inspect open drainage slope, silt accumulation, and desilting requirements",
        "Test drinking water residual chlorine levels and bacteriological potability",
        "Verify street light photocell timers and phase wire continuity"
    ],
    "Health & Family Welfare": [
        "Audit essential drug stock registers (antibiotics, ORS, paracetamol, antivenom)",
        "Check cold chain maintenance and deep freezer temperatures for vaccines",
        "Inspect Primary Health Centre (PHC) duty doctor and nursing staff attendance register",
        "Review vector-borne disease outbreak reports and larva survey records",
        "Verify emergency 108 ambulance response logs and oxygen cylinder reserves"
    ],
    "Public Works Department": [
        "Measure pothole depth, road edge deterioration, and carriage width encroachment",
        "Inspect bridge structural abutments, expansion joints, and weep holes",
        "Check roadside stormwater culvert clearance and structural apron integrity",
        "Review quality test reports for bituminous asphalt resurfacing mix",
        "Ensure mandatory retro-reflective warning signboards and barricading for transit safety"
    ],
    "Food & Civil Supplies": [
        "Inspect electronic Point of Sale (ePoS) biometric scanner functionality",
        "Verify electronic weighing scale calibration and physical stock inventory",
        "Review monthly Fair Price Shop (FPS) food grain allocation and quota distribution records",
        "Check Annabhagya DBT and ration card entitlement logs for beneficiary families",
        "Inspect shop hygiene, storage godown moisture protection, and display boards"
    ],
    "Revenue Department": [
        "Cross-verify survey numbers against Bhoomi RTC / Pahani land records",
        "Review mutation register entries and notice serving timelines under Section 129",
        "Verify Sandhyasuraksha / Old Age Pension eligibility and bank account seeding",
        "Inspect government land boundaries and detect illegal encroachment marks",
        "Check Taluk office dispatch registers for caste and income certificate service delivery"
    ]
}


class GenAIService:
    """Provides role-based decision support, conversational drafting, and translation."""

    @staticmethod
    def assist_citizen(req: CitizenAssistRequest) -> CitizenAssistResponse:
        q = req.query.strip()
        q_lower = q.lower()

        # Mode A: Status Explanation for existing complaint
        if req.complaint_context:
            ctx = req.complaint_context
            comp_num = ctx.get("complaintNumber", "Your complaint")
            status = ctx.get("status", "SUBMITTED")
            dept = ctx.get("department", "designated department")
            officer = ctx.get("assignedOfficialName", "assigned jurisdictional officer")

            status_explanations = {
                "SUBMITTED": f"{comp_num} has been officially registered in the VCGIS portal and queued for automated departmental routing to {dept}.",
                "ASSIGNED": f"{comp_num} has been assigned to {officer} in {dept}. The officer has been notified to initiate review.",
                "UNDER_REVIEW": f"{comp_num} is actively being reviewed by {officer}. Administrative files and jurisdiction checks are underway.",
                "ACTION_IN_PROGRESS": f"Field corrective action is underway for {comp_num}. Technical crews or field staff have been deployed.",
                "RESOLVED": f"{comp_num} has been marked as RESOLVED by {officer}. Proof of work has been recorded. Please provide your satisfaction rating.",
                "REJECTED": f"{comp_num} could not be processed under this category. A formal justification was recorded by the reviewing officer.",
                "REOPENED": f"{comp_num} was reopened for further inspection. Escalation workflows are actively tracking the deadline."
            }

            explanation = status_explanations.get(status, f"{comp_num} is currently in status '{status}'.")
            reply = f"Hello! Here is the latest update on grievance {comp_num}:\n\n{explanation}"
            next_steps = [
                "Track official action updates in your complaint timeline",
                "Contact your Village Volunteer for on-site assistance if urgent",
                "You can submit clarification notes if the officer requests additional info"
            ]

            return CitizenAssistResponse(
                success=True,
                reply_message=reply,
                status_explanation=explanation,
                next_steps=next_steps
            )

        # Mode B: Conversational Complaint Drafting
        classify_res = classifier_service.classify(q, q)
        priority_res = priority_service.evaluate(q, q, classify_res.primary_department)

        # Generate clean title and structured description
        words = q.split()
        if len(words) <= 7:
            draft_title = q.strip().capitalize()
        else:
            draft_title = " ".join(words[:7]).strip().capitalize() + "..."

        draft_description = (
            f"Grievance regarding {q.strip()}.\n\n"
            f"Observed in local jurisdiction requiring prompt inspection and rectification by {classify_res.primary_department}. "
            f"Estimated urgency: {priority_res.suggested_priority}."
        )

        reply = (
            f"I have analyzed your grievance statement and drafted a formal petition for you under "
            f"'{classify_res.primary_department}'. Please review the generated title and description below, "
            f"add your exact village locality, and proceed with submission."
        )

        next_steps = [
            "Review and refine the draft title and description",
            "Ensure your village and GPS location are accurately marked",
            "Attach clear photo or video evidence if available to expedite action"
        ]

        return CitizenAssistResponse(
            success=True,
            reply_message=reply,
            draft_title=draft_title,
            draft_description=draft_description,
            suggested_category=classify_res.sub_category or classify_res.primary_department,
            suggested_department=classify_res.primary_department,
            next_steps=next_steps
        )

    @staticmethod
    def structure_volunteer_notes(req: VolunteerStructureRequest) -> VolunteerStructureResponse:
        notes = req.raw_notes.strip()

        # Run classification and priority
        classify_res = classifier_service.classify(notes, notes)
        priority_res = priority_service.evaluate(notes, notes, classify_res.primary_department)

        # Structure into 4 parts
        sentences = [s.strip() for s in re.split(r"[.\n]+", notes) if len(s.strip()) > 3]
        incident = sentences[0] if sentences else notes
        impact = sentences[1] if len(sentences) > 1 else "Impacts local residents and village commute."

        location_clues = req.village_context or "Identified village ward/street"
        for word in ["cross", "road", "street", "near", "opposite", "behind", "school", "temple", "tank"]:
            m = re.search(rf"({word}\s+[A-Za-z0-9]+)", notes, re.IGNORECASE)
            if m:
                location_clues = f"{m.group(0).title()}, {req.village_context or 'Village'}"
                break

        structured_title = f"{classify_res.sub_category or classify_res.primary_department} Grievance at {location_clues}"
        structured_desc = (
            f"1. INCIDENT SUMMARY:\n{incident}\n\n"
            f"2. LOCATION CLUES:\n{location_clues} (Taluk: {req.taluk_context or 'Taluk'})\n\n"
            f"3. OBSERVED IMPACT:\n{impact}\n\n"
            f"4. VOLUNTEER URGENCY ASSESSMENT:\n{priority_res.suggested_priority} priority recommended based on initial field appraisal."
        )

        # Generate domain-specific missing information checklist
        missing_checklist: List[MissingChecklistItem] = [
            MissingChecklistItem(
                item="Exact Street / Landmark",
                question="Is there a specific house number, pole number, or prominent landmark nearby?",
                is_critical=True
            ),
            MissingChecklistItem(
                item="Duration of Grievance",
                question="Since how many days or hours has this issue persisted?",
                is_critical=False
            ),
            MissingChecklistItem(
                item="Affected Population",
                question="Approximately how many households or families are directly affected?",
                is_critical=False
            )
        ]

        # Add category-specific checklist questions
        if "energy" in classify_res.primary_department.lower():
            missing_checklist.append(
                MissingChecklistItem(
                    item="Transformer / Pole Identification Number",
                    question="Can you locate the yellow stencil number on the BESCOM pole or transformer?",
                    is_critical=True
                )
            )
        elif "rural" in classify_res.primary_department.lower():
            missing_checklist.append(
                MissingChecklistItem(
                    item="Water Source Type",
                    question="Is this a deep borewell, open well, or village multi-village supply pipeline?",
                    is_critical=True
                )
            )

        return VolunteerStructureResponse(
            success=True,
            structured_title=structured_title,
            structured_description=structured_desc,
            incident_summary=incident,
            location_clues=location_clues,
            observed_impact=impact,
            detected_category=classify_res.sub_category or classify_res.primary_department,
            detected_department=classify_res.primary_department,
            recommended_priority=priority_res.suggested_priority,
            missing_info_checklist=missing_checklist
        )

    @staticmethod
    def draft_official_response(req: OfficialDraftRequest) -> OfficialDraftResponse:
        officer = req.officer_name or "Department Officer"
        designation = req.officer_designation or "Executive Official"
        citizen = req.citizen_name or "Citizen"
        action = req.action_type.upper()
        notes = req.action_notes or "Inspection completed and necessary corrective measures executed."

        # Case 1: Resolution Letter
        if action == "RESOLUTION":
            letter = (
                f"GOVERNMENT OF KARNATAKA\n"
                f"DEPARTMENT OF {req.department.upper()}\n\n"
                f"To:\nSri/Smt. {citizen}\n\n"
                f"Subject: Formal Resolution Notice for Grievance Ref: {req.complaint_number}\n"
                f"Reference Category: {req.category}\n\n"
                f"Sir/Madam,\n\n"
                f"With reference to your petition regarding '{req.title}', this is to formally communicate that "
                f"the competent field authority has conducted the required technical verification and completed the rectification works.\n\n"
                f"Action Summary:\n{notes}\n\n"
                f"The grievance has been resolved in strict accordance with the Karnataka Guarantee of Services to Citizens (Sakala) Act. "
                f"Photographic proof of completed work has been recorded on the state VCGIS portal.\n\n"
                f"Yours faithfully,\n\n"
                f"{officer}\n"
                f"{designation}\n"
                f"Government of Karnataka"
            )

            sms = (
                f"Govt of Karnataka VCGIS: Grievance {req.complaint_number} ({req.category}) is RESOLVED. "
                f"Please check details and submit feedback on the citizen portal."
            )

            checklist = DEPARTMENT_INSPECTION_CHECKLISTS.get(
                req.department,
                [
                    "Verify physical site condition and rectification quality",
                    "Capture clear geo-tagged photographs of completed works",
                    "Obtain signed citizen acknowledgement or oral confirmation",
                    "Update maintenance log register"
                ]
            )

            return OfficialDraftResponse(
                success=True,
                formal_letter=letter,
                sms_summary=sms,
                inspection_checklist=checklist
            )

        # Case 2: Rejection Letter
        elif action == "REJECTION":
            letter = (
                f"GOVERNMENT OF KARNATAKA\n"
                f"DEPARTMENT OF {req.department.upper()}\n\n"
                f"To:\nSri/Smt. {citizen}\n\n"
                f"Subject: Formal Endorsement of Grievance Ref: {req.complaint_number}\n\n"
                f"Sir/Madam,\n\n"
                f"Your petition '{req.title}' has been reviewed by the department authority. After thorough verification, "
                f"the grievance could not be admitted for the following statutory reason:\n\n"
                f"Reason for Non-Admissibility:\n{notes}\n\n"
                f"Statutory Basis: Karnataka Sakala Services Grievance Redressal Rules, Section 6(2) - Jurisdictional limitation or civil litigation restriction.\n\n"
                f"If you are aggrieved by this decision, an appeal may be preferred before the designated Appellate Authority within 30 days.\n\n"
                f"Yours faithfully,\n\n"
                f"{officer}\n"
                f"{designation}"
            )

            sms = (
                f"Govt of Karnataka VCGIS: Grievance {req.complaint_number} could not be admitted: {notes[:80]}. "
                f"Review formal endorsement on the portal."
            )

            return OfficialDraftResponse(
                success=True,
                formal_letter=letter,
                sms_summary=sms,
                inspection_checklist=[],
                rejection_statutory_basis="Karnataka Sakala Services Grievance Redressal Rules Section 6(2)"
            )

        # Case 3: Inspection or Transfer Note
        else:
            checklist = DEPARTMENT_INSPECTION_CHECKLISTS.get(
                req.department,
                [
                    "Conduct on-site physical inspection within 24 hours",
                    "Measure dimensions and technical specification tolerances",
                    "Verify contractor service obligations",
                    "File interim action progress note"
                ]
            )

            letter = (
                f"GOVERNMENT OF KARNATAKA — OFFICIAL ACTION NOTE\n"
                f"Ref: {req.complaint_number} | Dept: {req.department}\n"
                f"Officer: {officer} ({designation})\n\n"
                f"Action Initiated: {action}\n"
                f"Remarks:\n{notes}\n"
            )

            sms = f"VCGIS: Action '{action}' recorded for complaint {req.complaint_number}."

            return OfficialDraftResponse(
                success=True,
                formal_letter=letter,
                sms_summary=sms,
                inspection_checklist=checklist
            )

    @staticmethod
    def generate_admin_summary(req: AdminSummaryRequest) -> AdminSummaryResponse:
        total = max(req.total_complaints, 1)
        compliance_rate = round((req.resolved_count / total) * 100, 1)
        breach_rate = round((req.breached_count / total) * 100, 1)

        dist_str = f"in {req.district} district" if req.district else "across all monitored Karnataka districts"
        dept_str = f"for {req.department}" if req.department else "across all government departments"

        exec_summary = (
            f"Executive Operational Briefing {dist_str} {dept_str} over the past {req.time_window_days} days. "
            f"A total of {req.total_complaints} grievances were registered. "
            f"The overall SLA compliance rate stands at {compliance_rate}%, with {req.resolved_count} grievances satisfactorily resolved. "
            f"Currently, {req.pending_count} cases are actively in progress, while {req.breached_count} cases ({breach_rate}%) have breached standard SLA timelines. "
            f"{req.critical_count} critical public-hazard emergencies were flagged and prioritized."
        )

        key_highlights = [
            f"Total Redressal Volume: {req.total_complaints} petitions processed",
            f"SLA Compliance Performance: {compliance_rate}% on-time resolution",
            f"Active Workload: {req.pending_count} grievances under active processing",
            f"Critical Safety Alerts: {req.critical_count} life-safety hazards addressed"
        ]

        hotspots = []
        if req.breached_count > 0:
            hotspots.append(f"SLA Overdue Cluster: {req.breached_count} petitions exceeded legal target resolution dates")
        if req.critical_count > 0:
            hotspots.append(f"Public Hazard Cluster: {req.critical_count} critical safety emergency grievances")
        if req.top_categories:
            hotspots.append(f"High-Volume Grievance Sectors: {', '.join(req.top_categories[:3])}")
        else:
            hotspots.append("Routine civic maintenance across Gram Panchayats")

        recommendations = [
            "Deploy mobile technical taskforce to clear pending SLA breach queues",
            "Enforce daily morning review meetings for Taluk Executive Officers with > 5 overdue cases",
            "Accelerate preventive transformer maintenance and borewell spare inventory replenishment ahead of monsoon season"
        ]

        return AdminSummaryResponse(
            success=True,
            executive_summary=exec_summary,
            key_highlights=key_highlights,
            identified_hotspots=hotspots,
            strategic_recommendations=recommendations
        )

    @staticmethod
    def translate_text(req: TranslationRequest) -> TranslationResponse:
        text = req.text.strip()
        src = req.source_language.lower()
        tgt = req.target_language.lower()

        # Auto-detect language
        has_kannada = any("\u0C80" <= c <= "\u0CFF" for c in text)
        detected_source = "kn" if has_kannada else "en"

        if src == "auto":
            src = detected_source

        # If source and target are identical
        if src == tgt:
            return TranslationResponse(
                success=True,
                translated_text=text,
                detected_source=src,
                target_language=tgt
            )

        translated = text
        if src == "kn" and tgt == "en":
            # Kannada to English replacement
            for kn_term, en_term in KANNADA_ENGLISH_MAP.items():
                if any("\u0C80" <= c <= "\u0CFF" for c in kn_term):
                    translated = translated.replace(kn_term, en_term)
        else:
            # English to Kannada replacement
            for en_term, kn_term in KANNADA_ENGLISH_MAP.items():
                if not any("\u0C80" <= c <= "\u0CFF" for c in en_term):
                    translated = re.sub(rf"\b{re.escape(en_term)}\b", kn_term, translated, flags=re.IGNORECASE)

        return TranslationResponse(
            success=True,
            translated_text=translated,
            detected_source=src,
            target_language=tgt
        )


genai_service = GenAIService()
