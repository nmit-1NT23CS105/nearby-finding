import type { Metadata } from "next";
import { NearbyFinder } from "@/components/nearby/nearby-finder";

type HomePageProps = {
  searchParams: Promise<Record<string, string | string[] | undefined>>;
};

function pickParam(value: string | string[] | undefined) {
  if (Array.isArray(value)) {
    return value[0];
  }
  return value;
}

export async function generateMetadata({ searchParams }: HomePageProps): Promise<Metadata> {
  const resolvedParams = await searchParams;
  const query = pickParam(resolvedParams.q);
  const radius = pickParam(resolvedParams.radius);

  if (!query) {
    return {
      title: "Nearby Finder | Search Places by Radius",
      description:
        "Discover nearby places with dynamic radius, category filters, real-time open status, and map/list/split views."
    };
  }

  const radiusText = radius ? `${radius}km` : "custom radius";
  return {
    title: `${query} Nearby Search`,
    description: `Find top nearby places around ${query} within ${radiusText}, including travel times, ratings, and open-now filtering.`
  };
}

export default function HomePage() {
  return <NearbyFinder />;
}
