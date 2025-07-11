// /api/interval.ts
import type { VercelRequest, VercelResponse } from '@vercel/node';
import axios from 'axios';

interface Transaction {
    signature: string[];
    blockTime: number;
    changeAmount: number;
    owner: string;
}

interface SolscanTransferResponse {
    data: Transaction[];
    total: number;
}

/**
 * Fetches wallets active within a specific time range.
 * @param tokenAddress The SPL token address.
 * @param from The start of the time range (Unix timestamp).
 * @param to The end of the time range (Unix timestamp).
 * @returns A promise that resolves to an array of active wallet data.
 */
async function fetchActiveWallets(tokenAddress: string, from: number, to: number) {
    const SOLSCAN_API_KEY = process.env.VITE_SOLSCAN_PRO_API_KEY;
    if (!SOLSCAN_API_KEY) {
        throw new Error("Solscan API key is not configured.");
    }

    const activeWallets = new Map<string, { lastTx: number }>();
    let offset = 0;
    const pageSize = 50;
    let continueFetching = true;

    while (continueFetching) {
        try {
            const response = await axios.get<SolscanTransferResponse>(`https://pro-api.solscan.io/v2.0/token/transfer`, {
                headers: { 'token': SOLSCAN_API_KEY },
                params: {
                    token: tokenAddress,
                    offset: offset,
                    size: pageSize,
                    type: 'transfer'
                }
            });

            if (!response.data || response.data.data.length === 0) {
                break;
            }

            for (const tx of response.data.data) {
                // Stop fetching if we've gone past the 'from' timestamp
                if (tx.blockTime < from) {
                    continueFetching = false;
                    break;
                }

                if (tx.blockTime <= to && tx.blockTime >= from) {
                    if (!activeWallets.has(tx.owner) || tx.blockTime > activeWallets.get(tx.owner)!.lastTx) {
                       activeWallets.set(tx.owner, { lastTx: tx.blockTime });
                    }
                }
            }
            
            offset += pageSize;
            if ((offset) >= response.data.total) {
                break;
            }

        } catch (error) {
            console.error('Error fetching transfers from Solscan:', error);
            throw new Error('Failed to fetch transfer data from Solscan.');
        }
    }

    return Array.from(activeWallets.entries()).map(([wallet, data]) => ({
        wallet,
        lastTx: data.lastTx,
    }));
}


export default async function handler(req: VercelRequest, res: VercelResponse) {
    const { token, from, to } = req.query;

    if (!token || typeof token !== 'string') {
        return res.status(400).json({ error: 'Token address is required.' });
    }
    if (!from || !to) {
        return res.status(400).json({ error: 'A time range (from, to) is required.' });
    }

    try {
        const wallets = await fetchActiveWallets(
            token,
            parseInt(from as string, 10),
            parseInt(to as string, 10)
        );
        res.status(200).json(wallets);
    } catch (error) {
        if (error instanceof Error) {
            res.status(500).json({ error: error.message });
        } else {
            res.status(500).json({ error: 'An unknown error occurred.' });
        }
    }
}
