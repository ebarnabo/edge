import { NextResponse } from "next/server";
import { applyScanParams, getScanBase } from "@/lib/sports/scan";

export async function GET() {
  try {
    const { rows: base, fixturesUpdatedAt, oddsUpdatedAt, fromCache } = await getScanBase();
    return NextResponse.json({
      rows: base,
      fixturesUpdatedAt,
      oddsUpdatedAt,
      fromCache,
    });
  } catch (err) {
    return NextResponse.json({ error: (err as Error).message }, { status: 500 });
  }
}
