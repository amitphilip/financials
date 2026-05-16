import { loadUserConfig } from "@/app/user-config-actions";
import { SettingsForm } from "./settings-form";

export default async function SettingsPage() {
  const config = await loadUserConfig();
  if (!config) return null;

  return (
    <main className="px-4 pb-12 pt-8">
      <div className="mx-auto w-full max-w-sm">
        <h1 className="mb-6 text-xl font-semibold tracking-tight">Settings</h1>
        <SettingsForm config={config} />
      </div>
    </main>
  );
}
