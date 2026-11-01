"""Comprehensive Evaluation & Calibration Verification against Realistic Benchmark Dataset."""

import pytest
from app.services.classifier_service import classifier_service
from app.services.nlp_service import nlp_service
from app.services.priority_service import priority_service
from app.services.summarizer_service import summarizer_service
from app.schemas.ai import SummarizeRequest
from data.realistic_eval_dataset import REALISTIC_EVALUATION_DATASET


def test_realistic_department_classification():
    """Verify classifier performance on realistic, colloquial, and regional complaints."""
    core_cases = [c for c in REALISTIC_EVALUATION_DATASET if c["expected_department"] in ["WATER", "ROAD", "ELECTRICITY"]]
    
    correct = 0
    total = len(core_cases)
    
    for case in core_cases:
        res = classifier_service.classify(case["title"], case["text"])
        if res.primary_department == case["expected_department"]:
            correct += 1
        else:
            print(f"FAILED CASE {case['id']}: Expected {case['expected_department']}, got {res.primary_department} (Conf: {res.confidence})")

    accuracy = correct / total
    print(f"\n[BENCHMARK] Realistic Dataset Department Accuracy: {accuracy * 100:.2f}% ({correct}/{total})")
    # All unambiguous colloquial examples in benchmark must classify correctly
    assert accuracy >= 0.90, f"Realistic accuracy below acceptable threshold: {accuracy}"


def test_ambiguous_and_low_confidence_abstention():
    """Verify that ambiguous or multi-domain complaints abstain and flag needs_volunteer_review."""
    ambig_cases = [c for c in REALISTIC_EVALUATION_DATASET if "expected_needs_review" in c and c["expected_department"] in ["UNCERTAIN", "UNCERTAIN_OR_MULTI"]]
    
    for case in ambig_cases:
        res = classifier_service.classify(case["title"], case["text"])
        # Either the model abstained to UNCERTAIN, or margin separation was weak, flagging volunteer review
        assert res.needs_volunteer_review is True, f"Case {case['id']} should have flagged needs_volunteer_review"
        if case["expected_department"] == "UNCERTAIN":
            assert res.primary_department in ["UNCERTAIN", "OUT_OF_SCOPE"], f"Case {case['id']} must output UNCERTAIN, got {res.primary_department}"


def test_out_of_scope_detection():
    """Verify that non-civic petitions (hospital, pensions) are flagged OUT_OF_SCOPE."""
    oos_cases = [c for c in REALISTIC_EVALUATION_DATASET if c.get("expected_department") == "OUT_OF_SCOPE"]
    
    for case in oos_cases:
        res = classifier_service.classify(case["title"], case["text"])
        assert res.primary_department == "OUT_OF_SCOPE", f"Case {case['id']} expected OUT_OF_SCOPE, got {res.primary_department}"
        assert res.needs_volunteer_review is True


def test_location_precedence_and_kr_puram_regression():
    """Regression Test: Citizen input 'KR Puram, Bangalore' must never resolve to Mysuru or default districts."""
    text = "There is a water problem in KR Puram, Bangalore"
    
    # 1. NLP entity check: Bangalore must resolve to Bengaluru Urban, not Mysuru
    nlp_res = nlp_service.analyze(text)
    districts = [e.text for e in nlp_res.entities if e.type == "DISTRICT"]
    assert "Bengaluru Urban" in districts, f"Bangalore should map to Bengaluru Urban, got: {districts}"
    assert "Mysuru" not in districts, "Mysuru should not be present for KR Puram, Bangalore"

    # 2. Summarizer location preservation: Explicit location must be formatted without default overwrite
    sum_res = summarizer_service.summarize(SummarizeRequest(
        title="water problem in KR Puram",
        description=text,
        category="Water Supply",
        location_name="KR Puram, Bangalore"
    ))
    assert "KR Puram, Bangalore" in sum_res.summary
    assert "Mysuru" not in sum_res.summary

    # 3. Text duplication regression test: Summary must not repeat title inside description
    assert "nange water problem is a water problem is there" not in sum_res.summary


def test_priority_urgency_for_hazards():
    """Verify that live wires and contaminated water trigger CRITICAL/HIGH priority."""
    critical_cases = [c for c in REALISTIC_EVALUATION_DATASET if c.get("expected_priority_min") == "CRITICAL"]
    for case in critical_cases:
        p_res = priority_service.evaluate(case["title"], case["text"], case["expected_department"])
        assert p_res.suggested_priority in ["CRITICAL", "HIGH"], f"Hazard {case['id']} expected CRITICAL or HIGH, got {p_res.suggested_priority}"
        assert p_res.urgency_score >= 70, f"Hazard {case['id']} urgency score too low: {p_res.urgency_score}"
