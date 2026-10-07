import { redirect } from "next/navigation";

export default async function MatchesPage({
  searchParams,
}: {
  searchParams: Promise<Record<string, string | string[] | undefined>>;
}) {
  const params = await searchParams;
  const queryString = new URLSearchParams();
  Object.entries(params).forEach(([key, val]) => {
    if (typeof val === "string") queryString.set(key, val);
    else if (Array.isArray(val)) val.forEach((v) => queryString.append(key, v));
  });

  const query = queryString.toString();
  redirect(query ? `/sessions?${query}` : "/sessions");
}
