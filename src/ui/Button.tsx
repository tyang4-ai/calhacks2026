import type { ButtonHTMLAttributes, ReactNode } from "react";

export interface ButtonProps extends Omit<ButtonHTMLAttributes<HTMLButtonElement>, "className"> {
  testId?: string;
  /** primary: ink fill. quiet: ink text, line border. seal: the one urgent action per screen. */
  variant?: "primary" | "quiet" | "seal";
  size?: "normal" | "small";
  className?: string;
  children?: ReactNode;
}

export function Button({ testId, variant = "primary", size = "normal", className, type = "button", children, ...rest }: ButtonProps) {
  return (
    <button
      {...rest}
      type={type}
      data-testid={testId}
      className={`c-button c-button--${variant}${size === "small" ? " c-button--small" : ""}${className ? ` ${className}` : ""}`}
    >
      {children}
    </button>
  );
}
