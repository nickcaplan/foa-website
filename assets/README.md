# Fayre availability snapshot

`fayre-availability.json` is a machine-generated snapshot of the JustSignup
place counts for the Christmas Fayre volunteering activities. The refresh
workflow rewrites it on a schedule during the signup window; do not edit it
by hand.

## Schema (version 1)

- `schema`: snapshot format version. The reader refuses versions it does not
  understand (fail closed).
- `checkedAt`: when the source was last read (ISO 8601).
- `eventEndsAt`: when the event closes; stale rows past this are ignored.
- `activities`: keyed by the JustSignup activity id. The ids are assigned by
  JustSignup itself and cannot be renamed here; they map to
  `signupActivities[].anchor` in `src/content/events/christmas-fayre-2026.json`.
  - `name`: display name copied from the event content.
  - `rows`: one per time slot, with `endsAt` and `open` places remaining.
  - `capacity`: total places when JustSignup reports one, `null` when it does
    not. `null` means "unknown", never "unlimited" and never "0": the reader
    carries the last known capacity forward and the page hides the percentage
    rather than guess. `open` is always the live count and may be 0 (slot
    full) independently of an unknown capacity.
