// /api/traders.js (Public API Version)
import axios from 'axios';

// Helper function to send a JSON response
function sendJSON(res, statusCode, data) {
    res.statusCode = statusCode;
    res.setHeader('Content-Type', 'application/json');
    res.end(JSON.stringify(data));
}

async function fetchTopTraders(tokenAddress, limit) {
    const walletCounts = {};
    let offset = 0;
    const pageSize = 50;
    const maxTransactionsToProcess = 500; // Cap to avoid excessive calls

    while (offset < maxTransactionsToProcess) {
        try {
            // Using a different public endpoint for transactions
            const response = await axios.get(`https://public-api.solscan.io/token/transactions`, {
                params: { 
                    tokenAddress: tokenAddress,
                    offset: offset,
                    limit: pageSize
                }
            });

            const data = response.data;
            if (!data || data.length === 0) break;
            
            for (const tx of data) {
                // Use the first signer as the wallet making the transaction
                const wallet = tx.signer[0];
                if (wallet) {
                    if (!walletCounts[wallet]) {
                        walletCounts[wallet] = { count: 0, lastTx: 0 };
                    }
                    walletCounts[wallet].count++;
                    if (tx.blockTime > walletCounts[wallet].lastTx) {
                        walletCounts[wallet].lastTx = tx.blockTime;
                    }
                }
            }
            
            if (data.length < pageSize) break;
            offset += pageSize;
        } catch (error) {
            console.error('Error fetching transfers from Solscan Public API:', error.response ? error.response.data : error.message);
            throw new Error('Failed to fetch transaction data from Solscan.');
        }
    }

    const sortedTraders = Object.entries(walletCounts)
        .map(([wallet, data]) => ({ 
            wallet, 
            volume: data.count, // "volume" now represents transaction count
            lastTx: data.lastTx 
        }))
        .sort((a, b) => b.volume - a.volume);

    return sortedTraders.slice(0, limit);
}

export default async function handler(req, res) {
    const { token, limit = '50' } = req.query;

    if (!token || typeof token !== 'string') {
        return sendJSON(res, 400, { error: 'Token address is required.' });
    }

    try {
        const traders = await fetchTopTraders(token, parseInt(limit, 10));
        sendJSON(res, 200, traders);
    } catch (error) {
        sendJSON(res, 500, { error: error.message || 'An unknown error occurred.' });
    }
}
