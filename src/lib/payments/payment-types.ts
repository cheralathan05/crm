export type PaymentRequestStatus =
  | "DRAFT"
  | "READY"
  | "SENT"
  | "VIEWED"
  | "PAYMENT_STARTED"
  | "PAYMENT_SUBMITTED"
  | "AWAITING_VERIFICATION"
  | "CONFIRMED"
  | "FAILED"
  | "EXPIRED"
  | "CANCELLED"
  | "REJECTED"
  | "CLARIFICATION_REQUIRED";

export type PaymentRule = "FIXED" | "PARTIAL_ALLOWED";

export type PaymentMethod =
  | "UPI"
  | "BANK_TRANSFER"
  | "CREDIT_CARD"
  | "NET_BANKING"
  | "MANUAL_VERIFICATION";

export interface CreatePaymentRequestInput {
  clientId: string;
  projectId?: string | null;
  proposalId?: string | null;
  milestoneId?: string | null;
  title: string;
  reason: string;
  amount: number;
  currency?: string;
  dueDate?: string | null;
  paymentRule?: PaymentRule;
  payeeMobile?: string | null;
  payeeUpi?: string | null;
  createdById?: string | null;
  createdByName?: string | null;
}

export interface SubmitPaymentInput {
  token: string;
  amountPaid: number;
  currency?: string;
  paymentDate?: string;
  paymentMethod: string;
  transactionRef: string;
  note?: string;
  proofPath?: string;
  proofFileName?: string;
}

export interface ConfirmPaymentInput {
  requestId: string;
  submissionId?: string;
  confirmedById?: string;
  confirmedByName?: string;
  note?: string;
}

export interface ClarificationInput {
  requestId: string;
  submissionId: string;
  prompt: string;
  adminName: string;
}

export interface RejectionInput {
  requestId: string;
  submissionId: string;
  reason: string;
  adminName: string;
}

export interface PaymentStory {
  why: {
    reason: string;
    title: string;
    milestoneName?: string;
    proposalReference?: string;
  };
  source: {
    type: "MILESTONE" | "COMMERCIAL_SCOPE" | "STANDALONE";
    reference?: string;
    agreedValue: number;
    currency: string;
  };
  request: {
    id: string;
    reference: string;
    amount: number;
    currency: string;
    status: PaymentRequestStatus;
    dueDate?: string | null;
    createdAt: string;
    tokenUrl: string;
  };
  session?: {
    id: string;
    qrPayload?: string | null;
    upiId?: string | null;
    status: string;
    expiresAt: string;
  } | null;
  submission?: {
    id: string;
    amountPaid: number;
    paymentDate: string;
    paymentMethod: string;
    transactionRef: string;
    status: string;
    proofPath?: string | null;
    submittedAt: string;
    clarificationPrompt?: string | null;
    rejectionReason?: string | null;
    note?: string | null;
  } | null;
  transaction?: {
    id: string;
    transactionNumber: string;
    amount: number;
    confirmedAt: string;
    confirmedByName: string;
    reference: string;
  } | null;
  receipt?: {
    id: string;
    receiptNumber: string;
    confirmedAt: string;
    downloadUrl: string;
  } | null;
}
