import { validateRequest } from "@/lib/auth";
import { db } from "@/lib/db";
import { snap, createSnapTransaction } from "@/lib/payments/midtrans";
import { getPlan, PlanId } from "@/lib/payments/plans";
import { NextRequest, NextResponse } from "next/server";
import { randomUUID } from "crypto";

export async function POST(request: NextRequest) {
  try {
    const { user } = await validateRequest();

    if (!user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const { planId, redirectUrl } = await request.json();

    if (!planId || !getPlan(planId as PlanId)) {
      return NextResponse.json({ error: "Paket langganan tidak valid" }, { status: 400 });
    }

    const plan = getPlan(planId as PlanId)!;
    const orderId = `SUB-${user.id}-${Date.now()}-${randomUUID().slice(0, 8)}`;

    const transaction = await createSnapTransaction({
      orderId,
      amount: plan.price,
      customerName: user.name || "Duitku User",
      customerEmail: user.email,
      itemDetails: [
        {
          id: plan.id,
          price: plan.price,
          quantity: 1,
          name: `Langganan ${plan.name}`,
        },
      ],
      redirectUrl: redirectUrl || `${process.env.NEXT_PUBLIC_APP_URL}/subscribe/success`,
    });

    await db.user.update({
      where: { id: user.id },
      data: {
        plan: "PENDING_PAYMENT",
      },
    });

    return NextResponse.json({
      snapToken: transaction.token,
      redirectUrl: transaction.redirect_url,
      orderId,
    });
  } catch (error) {
    console.error("Create subscription error:", error);
    return NextResponse.json({ error: "Gagal membuat langganan" }, { status: 500 });
  }
}