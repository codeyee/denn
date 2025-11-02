import { NextRequest, NextResponse } from "next/server";

import { getBackgroundCardImages } from "./lib/backgroundCards";
import { getRandomContentTypeBackgrounds } from "./lib/contentTypeBackgrounds";

export async function GET(request: NextRequest) {
  try {
    const variant = request.nextUrl.searchParams.get("variant");
    const mode = request.nextUrl.searchParams.get("mode");

    if (variant === "content-types" || mode === "content-types") {
      try {
        const contentTypeBackgrounds = getRandomContentTypeBackgrounds();
        return NextResponse.json(contentTypeBackgrounds);
      } catch (error) {
        console.error("Error loading content type backgrounds:", error);
        return NextResponse.json([]);
      }
    }

    const images = getBackgroundCardImages();
    return NextResponse.json(images);
  } catch (error) {
    console.error("Error loading background card images:", error);
    return NextResponse.json([]);
  }
}
