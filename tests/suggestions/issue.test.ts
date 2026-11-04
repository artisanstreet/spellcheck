import { describe, expect, it } from "vitest";
import { Draft, Issue, Kind, Segment, accept, dismiss, segments } from "../../src/suggestions/issue.ts";

const issue = (start: number, end: number, replacements: ReadonlyArray<string> = []) =>
  new Issue({ start, end, kind: Kind.Spelling(), message: "", replacements });

describe("segments", () => {
  it("splits text around issues in reading order", () => {
    const later = issue(10, 14);
    const first = issue(2, 5);
    expect(segments("I recieved it bad.", [later, first])).toEqual([
      Segment.Plain({ text: "I " }),
      Segment.Marked({ text: "rec", issue: first }),
      Segment.Plain({ text: "ieved" }),
      Segment.Marked({ text: " it ", issue: later }),
      Segment.Plain({ text: "bad." }),
    ]);
  });

  it("returns the whole text when nothing is marked", () => {
    expect(segments("Fine.", [])).toEqual([Segment.Plain({ text: "Fine." })]);
  });
});

describe("accept", () => {
  it("replaces the word and moves later issues by the length change", () => {
    const go = issue(4, 6, ["goes"]);
    const skool = issue(10, 15, ["school"]);
    const next = accept(new Draft({ text: "She go to skool.", issues: [go, skool] }), go, "goes");
    expect(next.text).toBe("She goes to skool.");
    expect(next.issues.map((left) => next.text.slice(left.start, left.end))).toEqual(["skool"]);
  });
});

describe("dismiss", () => {
  it("drops the issue and keeps the text", () => {
    const draft = new Draft({ text: "teh", issues: [issue(0, 3)] });
    expect(dismiss(draft, draft.issues[0]!)).toEqual(new Draft({ text: "teh", issues: [] }));
  });
});
