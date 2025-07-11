// /api/holders.ts
import type { VercelRequest, VercelResponse } from '@vercel/node';
import axios from 'axios';

interface Holder {
    address: string;
    amount: number;
    uiAmount: number;
    owner: string;
    rank: number;
}

interface SolscanResponse {
    data: Holder[];
    total: number;
}

/**
 * Fetches token holders from the Solscan API, handling pagination.
 * @param tokenAddress The SPL token address.
 * @param limit The number of holders to fetch.
 * @param minAmount The minimum holding amount.
 * @returns A promise that resolves to an array of holder data.
 */
async function fetchHolders(tokenAddress: string, limit: number, minAmount: number) {
    const SOLSCAN_API_KEY = process.env.VITE_SOLSCAN_PRO_API_KEY;
    if (!SOLSCAN_API_KEY) {
        throw new Error("Solscan API key is not configured.");
    }

    let holders = [];
    let offset = 0;
    const pageSize = 50; // Solscan's max page size

    while (holders.length < limit) {
        try {
            const response = await axios.get<SolscanResponse>(`https://pro-api.solscan.io/v2.0/token/holders`, {
                headers: { 'token': SOLSCAN_API_KEY },
                params: {
                    token: tokenAddress,
                    offset: offset,
                    size: pageSize
                }
            });

            if (!response.data || response.data.data.length === 0) {
                break; // No more holders to fetch
            }

            const filteredHolders = response.data.data.filter(h => h.uiAmount >= minAmount);
            holders.push(...filteredHolders.map(h => ({
                wallet: h.owner,
                amount: h.uiAmount,
            })));

            if (holders.length >= limit || (offset + pageSize) >= response.data.total) {
                break; // Reached the limit or the end of holders
            }
            
            offset += pageSize;

        } catch (error) {
            console.error('Error fetching holders from Solscan:', error);
            throw new Error('Failed to fetch holder data from Solscan.');
        }
    }

    return holders.slice(0, limit);
}


export default async function handler(req: VercelRequest, res: VercelResponse) {
    const { token, limit = '100', minAmount = '0' } = req.query;

    if (!token || typeof token !== 'string') {
        return res.status(400).json({ error: 'Token address is required.' });
    }

    try {
        const holders = await fetchHolders(
            token,
            parseInt(limit as string, 10),
            parseFloat(minAmount as string)
        );
        res.status(200).json(holders);
    } catch (error) {
        if (error instanceof Error) {
            res.status(500).json({ error: error.message });
        } else {
            res.status(500).json({ error: 'An unknown error occurred.' });
        }
    }
}
