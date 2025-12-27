import type { Metadata } from "next";
import { getProductBySlug, products } from "@/utils/productData";

type Props = {
  params: Promise<{ slug: string }>;
};

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const { slug } = await params;
  const product = getProductBySlug(slug);

  if (!product) {
    return {
      title: "Product Not Found | Miguel Ferraz Guedes",
      description: "The product you're looking for doesn't exist or has been removed.",
    };
  }

  return {
    title: `${product.name} - ${product.collection} | Miguel Ferraz Guedes`,
    description: `${product.name} from the ${product.collection} collection by Miguel Ferraz Guedes. ${product.description}. Price: ${product.price}.`,
    openGraph: {
      title: `${product.name} - ${product.collection} | Miguel Ferraz Guedes`,
      description: `${product.name} from the ${product.collection} collection by Miguel Ferraz Guedes. ${product.description}. Price: ${product.price}.`,
      url: `https://miguelfguedes.pt/product/${slug}`,
      type: "website",
      images: [
        {
          url: product.imageUrl,
          alt: `${product.name} artwork by Miguel Ferraz Guedes`,
        },
      ],
    },
    alternates: {
      canonical: `https://miguelfguedes.pt/product/${slug}`,
    },
  };
}

export async function generateStaticParams() {
  return products.map((product) => ({
    slug: product.slug,
  }));
}

export default function ProductLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return children;
}
