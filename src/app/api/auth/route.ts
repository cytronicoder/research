import { NextRequest, NextResponse } from "next/server";

export async function GET(req: NextRequest) {
  try {
    if (req.headers.get("x-admin-key") !== process.env.ADMIN_KEY) {
      return NextResponse.json({ error: "unauthorized" }, { status: 401 });
    }

    return NextResponse.json({ authenticated: true });
  } catch (error) {
    console.error("Error in auth endpoint:", error);
    return NextResponse.json(
      { error: "authentication check failed" },
      { status: 500 }
    );
  }
}
