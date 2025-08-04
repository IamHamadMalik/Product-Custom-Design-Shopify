
import { json } from "@remix-run/node";
import { PrismaClient } from "@prisma/client";

const prisma = new PrismaClient();

export const loader = async ({ request }) => {
  const url = new URL(request.url);
  const productId = url.searchParams.get("productId");

  console.log("🔍 Storefront: checking config for productId:", productId);

  if (!productId) {
    return json({ hasConfig: false });
  }

  // Find config in your DB (numeric ID only!)
  const config = await prisma.productEditorConfig.findFirst({
    where: { productId: productId },
  });

  return json({ hasConfig: !!config });
};