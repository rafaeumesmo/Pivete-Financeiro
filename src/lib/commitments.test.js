import { describe, it, expect } from "vitest";
import {
  toDateStr, isScheduledOnDate, getLogStatus, getStreak, getAdherence,
  shouldAppearInDeck, recurrenceLabel,
} from "./commitments.js";

// 2024-01-01 is a Monday, so:
const MON = new Date(2024, 0, 1); // dow 1
const WED = new Date(2024, 0, 3); // dow 3
const SAT = new Date(2024, 0, 6); // dow 6
const SUN = new Date(2024, 0, 7); // dow 0

describe("toDateStr", () => {
  it("formats as YYYY-MM-DD with zero-padding", () => {
    expect(toDateStr(new Date(2024, 0, 3))).toBe("2024-01-03");
    expect(toDateStr(new Date(2024, 10, 25))).toBe("2024-11-25");
  });
});

describe("isScheduledOnDate", () => {
  it("returns false for a paused commitment regardless of type", () => {
    const c = { type: "weekdays_only", paused: true };
    expect(isScheduledOnDate(c, WED)).toBe(false);
  });

  it("weekdays: matches only the configured days of week", () => {
    const c = { type: "weekdays", weekdays: [1, 3, 5] };
    expect(isScheduledOnDate(c, MON)).toBe(true);
    expect(isScheduledOnDate(c, WED)).toBe(true);
    expect(isScheduledOnDate(c, SAT)).toBe(false);
  });

  it("weekend: matches Saturday and Sunday only", () => {
    const c = { type: "weekend" };
    expect(isScheduledOnDate(c, SAT)).toBe(true);
    expect(isScheduledOnDate(c, SUN)).toBe(true);
    expect(isScheduledOnDate(c, WED)).toBe(false);
  });

  it("weekdays_only: matches Monday-Friday only", () => {
    const c = { type: "weekdays_only" };
    expect(isScheduledOnDate(c, MON)).toBe(true);
    expect(isScheduledOnDate(c, WED)).toBe(true);
    expect(isScheduledOnDate(c, SAT)).toBe(false);
    expect(isScheduledOnDate(c, SUN)).toBe(false);
  });

  it("interval: matches every N days counted from createdAt", () => {
    const c = { type: "interval", intervalDays: 2, createdAt: MON.toISOString() };
    expect(isScheduledOnDate(c, MON)).toBe(true);  // day 0
    expect(isScheduledOnDate(c, new Date(2024, 0, 2))).toBe(false); // day 1
    expect(isScheduledOnDate(c, WED)).toBe(true);  // day 2
  });

  it("interval: never scheduled before createdAt", () => {
    const c = { type: "interval", intervalDays: 1, createdAt: WED.toISOString() };
    expect(isScheduledOnDate(c, MON)).toBe(false);
  });

  it("event: scheduled within showBeforeDays of eventDate, inclusive", () => {
    const c = { type: "event", eventDate: "2024-01-10", showBeforeDays: 3 };
    expect(isScheduledOnDate(c, new Date(2024, 0, 7))).toBe(true);  // 3 days before
    expect(isScheduledOnDate(c, new Date(2024, 0, 10))).toBe(true); // the day itself
    expect(isScheduledOnDate(c, new Date(2024, 0, 6))).toBe(false); // 4 days before
    expect(isScheduledOnDate(c, new Date(2024, 0, 11))).toBe(false); // after the event
  });

  it("event: defaults showBeforeDays to 7 when not set", () => {
    const c = { type: "event", eventDate: "2024-01-10" };
    expect(isScheduledOnDate(c, new Date(2024, 0, 3))).toBe(true); // 7 days before
    expect(isScheduledOnDate(c, new Date(2024, 0, 2))).toBe(false); // 8 days before
  });

  it("event: false when eventDate is missing", () => {
    expect(isScheduledOnDate({ type: "event" }, WED)).toBe(false);
  });

  it("returns false for an unknown type", () => {
    expect(isScheduledOnDate({ type: "bogus" }, WED)).toBe(false);
  });
});

describe("getLogStatus", () => {
  const log = [
    { commitmentId: "a", date: "2024-01-03", status: "done" },
    { commitmentId: "b", date: "2024-01-03", status: "missed" },
  ];

  it("finds the status for a commitment+date pair", () => {
    expect(getLogStatus("a", "2024-01-03", log)).toBe("done");
    expect(getLogStatus("b", "2024-01-03", log)).toBe("missed");
  });

  it("returns null when there is no matching entry", () => {
    expect(getLogStatus("a", "2024-01-04", log)).toBeNull();
    expect(getLogStatus("c", "2024-01-03", log)).toBeNull();
  });
});

describe("shouldAppearInDeck", () => {
  const c = { id: "c1", type: "weekdays_only" };

  it("true when scheduled today and not yet logged", () => {
    expect(shouldAppearInDeck(c, [], WED)).toBe(true);
  });

  it("false when scheduled today but already logged", () => {
    const log = [{ commitmentId: "c1", date: toDateStr(WED), status: "done" }];
    expect(shouldAppearInDeck(c, log, WED)).toBe(false);
  });

  it("false when not scheduled today", () => {
    expect(shouldAppearInDeck(c, [], SAT)).toBe(false);
  });
});

describe("getStreak", () => {
  it("counts consecutive done days ending yesterday when today isn't logged yet", () => {
    const c = { id: "c1", type: "weekdays_only", createdAt: new Date(2023, 11, 1).toISOString() };
    // Mon(1) done, Tue(2) done, today is Wed(3) not logged yet
    const log = [
      { commitmentId: "c1", date: "2024-01-01", status: "done" },
      { commitmentId: "c1", date: "2024-01-02", status: "done" },
    ];
    expect(getStreak(c, log, WED)).toBe(2);
  });

  it("breaks the streak on a missed scheduled day", () => {
    const c = { id: "c1", type: "weekdays_only", createdAt: new Date(2023, 11, 1).toISOString() };
    const log = [
      { commitmentId: "c1", date: "2024-01-01", status: "missed" },
      { commitmentId: "c1", date: "2024-01-02", status: "done" },
    ];
    expect(getStreak(c, log, WED)).toBe(1);
  });

  it("is 0 for a brand new commitment with no log entries", () => {
    const c = { id: "c1", type: "weekdays_only", createdAt: WED.toISOString() };
    expect(getStreak(c, [], WED)).toBe(0);
  });
});

describe("getAdherence", () => {
  it("returns null when nothing was scheduled in the window", () => {
    const c = { id: "c1", type: "event", eventDate: "2099-01-01" };
    expect(getAdherence(c, [], 7, WED)).toBeNull();
  });

  it("computes done/scheduled/pct over the trailing window", () => {
    const c = { id: "c1", type: "weekdays_only", createdAt: new Date(2023, 11, 1).toISOString() };
    // Window of 3 days ending Wed: Mon, Tue, Wed all weekdays → 3 scheduled
    const log = [
      { commitmentId: "c1", date: "2024-01-01", status: "done" },
      { commitmentId: "c1", date: "2024-01-02", status: "done" },
    ];
    const adh = getAdherence(c, log, 3, WED);
    expect(adh).toEqual({ done: 2, scheduled: 3, pct: 67 });
  });
});

describe("recurrenceLabel", () => {
  it("weekdays: lists the day abbreviations", () => {
    expect(recurrenceLabel({ type: "weekdays", weekdays: [1, 3] })).toBe("Seg, Qua");
  });

  it("weekdays: 'Todo dia' when all 7 days are picked", () => {
    expect(recurrenceLabel({ type: "weekdays", weekdays: [0, 1, 2, 3, 4, 5, 6] })).toBe("Todo dia");
  });

  it("weekdays: 'Nenhum dia' when none are picked", () => {
    expect(recurrenceLabel({ type: "weekdays", weekdays: [] })).toBe("Nenhum dia");
  });

  it("interval: special-cases 1 and 2 days", () => {
    expect(recurrenceLabel({ type: "interval", intervalDays: 1 })).toBe("Todo dia");
    expect(recurrenceLabel({ type: "interval", intervalDays: 2 })).toBe("Dias alternados");
    expect(recurrenceLabel({ type: "interval", intervalDays: 5 })).toBe("A cada 5 dias");
  });

  it("weekend / weekdays_only: fixed labels", () => {
    expect(recurrenceLabel({ type: "weekend" })).toBe("Fins de semana");
    expect(recurrenceLabel({ type: "weekdays_only" })).toBe("Dias úteis");
  });

  it("event: 'Evento' when no date, otherwise a formatted date", () => {
    expect(recurrenceLabel({ type: "event" })).toBe("Evento");
    expect(recurrenceLabel({ type: "event", eventDate: "2024-03-15" })).toContain("mar");
  });
});
