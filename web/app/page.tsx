import { HomeRouteShell } from "@/app/_components/routes/HomeRouteShell";
import { resolveSession, getServerCountryCode } from "@/lib/auth/session-server";
import { getHomePageData } from "@/lib/server/home";

export default async function Home() {
  const session = await resolveSession();
  const country = await getServerCountryCode();
  const initialData = await getHomePageData(session, country);

  return (
    <HomeRouteShell
      session={session}
      initialData={initialData}
    />
  );
}
