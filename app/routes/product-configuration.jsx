import { json } from "@remix-run/node";
import { PrismaClient } from "@prisma/client";

const prisma = new PrismaClient();

// Public GET endpoint for product configuration
export async function loader({ request }) {
  try {
    const url = new URL(request.url);
    const productId = url.searchParams.get("productId");

    if (!productId) {
      return json({ error: "Missing productId" }, { status: 400 });
    }
    const shop = process.env.SHOP;

    const config = await prisma.productEditorConfig.findFirst({
      where: { productId, shop },
    });

    return json({
      success: true,
      configurationJson: config ? config.configurationJson : null,
    });
  } catch (err) {
    console.error("Error fetching product config:", err);
    return json({ error: "Internal server error" }, { status: 500 });
  }
}
