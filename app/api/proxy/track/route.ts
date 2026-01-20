import { NextRequest, NextResponse } from "next/server";

const TRACKER_BACKEND = "https://sighlike-kenton-unrefinedly.ngrok-free.dev";

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    
    // Forward the request to the Python backend
    const response = await fetch(`${TRACKER_BACKEND}/api/track/sea`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify(body),
    });

    const data = await response.json();
    return NextResponse.json(data, { status: response.status });

  } catch (error) {
    console.error("Tracker Proxy Error:", error);
    return NextResponse.json(
      { status: "Error", message: "Failed to connect to tracking service" },
      { status: 500 }
    );
  }
}
