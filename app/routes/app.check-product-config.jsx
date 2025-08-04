// app/routes/app.check-product-config.jsx
import { json } from "@remix-run/node";
import { PrismaClient } from "@prisma/client";

const prisma = new PrismaClient();

export const loader = async ({ request }) => {
  const url = new URL(request.url);
  const productId = url.searchParams.get("productId");

  if (!productId) {
    return json({ hasConfig: false });
  }

  const config = await prisma.productEditorConfig.findFirst({
    where: { productId },
  });

  return json({ hasConfig: !!(config?.configurationJson) });
};
