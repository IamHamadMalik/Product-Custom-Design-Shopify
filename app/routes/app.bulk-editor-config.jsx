import { json, redirect } from "@remix-run/node";
import { useLoaderData, Form } from "@remix-run/react";
import { authenticate } from "../shopify.server";
import {
  Page,
  Card,
  Text,
  BlockStack,
  InlineStack,
  Thumbnail,
  Button,
  Modal,
} from "@shopify/polaris";
import { PrismaClient } from "@prisma/client";
import { useState, useEffect } from "react";

const prisma = new PrismaClient();

/** ------------------ LOADER ------------------ **/
export const loader = async ({ request }) => {
  const { admin } = await authenticate.admin(request);
  const url = new URL(request.url);
  const ids = url.searchParams.get("ids")?.split(",") || [];

  if (ids.length === 0) {
    return redirect("/app/all-products");
  }

  const nodesResponse = await admin.graphql(
    `
    query getProducts($ids: [ID!]!) {
      nodes(ids: $ids) {
        ... on Product {
          id
          title
          featuredImage {
            url
            altText
          }
        }
      }
    }
    `,
    { variables: { ids } }
  );

  const nodesData = await nodesResponse.json();
  const products = nodesData.data.nodes.filter(Boolean);

  const configs = await prisma.productEditorConfig.findMany({
    where: {
      productId: {
        in: ids.map((gid) =>
          gid.replace("gid://shopify/Product/", "")
        ),
      },
    },
  });

  return json({ products, configs });
};

/** ------------------ ACTION ------------------ **/
export const action = async ({ request }) => {
  const { session } = await authenticate.admin(request);
  const formData = await request.formData();

  const configsRaw = formData.getAll("configs");
  console.log("✅ Received configs array:", configsRaw);

  let configs = [];
  for (const configString of configsRaw) {
    try {
      const parsed = JSON.parse(configString);
      configs.push(parsed);
    } catch (err) {
      console.error("❌ Failed to parse JSON:", configString);
    }
  }

  for (const config of configs) {
    console.log("🔍 Upserting config:", config);
    await prisma.productEditorConfig.upsert({
      where: { productId: config.productId },
      update: {
        configurationJson: config.configurationJson || null,
      },
      create: {
        productId: config.productId,
        shop: process.env.SHOP, // Replace with your dynamic shop if needed
        configurationJson: config.configurationJson || null,
      },
    });
  }

  return redirect(`/app/all-products?success=1`);
};

/** ------------------ COMPONENT ------------------ **/
export default function BulkEditorConfig() {
  const { products } = useLoaderData();
  const [activeModal, setActiveModal] = useState(null);

  const openModal = (productId) => {
    setActiveModal(productId);
  };

  const closeModal = () => {
    setActiveModal(null);
  };

  useEffect(() => {
    const listener = (event) => {
      if (event.data && event.data.type === "DESIGN_STATE") {
        console.log("🟢 Received DESIGN_STATE:", event.data);
        const designState = event.data.data;

        let productId = activeModal;
        if (productId.startsWith("gid://shopify/Product/")) {
          productId = productId.replace("gid://shopify/Product/", "");
        }

        const textarea = document.getElementById(`customization-${productId}`);

        if (textarea) {
          const payload = JSON.stringify({
            productId: productId,
            configurationJson: designState,
          });
          console.log("✏️ Saving to textarea:", payload);
          textarea.value = payload;
        } else {
          console.error("❌ Textarea not found for product:", productId);
        }
      }
    };

    window.addEventListener("message", listener);
    return () => window.removeEventListener("message", listener);
  }, [activeModal]);

  return (
    <Page
      title="Bulk Product Configuration"
      backAction={{ content: "Back", url: "/app/all-products" }}
    >
      <Form method="POST">
        <BlockStack gap="500">
          {products.map((product) => {
            const numericId = product.id.replace(
              "gid://shopify/Product/",
              ""
            );

            return (
              <Card key={product.id} padding="400">
                <BlockStack gap="400">
                  <InlineStack
                    gap="300"
                    align="start"
                    blockAlign="center"
                  >
                    <Thumbnail
                      source={product.featuredImage?.url || ""}
                      alt={
                        product.featuredImage?.altText ||
                        product.title
                      }
                      size="medium"
                    />
                    <Text variant="headingMd" as="h2">
                      {product.title}
                    </Text>
                  </InlineStack>

                  <Button
                    variant="secondary"
                    onClick={() => openModal(product.id)}
                  >
                    Open Product Configuration
                  </Button>

                  {/* Hidden textarea for this product */}
                  <textarea
                    style={{ display: "none" }}
                    name="configs"
                    id={`customization-${numericId}`}
                    rows="5"
                  ></textarea>

                  <Modal
                    open={activeModal === product.id}
                    onClose={closeModal}
                    title={`Configuration for ${product.title}`}
                  >
                    <Modal.Section>
                      <iframe
                        src={`https://v0-archive-two-inky.vercel.app?admin=true`}
                        style={{
                          width: "100%",
                          height: "600px",
                          border: "none",
                        }}
                        title={`Configuration for ${product.title}`}
                        id={`iframe-${product.id}`}
                      />
                      <div style={{ marginTop: "1rem" }}>
                        <Button onClick={closeModal}>Close</Button>
                      </div>
                    </Modal.Section>
                  </Modal>
                </BlockStack>
              </Card>
            );
          })}
        </BlockStack>

        <div style={{ marginTop: "2rem" }}>
          <Button submit primary>
            Save All Configurations
          </Button>
        </div>
      </Form>
    </Page>
  );
}
