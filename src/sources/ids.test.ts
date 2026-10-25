import { describe, expect, it } from "vitest";
import { player } from "../core/player";
import { answerId, liveIdStart, pageTag } from "./ids";

describe("pageTag", () => {
  it("is 6 lowercase letters or digits, the same on every call", () => {
    const first = pageTag();
    expect(first).toMatch(/^[a-z0-9]{6}$/);
    expect(pageTag()).toBe(first);
  });
});

describe("answerId", () => {
  it("hands out a new number per call in one epoch, per prefix", () => {
    player.reset();
    const a = answerId("run");
    const b = answerId("run");
    expect(a).toBe("run_user_1");
    expect(b).toBe("run_user_2");
    expect(a).not.toBe(b);
    // Each prefix counts on its own.
    expect(answerId("stp")).toBe("stp_user_1");
    expect(answerId("run")).toBe("run_user_3");
  });

  it("starts over at 1 after a player reset or seek", () => {
    player.reset();
    expect(answerId("run")).toBe("run_user_1");
    player.reset();
    expect(answerId("run")).toBe("run_user_1");
    player.seek(0);
    expect(answerId("run")).toBe("run_user_1");
  });

  it("follows the epoch it is given, for a responder with its own player", () => {
    expect(answerId("apr", 9001)).toBe("apr_user_1");
    expect(answerId("apr", 9001)).toBe("apr_user_2");
    expect(answerId("apr", 9002)).toBe("apr_user_1");
  });
});

describe("liveIdStart", () => {
  it("reserves a block of numbers and never starts over within the page", () => {
    expect(liveIdStart("blk", 5)).toBe(1);
    expect(liveIdStart("blk", 3)).toBe(6);
    player.reset();
    expect(liveIdStart("blk", 1)).toBe(9);
    // At least one number is always reserved.
    expect(liveIdStart("blk", 0)).toBe(10);
    expect(liveIdStart("blk", 2)).toBe(11);
    expect(liveIdStart("chk", 4)).toBe(1);
  });
});
