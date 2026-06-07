import type { Metadata } from "next";
import { AppFrame } from "@/components/wishlist/AppFrame";
import { WishlistView } from "@/components/wishlist/WishlistView";

export const metadata: Metadata = { title: "Wishlist · Workshop Buddy" };

export default function WishlistPage() {
  return (
    <AppFrame active="wishlist">
      <WishlistView />
    </AppFrame>
  );
}
