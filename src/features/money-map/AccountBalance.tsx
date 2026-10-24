// The studio account's balance from the latest account.synced, with its as-of date.
// Before the first sync: the studio's name and a quiet "no balance yet" line.
// Once b04-bank is live, the balance is labeled as the studio's account on Nessie.
import type { CSSProperties } from "react";
import { useCindia, type Studio } from "../../core";
import { getById } from "../../mock";
import { Money, formatDate } from "../../ui";
import { strings, t, type Lang } from "./strings";

const rootStyle: CSSProperties = {
  display: "flex",
  flexDirection: "column",
  gap: "var(--c-space-4)",
  fontFamily: "var(--c-font-body)",
  color: "var(--c-color-ink)",
  fontSize: "var(--c-text-14)",
};

const labelStyle: CSSProperties = {
  fontSize: "var(--c-text-14)",
  color: "var(--c-color-ink-soft)",
};

const amountStyle: CSSProperties = {
  fontSize: "var(--c-text-24)",
};

export function AccountBalance({ lang }: { lang: Lang }) {
  const account = useCindia((s) => (s.money.latestAccountId ? (s.money.accounts[s.money.latestAccountId] ?? null) : null));
  const live = useCindia((s) => s.sources["b04-bank"] === "live");
  const studio = getById<Studio>("std_gu");
  const studioName = studio ? t(studio.name, lang) : "";

  return (
    <div data-testid="money-map-balance" style={rootStyle}>
      <span style={labelStyle}>
        {studioName}
        {studioName ? " · " : ""}
        {t(strings.balance, lang)}
      </span>
      {account ? (
        <>
          <Money cents={account.balanceCents} style={amountStyle} />
          <span style={labelStyle}>
            {t(strings.asOf, lang)} {formatDate(account.asOf, lang)}
          </span>
        </>
      ) : (
        <span style={labelStyle}>{t(strings.noBalanceYet, lang)}</span>
      )}
      {live && (
        <span data-testid="money-map-balance-nessie" style={labelStyle}>
          {t(strings.nessieAccount, lang)}
        </span>
      )}
    </div>
  );
}
