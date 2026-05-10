"use server";

import { redirect } from "next/navigation";

import { clearAuthCookie, setAuthCookie, verifyPin } from "./auth";

export async function loginWithPin(formData: FormData) {
  if (!verifyPin(formData.get("pin"))) {
    redirect("/?auth=invalid");
  }

  const didSetCookie = await setAuthCookie();

  if (!didSetCookie) {
    redirect("/?auth=missing");
  }

  redirect("/");
}

export async function logout() {
  await clearAuthCookie();
  redirect("/");
}
