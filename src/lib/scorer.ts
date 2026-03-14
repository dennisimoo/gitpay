import Replicate from "replicate";

export interface ScoreResult {
  score: number;
  reasoning: string;
  category: "bug_fix" | "feature" | "review" | "documentation" | "trivial";
}

const replicate = new Replicate({ auth: process.env.REPLICATE_API_TOKEN });

export async function scorePR(pr: {
  title: string;
  body: string;
  additions: number;
  deletions: number;
  changedFiles: number;
  files: Array<{ filename: string; additions: number; deletions: number; patch: string }>;
  diff: string;
}): Promise<ScoreResult> {
  const prompt = `You are a senior open source maintainer. Score this pull request contribution.

PR Title: ${pr.title}
PR Description: ${pr.body?.slice(0, 600) || "(none)"}
Stats: +${pr.additions} -${pr.deletions} lines across ${pr.changedFiles} files

Files changed:
${pr.files.slice(0, 10).map((f) => `- ${f.filename} (+${f.additions}/-${f.deletions})`).join("\n")}

Diff preview:
${pr.diff.slice(0, 3000)}

Scoring guide:
- trivial (0-15): typo, whitespace, minor formatting
- documentation (10-30): docs, comments, README
- review/minor (15-40): small fixes, config changes
- bug_fix (25-70): real bug fixes
- feature (35-100): new functionality, significant refactors

Respond with ONLY this JSON (no markdown, no code fences):
{"score": <0-100>, "reasoning": "<1 clear sentence about what this does and why it's valuable>", "category": "<bug_fix|feature|review|documentation|trivial>"}`;

  for (let attempt = 0; attempt < 3; attempt++) {
    try {
      const output = await replicate.run("google/gemini-3-flash", {
        input: {
          prompt,
          temperature: 0.2,
          thinking_level: "low",
          max_output_tokens: 300,
        },
      });

      let text = Array.isArray(output) ? output.join("") : String(output);
      text = text.replace(/```json\n?/g, "").replace(/```\n?/g, "").trim();
      const match = text.match(/\{[\s\S]*\}/);
      if (match) text = match[0];

      const result = JSON.parse(text) as ScoreResult;
      if (typeof result.score === "number" && result.reasoning && result.category) {
        return {
          score: Math.max(0, Math.min(100, Math.round(result.score))),
          reasoning: result.reasoning,
          category: result.category,
        };
      }
    } catch {
      if (attempt === 2) break;
    }
  }

  return { score: 20, reasoning: "Contribution reviewed — scoring unavailable.", category: "trivial" };
}
