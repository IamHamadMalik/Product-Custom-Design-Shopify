import { json, redirect } from "@remix-run/node";
import { useLoaderData } from "@remix-run/react";
import { authenticate } from "../shopify.server";
import {
  Page,
  Card,
  DataTable,
  Text,
  BlockStack,
  InlineStack,
  Thumbnail,
  Button,
} from "@shopify/polaris";
import { PrismaClient } from "@prisma/client";

const prisma = new PrismaClient();

const CONFIG_FIELDS = [
  { label: "Restrict Add Element", value: "restrictAddElement" },
  { label: "Restrict Text Size", value: "restrictTextSize" },
  { label: "Restrict Text Color", value: "restrictTextColor" },
  { label: "Restrict Text Rotation", value: "restrictTextRotation" },
  { label: "Restrict Text Position", value: "restrictTextPosition" },
  { label: "Restrict Text Font", value: "restrictTextFont" },
  { label: "Restrict Image Rotation", value: "restrictImageRotation" },
  { label: "Restrict Image Position", value: "restrictImagePosition" },
  { label: "Configuration JSON", value: "configurationJson" },
];

/** ------------------ LOADER ------------------ **/
export const loader = async ({ request }) => {
  const { admin, session } = await authenticate.admin(request);

  // Fetch all configurations for the shop
  const configs = await prisma.productEditorConfig.findMany({
    where: {
      shop: session.shop,
    },
  });

  // If no configurations exist, return empty
  if (configs.length === 0) {
    return json({
      products: [],
      configs: [],
      shop: session.shop,
    });
  }

  // Fetch product details for all configured products
  const productIds = configs.map(config => config.productId);
  const nodesResponse = await admin.graphql(`
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
  `, { variables: { ids: productIds } });

  const nodesData = await nodesResponse.json();
  const products = nodesData.data.nodes.filter(Boolean);

  return json({
    products,
    configs,
    shop: session.shop,
  });
};

/** ------------------ COMPONENT ------------------ **/
export default function ProductsWithConfigs() {
  const { products, configs } = useLoaderData();

  // Prepare table rows
  const rows = products.map(product => {
    const config = configs.find(c => c.productId === product.id) || {};
    return [
      <InlineStack gap="200" align="start" blockAlign="center">
        <Thumbnail
          source={product.featuredImage?.url || ""}
          alt={product.featuredImage?.altText || product.title}
          size="small"
        />
        <Text variant="bodyMd" fontWeight="medium">{product.title}</Text>
      </InlineStack>,
      ...CONFIG_FIELDS.map(field => (
        <Text key={`${product.id}-${field.value}`} as="span">
          {field.value === "configurationJson"
            ? JSON.stringify(config[field.value] || "N/A")
            : config[field.value]?.toString() || "N/A"}
        </Text>
      )),
      <Button
        variant="primary"
        onClick={() => window.location.href = `/app/bulk-editor-config?ids=${product.id}`}
      >
        Edit
      </Button>,
    ];
  });

  return (
    <Page title="Products with Custom Configurations">
      <BlockStack gap="400">
        <Card>
          {rows.length === 0 ? (
            <Text variant="bodyMd" as="p">
              No products with custom configurations found.
            </Text>
          ) : (
            <DataTable
              columnContentTypes={[
                "text",
                ...CONFIG_FIELDS.map(() => "text"),
                "text",
              ]}
              headings={[
                <Text variant="headingSm" as="h3">Product</Text>,
                ...CONFIG_FIELDS.map(field => (
                  <Text key={field.value} variant="headingSm" as="h3">
                    {field.label}
                  </Text>
                )),
                <Text variant="headingSm" as="h3">Actions</Text>,
              ]}
              rows={rows}
            />
          )}
        </Card>
      </BlockStack>
    </Page>
  );
}