import assert from "node:assert";
import test from "node:test";
import { localDate, rollover } from "../src/day.ts";

test("the day is the local date, not the UTC date", () => {
  // 23:30 local on 7 Nov is still 7 Nov whatever the UTC offset.
  assert.equal(localDate(new Date(2026, 10, 7, 23, 30)), "2026-11-07");
  assert.equal(localDate(new Date(2026, 10, 8, 0, 5)), "2026-11-08");
});

test("same day: nothing changes", () => {
  const s = { date: "2026-11-07", sessions: [{ start: 1, end: null }], theme: "bw" };
  assert.strictEqual(rollover(s, new Date(2026, 10, 7, 22, 0)), s);
});

test("a timer left running overnight restarts the count at local midnight", () => {
  const start = new Date(2026, 10, 7, 22, 0).getTime();
  const s = { date: "2026-11-07", sessions: [{ start, end: null }], theme: "bw" };
  const next = rollover(s, new Date(2026, 10, 8, 1, 0));
  assert.equal(next.date, "2026-11-08");
  assert.deepEqual(next.sessions, [{ start: new Date(2026, 10, 8, 0, 0).getTime(), end: null }]);
  assert.equal(next.theme, "bw");
});

test("a stopped timer starts the new day at zero", () => {
  const s = { date: "2026-11-07", sessions: [{ start: 1, end: 2 }] };
  assert.deepEqual(rollover(s, new Date(2026, 10, 8, 9, 0)).sessions, []);
});
