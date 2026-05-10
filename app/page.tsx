import { DashboardShell } from "./dashboard-shell";
import { isAuthenticated } from "./auth";
import { getDefaultOwnRentInputs } from "./own-rent-defaults";
import { PinLoginForm } from "./pin-login-form";

type PageProps = {
  searchParams?: Promise<{
    auth?: "invalid" | "missing";
  }>;
};

export default async function Page({ searchParams }: PageProps) {
  if (!(await isAuthenticated())) {
    const params = await searchParams;

    return <PinLoginForm error={params?.auth} />;
  }

  return <DashboardShell initialOwnRentInputs={getDefaultOwnRentInputs()} />;
}
