// Entities from docs/common/data-model.md. Money is integer cents, rates are basis points,
// dates are ISO "YYYY-MM-DD" strings.

export interface Text {
  en: string;
  zh: string;
}

export type Lang = "en" | "zh";

// ID string types. Each is a plain string with a fixed prefix, documented here.
export type StudioId = string; // "std_gu"
export type PersonId = string; // "own_01", "mkr_01".."mkr_03", "buy_01".."buy_20"
export type MakerId = string; // "mkr_01".."mkr_03"
export type BuyerId = string; // "buy_01".."buy_20"
export type OwnerId = string; // "own_01"
export type PieceId = string; // "pc_01".."pc_12"
export type ChannelId = "ch_cindia" | "ch_site" | "ch_gallery";
export type ContractId = string; // "ctr_gallery_01"
export type OrderId = string; // "ord_001".."ord_030"
export type ChannelPayoutId = string; // "pay_001" onward
export type RefundId = string; // "rfd_001"
export type StatementId = string; // "stm_gallery_2026_09"
export type PurchaseId = string; // "pur_001" onward
export type BankTxnId = string; // "txn_001" onward
export type MatchId = string; // "mat_001" onward
export type FlagId = string; // "flg_01"
export type MakerPayoutId = string; // "mpo_01".."mpo_03"
export type ApprovalId = string; // "apr_01", "apr_02"
export type FollowUpId = string; // "fup_01"
export type LedgerEntryId = string; // "led_0001" onward
export type MakerStatementId = string; // "mst_01".."mst_03"
export type PlantedErrorId = string; // "err_01".."err_04"
export type ImpactId = string; // "imp_2026_09"
export type MonthId = string; // "2026-09"
export type MoveId = string; // "mv_0001" onward, events only
export type AccountId = string; // "acct_studio", events only
export type ActId = string; // "act_0001" onward, events only
export type QuestionId = string; // "ask_01".."ask_03", "ask_user_1" onward
export type ScenarioId = string; // "scn_01"
export type IsoDate = string;

export interface Studio {
  id: StudioId;
  name: Text;
  craft: Text;
  city: Text;
  ownerId: OwnerId;
  makerIds: MakerId[];
  payoutLimitCents: number;
  nessieAccountId?: string;
}

export interface Person {
  id: PersonId;
  role: "owner" | "maker" | "buyer";
  name: Text;
  surnameChar: string;
  lang: "zh" | "en";
}

export interface ProcessStep {
  step: Text;
  hours: number;
}

export interface Piece {
  id: PieceId;
  title: Text;
  makerId: MakerId;
  kind: "featured" | "series";
  hours: number;
  materialsCents: number;
  priceCents: number;
  story: Text;
  heritage: Text;
  process: ProcessStep[];
  image: string;
}

export interface Channel {
  id: ChannelId;
  name: Text;
  kind: "marketplace" | "own_site" | "consignment";
}

export interface Contract {
  id: ContractId;
  channelId: "ch_gallery";
  commissionBps: number;
  statementDay: number;
  signedDate: IsoDate;
  terms: Text;
}

export interface Order {
  id: OrderId;
  channelId: ChannelId;
  pieceId: PieceId;
  buyerId: BuyerId;
  date: IsoDate;
  grossCents: number;
  cardFeeCents: number;
  platformFeeCents: number;
  commissionCents: number;
  materialsCents: number;
  makerShareCents: number;
  status: "paid" | "refunded";
}

export interface ChannelPayout {
  id: ChannelPayoutId;
  channelId: ChannelId;
  date: IsoDate;
  grossCents: number;
  feesCents: number;
  refundCents: number;
  netCents: number;
  orderIds: OrderId[];
  refundIds: RefundId[];
  monthId: MonthId;
}

export interface Refund {
  id: RefundId;
  orderId: OrderId;
  date: IsoDate;
  amountCents: number;
  nettedInPayoutId: ChannelPayoutId;
}

export interface StatementLine {
  orderId: OrderId;
  pieceId: PieceId;
  saleCents: number;
  commissionBps: number;
  commissionCents: number;
  netCents: number;
}

export interface Statement {
  id: StatementId;
  channelId: ChannelId;
  monthId: MonthId;
  issuedDate: IsoDate;
  lines: StatementLine[];
  totalSaleCents: number;
  totalCommissionCents: number;
  totalNetCents: number;
}

export interface Purchase {
  id: PurchaseId;
  date: IsoDate;
  supplier: Text;
  amountCents: number;
  memo: string;
  txnId: BankTxnId;
}

export interface BankTxn {
  id: BankTxnId;
  date: IsoDate;
  direction: "in" | "out";
  amountCents: number;
  counterparty: Text;
  memo: string;
  refId: string;
  nessieId?: string;
}

export type MatchKind = "one_to_one" | "bundled" | "refund_netted" | "carried_over";

export interface Match {
  id: MatchId;
  kind: MatchKind;
  recordIds: string[];
  monthId: MonthId;
}

export type FlagKind = "short_payment";

export interface Flag {
  id: FlagId;
  kind: FlagKind;
  recordIds: [ContractId, StatementId, BankTxnId];
  expectedCents: number;
  actualCents: number;
  deltaCents: number;
  trustRecordId: string;
  explanation: Text;
}

export type MakerPayoutStatus = "proposed" | "approved" | "sent" | "held";

export interface MakerPayout {
  id: MakerPayoutId;
  makerId: MakerId;
  monthId: MonthId;
  amountCents: number;
  orderIds: OrderId[];
  heldCents: number;
  status: MakerPayoutStatus;
}

export type ApprovalStatus = "pending" | "granted" | "declined";

export interface Approval {
  id: ApprovalId;
  kind: "follow_up" | "maker_payouts";
  subjectIds: string[];
  proposedBy: "cindy";
  amountCents?: number;
  overLimit: boolean;
  decisionDate: IsoDate;
  status: ApprovalStatus;
}

export interface FollowUp {
  id: FollowUpId;
  approvalId: ApprovalId;
  to: Text;
  subject: Text;
  body: Text;
}

export type LedgerAccount =
  | "cash"
  | "sales_cindia"
  | "sales_site"
  | "sales_gallery"
  | "card_fees"
  | "platform_fees"
  | "gallery_commission"
  | "materials"
  | "maker_pay"
  | "receivable_gallery"
  | "refunds";

export interface LedgerEntry {
  id: LedgerEntryId;
  date: IsoDate;
  account: LedgerAccount;
  debitCents: number;
  creditCents: number;
  refId: string;
  memo: string;
}

export interface MakerStatementLine {
  orderId: OrderId;
  pieceId: PieceId;
  makerShareCents: number;
}

export interface MakerStatement {
  id: MakerStatementId;
  makerId: MakerId;
  monthId: MonthId;
  lines: MakerStatementLine[];
  totalCents: number;
  heldCents: number;
  payoutDate: IsoDate;
}

export type PlantedErrorKind = "short_payment" | "bundled" | "refund_netted" | "carried_over";

export interface PlantedError {
  id: PlantedErrorId;
  kind: PlantedErrorKind;
  recordIds: string[];
  expected: Record<string, unknown>;
}

export interface Impact {
  id: ImpactId;
  makerShareBps: number;
  daysCloseToPayout: number;
  daysCloseToPayoutBefore: number;
  bookkeepingHoursSaved: number;
  estimate: true;
}
