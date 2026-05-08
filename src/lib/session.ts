import { getServerSession } from "next-auth";
import { authOptions } from "./auth";

export async function getTenantId(): Promise<string> {
  const session = await getServerSession(authOptions);
  if (!session?.user) throw new Error("Não autenticado");
  return (session.user as { id: string }).id;
}

export async function getSession() {
  return getServerSession(authOptions);
}
