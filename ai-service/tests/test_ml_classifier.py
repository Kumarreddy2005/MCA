from app.services.classifier_service import classifier_service

def test_three_departments():
    assert classifier_service.classify('Deep pothole', 'Large pothole on main road near school').primary_department == 'ROAD'
    assert classifier_service.classify('Transformer sparks', 'Transformer is sparking and live wires are exposed').primary_department == 'ELECTRICITY'
    assert classifier_service.classify('No water', 'No drinking water supply for five days').primary_department == 'WATER'

def test_out_of_scope():
    r=classifier_service.classify('Pension issue','My pension payment is delayed')
    assert r.primary_department=='OUT_OF_SCOPE'
    assert r.needs_volunteer_review is True

def test_ambiguous_is_not_forced():
    r=classifier_service.classify('Problem','There is a serious problem here')
    assert r.primary_department in {'UNCERTAIN','OUT_OF_SCOPE'}
    assert r.needs_volunteer_review is True
