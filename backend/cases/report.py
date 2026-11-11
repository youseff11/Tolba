"""Builds the structured report of a case: chronological timeline + warnings that need review."""
from collections import Counter
from datetime import timedelta

GAP_WARN = timedelta(minutes=10)


def build_report(case) -> dict:
    items = list(case.items.all())
    timed = sorted((i for i in items if i.start_ts), key=lambda i: i.start_ts)
    untimed = [i for i in items if not i.start_ts]
    evidence = [i for i in items if i.kind != "note"]

    warnings = []
    pending = [i for i in evidence if i.decision == "pending"]
    if pending:
        warnings.append({"code": "pending", "count": len(pending), "items": [i.id for i in pending]})

    weak = [i for i in evidence if i.match_probability is not None and i.match_probability < 0.3]
    if weak:
        warnings.append({"code": "weak_match", "count": len(weak), "items": [i.id for i in weak]})

    no_crop = [i for i in evidence if i.kind == "track" and not i.crop_url]
    if no_crop:
        warnings.append({"code": "no_image", "count": len(no_crop), "items": [i.id for i in no_crop]})

    kept = [i for i in timed if i.kind != "note" and i.decision != "rejected"]
    for a, b in zip(kept, kept[1:]):
        if b.start_ts - (a.end_ts or a.start_ts) > GAP_WARN:
            warnings.append(
                {"code": "gap", "from": (a.end_ts or a.start_ts).isoformat(), "to": b.start_ts.isoformat(),
                 "items": [a.id, b.id]}
            )

    confirmed_tracks = [i for i in timed if i.kind == "track" and i.decision == "confirmed"]
    for x in range(len(confirmed_tracks)):
        for y in range(x + 1, len(confirmed_tracks)):
            a, b = confirmed_tracks[x], confirmed_tracks[y]
            if a.camera and b.camera and a.camera != b.camera:
                a_end, b_end = a.end_ts or a.start_ts, b.end_ts or b.start_ts
                if a.start_ts <= b_end and b.start_ts <= a_end:
                    warnings.append({"code": "conflict", "items": [a.id, b.id], "cameras": [a.camera, b.camera]})

    return {
        "case": {"id": case.id, "title": case.title, "description": case.description, "status": case.status,
                 "created_by": str(case.created_by or ""), "created_at": case.created_at.isoformat()},
        "summary": {
            "items": len(items),
            "by_kind": dict(Counter(i.kind for i in items)),
            "by_decision": dict(Counter(i.decision for i in evidence)),
            "cameras": sorted({i.camera for i in items if i.camera}),
            "videos": sorted({i.video for i in items if i.video}),
            "first_ts": timed[0].start_ts.isoformat() if timed else None,
            "last_ts": max((i.end_ts or i.start_ts) for i in timed).isoformat() if timed else None,
        },
        "timeline": [i.id for i in timed] + [i.id for i in untimed],
        "warnings": warnings,
    }
