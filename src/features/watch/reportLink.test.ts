// F-watch T4: the report button finds its approval from src/mock/ or from the stored inline object.
import { describe, expect, it } from "vitest";
import type { ApprovalsState, ApprovalState } from "../../core/state";
import type { InlineApproval } from "../../core/types";
import { reportLink } from "./reportLink";

function approvals(items: ApprovalState[]): Pick<ApprovalsState, "items" | "approvalIds"> {
  return { items: Object.fromEntries(items.map((i) => [i.approvalId, i])), approvalIds: items.map((i) => i.approvalId) };
}

const inline = (subjectIds: string[], kind: InlineApproval["kind"] = "report_listing"): InlineApproval => ({
  kind,
  subjectIds,
  overLimit: false,
  proposedBy: "cindy",
  summary: { en: "Report a listing", zh: "举报商品" },
  decisionDate: "2026-10-01",
});

describe("reportLink", () => {
  it("is null before any approval is requested", () => {
    expect(reportLink("cft_01", approvals([]))).toBeNull();
  });

  it("is null while apr_03 is known but not requested", () => {
    expect(reportLink("cft_01", approvals([{ approvalId: "apr_03", status: "pending", requested: false }]))).toBeNull();
  });

  it("finds apr_03 for cft_01 through getById()", () => {
    const link = reportLink("cft_01", approvals([{ approvalId: "apr_03", status: "pending", requested: true }]));
    expect(link).toEqual({ approvalId: "apr_03", status: "pending", to: "/sell/approvals?ref=apr_03" });
  });

  it("ignores approvals of other kinds or other subjects", () => {
    const state = approvals([
      { approvalId: "apr_01", status: "pending", requested: true },
      { approvalId: "apr_04", status: "pending", requested: true },
      { approvalId: "apr_user_2", status: "pending", requested: true, approval: inline(["cft_user_9"]) },
      { approvalId: "apr_user_3", status: "pending", requested: true, approval: inline(["cft_01"], "listing_publish") },
    ]);
    expect(reportLink("cft_01", state)).toBeNull();
  });

  it("finds a person's or a live apr_user_<n> through its inline approval", () => {
    const link = reportLink("cft_user_1", approvals([{ approvalId: "apr_user_1", status: "pending", requested: true, approval: inline(["cft_user_1"]) }]));
    expect(link?.to).toBe("/sell/approvals?ref=apr_user_1");
  });

  it("carries the owner's decision", () => {
    const granted = reportLink("cft_01", approvals([{ approvalId: "apr_03", status: "granted", requested: true }]));
    expect(granted?.status).toBe("granted");
    const declined = reportLink("cft_01", approvals([{ approvalId: "apr_03", status: "declined", requested: true }]));
    expect(declined?.status).toBe("declined");
  });
});
