# Calendar smoke test

1) Hard refresh
2) Enable two calendars (Person A + Person B)
3) Schedule view:
   - timed events render for both
   - all-day row works
   - overlaps render in lanes, no full-width collisions
4) Month view:
   - indicators appear for both
   - day click shows combined list
5) Sync:
   - no "try again" on initial load when cached data exists
   - pressing Sync updates and clears banner on success
   - with no cached data and a failed refresh, the banner offers "Try again"
