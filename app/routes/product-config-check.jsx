import { json } from "@remix-run/node";
import { PrismaClient } from "@prisma/client";
import { authenticate } from "../shopify.server";

const prisma = new PrismaClient();

export const loader = async ({ request }) => {
  try {
    // Validate App Proxy request from Shopify
    const { session, storefront } = await authenticate.public.appProxy(request);

    if (!session || !storefront) {
      return new Response("Unauthorized", { status: 401 });
    }

    const url = new URL(request.url);
    const productId = url.searchParams.get("productId");

    if (!productId) {
      return json({ hasConfig: false }, { status: 400 });
    }

    const config = await prisma.productEditorConfig.findFirst({
      where: { productId, shop: session.shop }, // shop from authenticated session
    });

    return json({ hasConfig: Boolean(config?.configurationJson) });
  } catch (error) {
    console.error("❌ Error in check-product-config loader:", error);
    return json({ hasConfig: false }, { status: 500 });
  }
};
