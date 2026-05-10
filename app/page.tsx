import { DashboardShell } from "./dashboard-shell";
import { getDefaultOwnRentInputs } from "./own-rent-defaults";

export default function Page() {
  return <DashboardShell initialOwnRentInputs={getDefaultOwnRentInputs()} />;
}
