import type { ReactNode } from "react";

export interface ToastProps {
  testId?: string;
  tone?: "neutral" | "seal" | "jade";
  children: ReactNode;
  action?: ReactNode;
}

/** Bottom-anchored notice on phones, for approval requests and payouts. Place it inside a PhoneFrame. */
export function Toast({ testId, tone = "neutral", children, action }: ToastProps) {
  return (
    <div className={`c-toast${tone !== "neutral" ? ` c-toast--${tone}` : ""}`} data-testid={testId} role="status">
      <div style={{ flex: 1 }}>{children}</div>
      {action}
    </div>
  );
}
