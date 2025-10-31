import { NextRequest, NextResponse } from "next/server";

import { getBackgroundCardImages } from "./lib/backgroundCards";
import { getRandomContentTypeBackgrounds } from "./lib/contentTypeBackgrounds";

export async function GET(request: NextRequest) {
  try {
    const variant = request.nextUrl.searchParams.get("variant");
    const mode = request.nextUrl.searchParams.get("mode");

    if (variant === "content-types" || mode === "content-types") {
      const contentTypeBackgrounds = getRandomContentTypeBackgrounds();
      return NextResponse.json(contentTypeBackgrounds);
    }

    const images = getBackgroundCardImages();
    return NextResponse.json(images);
  } catch (error) {
    console.error("Error loading background card images:", error);
    return NextResponse.json([], { status: 500 });
  }
}
