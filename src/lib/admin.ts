import { createClient, createServiceClient } from "@/lib/supabase/server";

export async function isAdmin(): Promise<{
  isAdmin: boolean;
  userId: string | null;
}> {
  const authClient = await createClient();
  const {
    data: { user },
    error,
  } = await authClient.auth.getUser();

  if (error || !user) {
    return { isAdmin: false, userId: null };
  }

  const supabase = await createServiceClient();
  const { data: profile } = await supabase
    .from("profiles")
    .select("is_admin")
    .eq("id", user.id)
    .single();

  return {
    isAdmin: profile?.is_admin === true,
    userId: user.id,
  };
}
