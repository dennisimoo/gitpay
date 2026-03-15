# GitPay

Autonomous GitHub contribution rewards on Solana.

GitPay watches your repositories for merged pull requests, scores them with AI, and pays contributors in SOL automatically.

## How it works

1. Connect your GitHub org via OAuth
2. GitPay installs a webhook on your repositories
3. When a PR is merged, Gemini scores it on quality and impact
4. Contributors claim their SOL reward via a unique link posted in the PR comments

## Stack

- Next.js 16 (App Router)
- PocketBase (persistence)
- Solana devnet (payouts)
- Gemini (AI scoring)
- GitHub OAuth + Webhooks
