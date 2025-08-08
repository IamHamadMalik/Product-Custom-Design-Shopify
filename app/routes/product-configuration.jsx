import { json } from "@remix-run/node";
import { prisma } from "../db.server";

// Public GET endpoint for product configuration
export async function loader({ request }) {
  try {
    const url = new URL(request.url);
    const productId = url.searchParams.get("productId");
    const shop = url.searchParams.get("shop");

    if (!productId || !shop) {
      return json({ error: "Missing productId or shop" }, { status: 400 });
    }

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
