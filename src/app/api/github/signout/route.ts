import { NextRequest, NextResponse } from "next/server";
import { getSessionId } from "@/lib/session";
import { kvSet, getConnectedRepos, removeConnectedRepo } from "@/lib/store";
import { getOrigin } from "@/lib/origin";

export async function POST(req: NextRequest) {
  const sid = getSessionId(req);
  const origin = getOrigin(req);

  if (sid) {
    await kvSet(`github_token:${sid}`, "");
    const repos = await getConnectedRepos(sid);
    for (const repo of repos) await removeConnectedRepo(repo, sid);
  }

  const res = NextResponse.redirect(`${origin}/setup`);
  res.cookies.set("gp_sid", "", { maxAge: 0, path: "/" });
  return res;
}
