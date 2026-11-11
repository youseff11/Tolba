"""In-memory fake of the VisionSeek AI REST API (same paths and JSON shapes as docs/API.md).

Only for development when the real AI server / tunnel is offline. Enabled with VISIONSEEK_MOCK=1
and served under /mock, so VISIONSEEK_BASE_URL=http://127.0.0.1:8000/mock points the backend at it.
"""
import json
import random
import re
import threading
import time
from datetime import datetime, timedelta, timezone
from zoneinfo import ZoneInfo

from django.http import HttpResponse, JsonResponse
from django.views.decorators.csrf import csrf_exempt

CAIRO = ZoneInfo("Africa/Cairo")
STAGES = ["ingest", "motion", "detect_track", "crops", "embed", "events"]
STAGE_SEC = 2.0
COLORS = {
    "red": "#d33", "blue": "#2b5fd9", "black": "#222", "white": "#eee", "green": "#2a9d4b",
    "yellow": "#e8c11c", "grey": "#888", "navy": "#1d2b5a", "brown": "#7a4b22", "silver": "#c0c4c8",
}
AR_WORDS = {
    "أحمر": "red", "احمر": "red", "أزرق": "blue", "ازرق": "blue", "أسود": "black", "اسود": "black",
    "أبيض": "white", "ابيض": "white", "أخضر": "green", "اخضر": "green", "أصفر": "yellow", "اصفر": "yellow",
    "رمادي": "grey", "كحلي": "navy", "بني": "brown", "فضي": "silver",
    "شخص": "person", "راجل": "person", "ست": "person", "عربية": "car", "عربيه": "car",
    "قميص": "shirt", "تيشيرت": "t-shirt", "جاكيت": "jacket", "بنطلون": "pants", "شنطة": "bag",
    "لابس": "wearing",
}
FILLER = {"و", "في", "من", "على", "اللي"}
CLASSES = {"person", "car", "truck", "bus", "motorcycle", "bicycle"}

_lock = threading.Lock()
STATE = {"cameras": {}, "videos": {}, "tracks": {}, "events": [], "next_video": 1, "next_track": 1, "next_event": 1}


def _iso(dt):
    return dt.astimezone(timezone.utc).isoformat()


def _parse_time(value):
    dt = datetime.fromisoformat(value)
    if dt.tzinfo is None:
        dt = dt.replace(tzinfo=CAIRO)
    return dt.astimezone(timezone.utc)


def _err(status, detail):
    return JsonResponse({"detail": detail}, status=status)


def _create_video(camera, start, uploaded_at):
    with _lock:
        n = STATE["next_video"]
        STATE["next_video"] += 1
        code = f"VID-{n:04d}"
        rnd = random.Random(n)
        duration = round(rnd.uniform(40, 120), 1)
        STATE["videos"][code] = {"code": code, "camera": camera, "start": start, "uploaded_at": uploaded_at,
                                 "duration": duration}
        cam_num = camera.split("-")[1]
        for k in range(rnd.randint(8, 14)):
            tid = STATE["next_track"]
            STATE["next_track"] += 1
            cls = "car" if rnd.random() < 0.15 else "person"
            t0 = rnd.uniform(0, duration - 8)
            t1 = t0 + rnd.uniform(3, 25)
            STATE["tracks"][tid] = {
                "id": tid, "code": f"TRK-CAM{cam_num}-{tid:04d}", "class": cls, "video": code, "camera": camera,
                "start": start + timedelta(seconds=t0), "end": start + timedelta(seconds=min(t1, duration)),
                "color": rnd.choice(list(COLORS)), "frame": int(t1 * 10), "n_obs": rnd.randint(5, 60),
                "conf": round(rnd.uniform(0.45, 0.9), 3),
            }
            for typ in (["zone_enter", "zone_exit", "loitering", "line_cross"] if cls == "person" else ["line_cross"]):
                if rnd.random() > {"zone_enter": 0.55, "zone_exit": 0.4, "loitering": 0.25, "line_cross": 0.5}[typ]:
                    continue
                eid = STATE["next_event"]
                STATE["next_event"] += 1
                details = {"cls": cls}
                if typ == "loitering":
                    details["dwell_sec"] = round(t1 - t0, 1)
                if typ == "line_cross":
                    details.update(direction=rnd.choice(["west->east", "east->west"]), from_frame=int(t0 * 10))
                if typ == "zone_enter":
                    details["already_inside"] = False
                if typ == "zone_exit":
                    details["track_ended_inside"] = False
                STATE["events"].append({
                    "event_code": f"EVT-{eid:06d}", "type": typ,
                    "name": "gate" if typ == "line_cross" else "entrance area", "camera": camera,
                    "start_ts": start + timedelta(seconds=t0), "end_ts": start + timedelta(seconds=t1),
                    "tracks": [STATE["tracks"][tid]["code"]], "details": details,
                    "evidence": {"video": code, "start_frame": int(t0 * 10), "end_frame": int(t1 * 10)},
                })
    return code


def _ensure_seed():
    if STATE["videos"]:
        return
    STATE["cameras"]["CAM-01"] = {"code": "CAM-01", "name": "North gate", "location": "North", "site": "Main Street"}
    STATE["cameras"]["CAM-02"] = {"code": "CAM-02", "name": "Crossing", "location": None, "site": "Main Street"}
    STATE["cameras"]["CAM-03"] = {"code": "CAM-03", "name": "Parking", "location": "East", "site": "Main Street"}
    STATE["cameras"]["CAM-04"] = {"code": "CAM-04", "name": "Lobby", "location": "Building A", "site": "Campus"}
    for cam, t in [("CAM-01", "09:00:00"), ("CAM-02", "09:06:30"), ("CAM-03", "09:14:00"), ("CAM-04", "09:22:00"),
                   ("CAM-01", "09:31:00"), ("CAM-02", "09:40:00")]:
        _create_video(cam, _parse_time(f"2026-05-01T{t}"), 0)
    _add_crowding()


def _add_crowding():
    """A few crowding events (several people in a zone at once) so every event type shows up."""
    for code, v in list(STATE["videos"].items())[:3]:
        people = [t for t in STATE["tracks"].values() if t["video"] == code and t["class"] == "person"][:4]
        if len(people) < 3:
            continue
        eid = STATE["next_event"]
        STATE["next_event"] += 1
        t0 = min(t["start"] for t in people)
        STATE["events"].append({
            "event_code": f"EVT-{eid:06d}", "type": "crowding", "name": "entrance area", "camera": v["camera"],
            "start_ts": t0, "end_ts": t0 + timedelta(seconds=8), "tracks": [t["code"] for t in people],
            "details": {"peak_count": len(people), "duration_sec": 8.0},
            "evidence": {"video": code, "start_frame": 10, "end_frame": 90},
        })


def _video_progress(v):
    elapsed = time.time() - v["uploaded_at"]
    done = int(elapsed // STAGE_SEC)
    stages = {}
    for i, name in enumerate(STAGES):
        if i < done:
            stages[name] = {"status": "done", "progress": 1.0, "stats": _stage_stats(name, v)}
        elif i == done:
            stages[name] = {"status": "running", "progress": round((elapsed % STAGE_SEC) / STAGE_SEC, 2), "stats": {}}
            break
    status = "done" if done >= len(STAGES) else ("processing" if elapsed > 0.5 else "uploaded")
    return status, stages


def _stage_stats(name, v):
    tracks = [t for t in STATE["tracks"].values() if t["video"] == v["code"]]
    frames = int(v["duration"] * 10)
    return {
        "ingest": {"fps": 10.0, "duration_sec": v["duration"], "frames": frames, "size": [1280, 720]},
        "motion": {"intervals": 1, "active_sec": v["duration"], "active_fraction": 1.0},
        "detect_track": {"frames_in_motion": frames // 2, "frames_detected": frames // 2, "tracks_kept": len(tracks),
                         "by_class": {c: sum(t["class"] == c for t in tracks) for c in {t["class"] for t in tracks}}},
        "crops": {"tracks": len(tracks), "crops": len(tracks) * 5, "tracks_without_crops": 0},
        "embed": {"model": "mock-siglip", "crops_embedded": len(tracks) * 5, "dim": 768},
        "events": {"events": sum(e["evidence"]["video"] == v["code"] for e in STATE["events"])},
    }.get(name, {})


def _video_done(code):
    v = STATE["videos"].get(code)
    return v is not None and _video_progress(v)[0] == "done"


def _crops(t):
    return [f"/api/v1/crops/{t['id']}/{r}" for r in range(5)]


# ------------------------------------------------------------------ views

def health(request):
    return JsonResponse({"status": "ok", "version": "0.1.0-mock"})


@csrf_exempt
def cameras(request):
    _ensure_seed()
    if request.method == "POST":
        body = json.loads(request.body or b"{}")
        code = body.get("code", "")
        if not re.fullmatch(r"CAM-\d{2,}", code):
            return _err(422, "Camera code must look like CAM-01")
        cam = STATE["cameras"].setdefault(code, {"code": code, "name": code, "location": None, "site": None})
        for k in ("name", "site", "location"):
            if body.get(k):
                cam[k] = body[k]
        return JsonResponse(cam, status=201)
    return JsonResponse(list(STATE["cameras"].values()), safe=False)


@csrf_exempt
def videos(request):
    _ensure_seed()
    if request.method != "POST":
        return _err(405, "Method not allowed")
    camera = request.POST.get("camera_code", "")
    if not re.fullmatch(r"CAM-\d{2,}", camera):
        return _err(422, "Camera code must look like CAM-01")
    try:
        start = _parse_time(request.POST.get("start_time", ""))
    except ValueError:
        return _err(422, "start_time must be ISO-8601")
    if "file" not in request.FILES:
        return _err(422, "file is required")
    STATE["cameras"].setdefault(camera, {"code": camera, "name": camera, "location": None, "site": None})
    code = _create_video(camera, start, time.time())
    return JsonResponse({"video_code": code, "status": "uploaded"}, status=202)


def video_detail(request, code):
    _ensure_seed()
    v = STATE["videos"].get(code)
    if not v:
        return _err(404, f"Video {code} not found")
    status, stages = _video_progress(v)
    return JsonResponse({
        "code": code, "camera": v["camera"], "status": status, "error": None, "start_time": _iso(v["start"]),
        "duration_sec": v["duration"], "fps": 10.0, "stages": stages,
    })


def video_tracks(request, code):
    _ensure_seed()
    if code not in STATE["videos"]:
        return _err(404, f"Video {code} not found")
    if not _video_done(code):
        return JsonResponse([], safe=False)
    tracks = sorted((t for t in STATE["tracks"].values() if t["video"] == code), key=lambda t: t["start"])
    return JsonResponse([{
        "code": t["code"], "class": t["class"], "start_ts": _iso(t["start"]), "end_ts": _iso(t["end"]),
        "n_obs": t["n_obs"], "mean_conf": t["conf"], "crops": _crops(t),
    } for t in tracks], safe=False)


def crop(request, track_id, rank):
    t = STATE["tracks"].get(track_id)
    if not t or rank > 4:
        return _err(404, "Crop not found")
    color = COLORS[t["color"]]
    shade = ["#00000000", "#00000018", "#00000030", "#ffffff22", "#ffffff11"][rank]
    if t["class"] == "person":
        body = (f'<circle cx="50" cy="38" r="16" fill="#c99a76"/>'
                f'<rect x="28" y="58" width="44" height="62" rx="10" fill="{color}"/>'
                f'<rect x="32" y="118" width="15" height="58" fill="#333"/><rect x="53" y="118" width="15" height="58" fill="#333"/>')
    else:
        body = (f'<rect x="8" y="90" width="84" height="40" rx="10" fill="{color}"/>'
                f'<rect x="22" y="70" width="56" height="28" rx="8" fill="{color}"/>'
                f'<circle cx="28" cy="134" r="10" fill="#222"/><circle cx="72" cy="134" r="10" fill="#222"/>')
    svg = (f'<svg xmlns="http://www.w3.org/2000/svg" width="100" height="190" viewBox="0 0 100 190">'
           f'<rect width="100" height="190" fill="#6b7280"/>{body}<rect width="100" height="190" fill="{shade}"/>'
           f'<text x="50" y="186" font-size="9" text-anchor="middle" fill="#fff">{t["code"]} #{rank}</text></svg>')
    return HttpResponse(svg, content_type="image/svg+xml")


def _parse_query(q):
    words = re.findall(r"[\w\-]+", q.lower())
    en, untranslated = [], []
    for w in words:
        if w in FILLER:
            continue
        if re.search(r"[؀-ۿ]", w):
            if w in AR_WORDS:
                en.append(AR_WORDS[w])
            else:
                untranslated.append(w)
        else:
            en.append(w)
    return en, untranslated


def search(request):
    _ensure_seed()
    q = request.GET.get("q", "")
    en, untranslated = _parse_query(q)
    if not en:
        return _err(422, "Could not understand the query; try English or simpler words")
    try:
        start = _parse_time(request.GET["start"]) if request.GET.get("start") else None
        end = _parse_time(request.GET["end"]) if request.GET.get("end") else None
    except ValueError:
        return _err(422, "start/end must be ISO-8601")
    limit = max(1, min(50, int(request.GET.get("limit") or 10)))
    min_prob = float(request.GET.get("min_prob") or 0.05)
    cls = request.GET.get("cls") or next((w for w in en if w in CLASSES), None)
    camera = request.GET.get("camera") or None
    site = request.GET.get("site") or None
    colors = [w for w in en if w in COLORS]

    cands = []
    for t in STATE["tracks"].values():
        if not _video_done(t["video"]):
            continue
        if cls and t["class"] != cls:
            continue
        if camera and t["camera"] != camera:
            continue
        if site and STATE["cameras"].get(t["camera"], {}).get("site") != site:
            continue
        if start and t["end"] < start or end and t["start"] > end:
            continue
        cands.append(t)

    scored = []
    for t in cands:
        rnd = random.Random(t["id"] * 31 + len(q))
        if not colors:
            prob = rnd.uniform(0.2, 0.6)
        elif t["color"] in colors:
            prob = rnd.uniform(0.55, 0.97)
        else:
            prob = rnd.uniform(0.0, 0.06)
        scored.append((round(0.05 + prob * 0.1, 4), round(prob, 3), t))
    scored.sort(key=lambda s: -s[0])
    kept = [s for s in scored if s[1] >= min_prob]
    hits = [{
        "track_code": t["code"], "score": score, "match_probability": prob, "class": t["class"],
        "camera": t["camera"], "video": t["video"], "start_ts": _iso(t["start"]), "end_ts": _iso(t["end"]),
        "evidence": {"video": t["video"], "frame_idx": t["frame"]}, "crops": _crops(t),
    } for score, prob, t in kept[:limit]]
    return JsonResponse({
        "query": q, "query_en": " ".join(en), "untranslated": untranslated,
        "filters": {"camera": camera, "site": site, "class": cls}, "candidates": len(cands),
        "weak_left_out": len(scored) - len(kept), "hits": hits,
    })


def events(request):
    _ensure_seed()
    g = request.GET
    try:
        start = _parse_time(g["start"]) if g.get("start") else None
        end = _parse_time(g["end"]) if g.get("end") else None
    except ValueError:
        return _err(422, "start/end must be ISO-8601")
    out = []
    for e in sorted(STATE["events"], key=lambda e: e["start_ts"]):
        if not _video_done(e["evidence"]["video"]):
            continue
        if g.get("camera") and e["camera"] != g["camera"]:
            continue
        if g.get("site") and STATE["cameras"].get(e["camera"], {}).get("site") != g["site"]:
            continue
        if g.get("type") and e["type"] != g["type"]:
            continue
        if g.get("name") and e["name"] != g["name"]:
            continue
        if start and e["end_ts"] < start or end and e["start_ts"] > end:
            continue
        out.append({**e, "start_ts": _iso(e["start_ts"]), "end_ts": _iso(e["end_ts"])})
    limit = max(1, min(500, int(g.get("limit") or 100)))
    return JsonResponse(out[:limit], safe=False)
