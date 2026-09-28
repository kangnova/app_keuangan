import { db } from "@/lib/db";
import { coreApi, verifySignature } from "@/lib/payments/midtrans";
import { NextRequest, NextResponse } from "next/server";

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();

    const {
      order_id,
      status_code,
      gross_amount,
      signature_key,
      transaction_status,
      fraud_status,
      settlement_time,
    } = body;

    if (!order_id || !status_code || !gross_amount || !signature_key) {
      return NextResponse.json({ error: "Invalid payload" }, { status: 400 });
    }

    const isValid = verifySignature(order_id, status_code, gross_amount, signature_key);
    if (!isValid) {
      console.error("Invalid Midtrans signature for order:", order_id);
      return NextResponse.json({ error: "Invalid signature" }, { status: 401 });
    }

    const userId = order_id.split("-")[1];
    if (!userId) {
      console.error("Cannot extract userId from order_id:", order_id);
      return NextResponse.json({ error: "Invalid order format" }, { status: 400 });
    }

    const isSuccess =
      transaction_status === "capture" ||
      transaction_status === "settlement" ||
      (transaction_status === "pending" && fraud_status === "accept");

    if (isSuccess) {
      const planId = order_id.startsWith("SUB-") ? "pro_monthly" : "pro_monthly";
      const planType = planId === "pro_yearly" ? "yearly" : "monthly";
      const monthsToAdd = planType === "yearly" ? 12 : 1;

      const subscriptionEndsAt = new Date();
      subscriptionEndsAt.setMonth(subscriptionEndsAt.getMonth() + monthsToAdd);

      await db.user.update({
        where: { id: userId },
        data: {
          plan: "PRO",
          subscriptionEndsAt,
        },
      });

      console.log(`Subscription activated for user ${userId} until ${subscriptionEndsAt}`);
    } else if (transaction_status === "deny" || transaction_status === "cancel" || transaction_status === "expire") {
      await db.user.update({
        where: { id: userId },
        data: {
          plan: "TRIAL",
        },
      });
    }

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error("Midtrans webhook error:", error);
    return NextResponse.json({ error: "Webhook processing failed" }, { status: 500 });
  }
}