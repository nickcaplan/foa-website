#!/usr/bin/env python3
"""Post-deploy freshness audit for the volunteer availability snapshot (#183).

The quarter-hour schedule refreshes assets/fayre-availability.json inside the
reader/publish window (07:00-21:00 Europe/London, until the fayre ends). When
scheduled runs go missing, the workflow still shows green while the published
counts age. This audit fetches the LIVE snapshot after each deploy and fails
when the newest checkedAt is older than the freshness budget inside the
window, so silent staleness surfaces as a red run. Outside the window the
snapshot is expected to be frozen and the audit passes.
"""
import json, sys, time, urllib.request
from datetime import datetime, timezone
from zoneinfo import ZoneInfo

LIVE_URL = 'https://www.thefriendsofashley.org/fayre-availability.json'
FRESHNESS_BUDGET_MIN = 40  # quarter-hour schedule + queue slack; the product target is 30
WINDOW_END_UTC = datetime(2026, 12, 5, 16, 47, tzinfo=timezone.utc)  # mirrors the availability job gate
WINDOW_START_HOUR = 7   # Europe/London, inclusive
WINDOW_END_HOUR = 21    # Europe/London, exclusive
ATTEMPTS = 3
RETRY_SECONDS = 30


def in_window(now):
    """Refresh window from the availability job: London 07:00-21:00 until the fayre ends."""
    if now >= WINDOW_END_UTC:
        return False
    hour = now.astimezone(ZoneInfo('Europe/London')).hour
    return WINDOW_START_HOUR <= hour < WINDOW_END_HOUR


def newest_checked_at(snapshot):
    """Newest checkedAt across the snapshot and every activity."""
    stamps = [snapshot['checkedAt']] + [a['checkedAt'] for a in snapshot.get('activities', {}).values()]
    return max(datetime.fromisoformat(s) for s in stamps)


def fetch_live():
    req = urllib.request.Request(f'{LIVE_URL}?audit={int(time.time())}', headers={'User-Agent': 'foa-freshness-audit'})
    with urllib.request.urlopen(req, timeout=30) as res:
        return json.load(res)


def main():
    now = datetime.now(timezone.utc)
    if not in_window(now):
        print(f'Outside the refresh window (or past the fayre): the snapshot may be frozen. Audit skipped.')
        return 0
    age_s = None
    for attempt in range(1, ATTEMPTS + 1):
        try:
            newest = newest_checked_at(fetch_live())
            age_s = (datetime.now(timezone.utc) - newest).total_seconds()
            if age_s <= FRESHNESS_BUDGET_MIN * 60:
                print(f'Live snapshot is fresh: newest checkedAt {newest.isoformat()} ({int(age_s // 60)} min old, budget {FRESHNESS_BUDGET_MIN} min).')
                return 0
            print(f'Attempt {attempt}/{ATTEMPTS}: newest checkedAt {newest.isoformat()} is {int(age_s // 60)} min old, over budget; re-checking after a pause.')
        except Exception as e:
            print(f'Attempt {attempt}/{ATTEMPTS}: live fetch/parse failed: {e}')
        if attempt < ATTEMPTS:
            time.sleep(RETRY_SECONDS)  # Pages propagation or a concurrently running refresher can lag a deploy
    if age_s is None:
        print('STALE: could not fetch or parse the live snapshot at all inside the refresh window.')
        return 1
    print(f'STALE: newest checkedAt {newest.isoformat()} is {int(age_s // 60)} min old, over the {FRESHNESS_BUDGET_MIN} min budget inside the refresh window.')
    print('Scheduled refreshes are being missed: check recent Verify and deploy site runs for the quarter-hour schedule.')
    return 1


if __name__ == '__main__':
    sys.exit(main())
