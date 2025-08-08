import { json } from "@remix-run/node";
import { PrismaClient } from "@prisma/client";

const prisma = new PrismaClient();

export const loader = async ({ request }) => {
  try {
    // Allow CORS from any origin
    const headers = {
      "Access-Control-Allow-Origin": "*",
      "Access-Control-Allow-Methods": "GET, OPTIONS",
      "Access-Control-Allow-Headers": "Content-Type",
    };

    // Handle OPTIONS preflight request
    if (request.method === "OPTIONS") {
      return new Response(null, { status: 204, headers });
    }

    const url = new URL(request.url);
    const productId = url.searchParams.get("productId");

    if (!productId) {
      return json({ hasConfig: false }, { status: 400, headers });
    }

    // Shop name from .env
    const shop = process.env.SHOP;

    const config = await prisma.productEditorConfig.findFirst({
      where: { productId, shop },
    });

    return json(
      { hasConfig: Boolean(config?.configurationJson) },
      { status: 200, headers }
    );
  } catch (error) {
    console.error("❌ Error in check-product-config loader:", error);
    return json(
      { hasConfig: false },
      { status: 500, headers: { "Access-Control-Allow-Origin": "*" } }
    );
  }
};
