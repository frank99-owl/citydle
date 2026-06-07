import { NextResponse } from "next/server";
import { generateDailyChallenge, getTodayString } from "@/lib/daily";

export const dynamic = "force-dynamic";

export async function GET() {
  const today = getTodayString();
  const challenge = generateDailyChallenge(today);
  return NextResponse.json(challenge);
}
