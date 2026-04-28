import { NextResponse } from "next/server";

export function GET() {
  const googleConfigured = !!(
    process.env.GOOGLE_CLIENT_ID && process.env.GOOGLE_CLIENT_SECRET
  );
  return NextResponse.json({ google: googleConfigured });
}
