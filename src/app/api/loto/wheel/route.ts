import { NextResponse } from "next/server";
import { buildWheel } from "@/lib/loto/wheeling";

export async function POST(request: Request) {
  try {
    const body = await request.json();
    const result = buildWheel({
      numbers: body.numbers,
      pick: body.pick,
      hits: body.hits,
      guarantee: body.guarantee,
    });
    return NextResponse.json(result);
  } catch (err) {
    return NextResponse.json({ error: (err as Error).message }, { status: 400 });
  }
}
