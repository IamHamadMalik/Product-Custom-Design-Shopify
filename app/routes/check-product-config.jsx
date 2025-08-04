// app/routes/check-product-config.js
import { json } from "@remix-run/node";
import { PrismaClient } from "@prisma/client";
import { authenticate } from "../shopify.server";

const prisma = new PrismaClient();

export const loader = async ({ request }) => {
  // Authenticate the app proxy request
  const { session, storefront } = await authenticate.public.appProxy(request);
  if (!session || !storefront) {
    return new Response("Unauthorized", { status: 401 });
  }

  const url = new URL(request.url);
  const productId = url.searchParams.get("productId");

  if (!productId) {
    return json({ hasConfig: false }, { status: 400 });
  }

  try {
    const config = await prisma.productEditorConfig.findFirst({
      where: { productId },
    });

    return json({ hasConfig: !!(config?.configurationJson) });
  } catch (error) {
    console.error("❌ Error fetching product config:", error);
    return json({ hasConfig: false }, { status: 500 });
  }
};