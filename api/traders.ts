// /api/traders.ts
import type { VercelRequest, VercelResponse } from '@vercel/node';
import axios from 'axios';

interface Transaction {
    signature: string[];
    blockTime: number;
    changeAmount: number;
    preBalance: string;
    postBalance: string;
    tokenAddress: string;
    owner: string;
}

interface SolscanTransferResponse {
    data: Transaction[];
    total: number;
}

interface WalletVolume {
    [wallet: string]: {
        volume: number;
        lastTx: number;
    };
}

/**
 * Fetches token transfers and calculates trading volume for each wallet.
 * @param tokenAddress The SPL token address.
 * @param limit The number of top traders to return.
 * @returns A promise that resolves to an array of trader data.
 */
async function fetchTopTraders(tokenAddress: string, limit: number) {
    const SOLSCAN_API_KEY = process.env.VITE_SOLSCAN_PRO_API_KEY;
    if (!SOLSCAN_API_KEY) {
        throw new Error("Solscan API key is not configured.");
    }

    const walletVolumes: WalletVolume = {};
    let offset = 0;
    const pageSize = 50;
    let transactionsProcessed = 0;

    // We might need to process a large number of transactions to find top traders.
    // Let's set a reasonable cap to avoid excessive API calls.
    const maxTransactionsToProcess = 1000; 

    while (transactionsProcessed < maxTransactionsToProcess) {
        try {
            const response = await axios.get<SolscanTransferResponse>(`https://pro-api.solscan.io/v2.0/token/transfer`, {
                headers: { 'token': SOLSCAN_API_KEY },
                params: {
                    token: tokenAddress,
                    offset: offset,
                    size: pageSize,
                    type: 'transfer' // Focus on actual transfers
                }
            });

            if (!response.data || response.data.data.length === 0) {
                break;
            }

            for (const tx of response.data.data) {
                const volume = Math.abs(tx.changeAmount) / (10**9); // Assuming 9 decimals, adjust if needed
                if (!walletVolumes[tx.owner]) {
                    walletVolumes[tx.owner] = { volume: 0, lastTx: 0 };
                }
                walletVolumes[tx.owner].volume += volume;
                if (tx.blockTime > walletVolumes[tx.owner].lastTx) {
                    walletVolumes[tx.owner].lastTx = tx.blockTime;
                }
            }
            
            transactionsProcessed += response.data.data.length;
            offset += pageSize;

            if (transactionsProcessed >= response.data.total) {
                break; // Processed all available transactions
            }

        } catch (error) {
            console.error('Error fetching transfers from Solscan:', error);
            throw new Error('Failed to fetch transfer data from Solscan.');
        }
    }

    const sortedTraders = Object.entries(walletVolumes)
        .map(([wallet, data]) => ({
            wallet,
            volume: data.volume,
            lastTx: data.lastTx,
        }))
        .sort((a, b) => b.volume - a.volume);

    return sortedTraders.slice(0, limit);
}

export default async function handler(req: VercelRequest, res: VercelResponse) {
    const { token, limit = '50' } = req.query;

    if (!token || typeof token !== 'string') {
        return res.status(400).json({ error: 'Token address is required.' });
    }

    try {
        const traders = await fetchTopTraders(token, parseInt(limit as string, 10));
        res.status(200).json(traders);
    } catch (error) {
        if (error instanceof Error) {
            res.status(500).json({ error: error.message });
        } else {
            res.status(500).json({ error: 'An unknown error occurred.' });
        }
    }
}
