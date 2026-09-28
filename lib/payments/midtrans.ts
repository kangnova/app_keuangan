import midtransClient from "midtrans-client";
import crypto from "crypto";

export const snap = new midtransClient.Snap({
  isProduction: process.env.MIDTRANS_IS_PRODUCTION === "true",
  serverKey: process.env.MIDTRANS_SERVER_KEY!,
  clientKey: process.env.MIDTRANS_CLIENT_KEY!,
});

export const coreApi = new midtransClient.CoreApi({
  isProduction: process.env.MIDTRANS_IS_PRODUCTION === "true",
  serverKey: process.env.MIDTRANS_SERVER_KEY!,
  clientKey: process.env.MIDTRANS_CLIENT_KEY!,
});

export interface CreateTransactionParams {
  orderId: string;
  amount: number;
  customerName: string;
  customerEmail: string;
  customerPhone?: string;
  itemDetails: Array<{
    id: string;
    price: number;
    quantity: number;
    name: string;
  }>;
  redirectUrl?: string;
  callbackUrl?: string;
}

export async function createSnapTransaction(params: CreateTransactionParams) {
  const transactionParams = {
    transaction_details: {
      order_id: params.orderId,
      gross_amount: params.amount,
    },
    customer_details: {
      first_name: params.customerName,
      email: params.customerEmail,
      phone: params.customerPhone,
    },
    item_details: params.itemDetails,
    callbacks: {
      finish: params.redirectUrl,
      error: params.redirectUrl,
      pending: params.redirectUrl,
    },
    expiry: {
      start_time: new Date().toISOString().slice(0, 19).replace("T", " "),
      unit: "hours",
      duration: 24,
    },
  };

  const transaction = await snap.createTransaction(transactionParams);
  return transaction;
}

export async function getTransactionStatus(orderId: string) {
  return coreApi.transaction.status(orderId);
}

export function verifySignature(
  orderId: string,
  statusCode: string,
  grossAmount: string,
  signatureKey: string
): boolean {
  const input = `${orderId}${statusCode}${grossAmount}${process.env.MIDTRANS_SERVER_KEY}`;
  const hash = crypto.createHash("sha512").update(input).digest("hex");
  return hash === signatureKey;
}