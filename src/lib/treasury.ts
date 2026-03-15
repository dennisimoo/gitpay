import {
  Connection,
  Keypair,
  PublicKey,
  SystemProgram,
  Transaction,
  sendAndConfirmTransaction,
  LAMPORTS_PER_SOL,
} from "@solana/web3.js";

const RPC_URL = process.env.SOLANA_RPC_URL || "https://api.devnet.solana.com";
const EXPLORER_BASE = process.env.SOLANA_EXPLORER_BASE || "https://explorer.solana.com/tx";
const CLUSTER_PARAM = process.env.SOLANA_CLUSTER_PARAM || "?cluster=devnet";

function getConnection() {
  return new Connection(RPC_URL, "confirmed");
}

function getKeypair(): Keypair {
  const pk = process.env.TREASURY_PRIVATE_KEY;
  if (!pk) throw new Error("TREASURY_PRIVATE_KEY not set");
  return Keypair.fromSecretKey(Uint8Array.from(JSON.parse(pk) as number[]));
}

export function isPayoutsEnabled(): boolean {
  return !!process.env.TREASURY_PRIVATE_KEY;
}

export async function getTreasuryBalance(): Promise<string> {
  try {
    const connection = getConnection();
    const keypair = getKeypair();
    const address = process.env.TREASURY_ADDRESS ? new PublicKey(process.env.TREASURY_ADDRESS) : keypair.publicKey;
    const balance = await connection.getBalance(address);
    return (balance / LAMPORTS_PER_SOL).toFixed(4);
  } catch {
    return "0.0000";
  }
}

export async function executePayout(toAddress: string, amountSol: string): Promise<string> {
  const connection = getConnection();
  const keypair = getKeypair();
  const tx = new Transaction().add(
    SystemProgram.transfer({
      fromPubkey: keypair.publicKey,
      toPubkey: new PublicKey(toAddress),
      lamports: Math.floor(parseFloat(amountSol) * LAMPORTS_PER_SOL),
    })
  );
  return await sendAndConfirmTransaction(connection, tx, [keypair]);
}

export { EXPLORER_BASE, CLUSTER_PARAM };
