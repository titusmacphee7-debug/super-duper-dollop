import type { Metadata } from "next";
import { AppFrame } from "@/components/wishlist/AppFrame";
import { CompareView } from "@/components/wishlist/CompareView";

export const metadata: Metadata = { title: "Compare · Workshop Buddy" };

export default function ComparePage() {
  return (
    <AppFrame active="compare">
      <CompareView />
    </AppFrame>
  );
}
