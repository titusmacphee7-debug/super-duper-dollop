import { redirect } from "next/navigation";

// The app opens on the Compare (search) screen.
export default function Page() {
  redirect("/compare");
}
