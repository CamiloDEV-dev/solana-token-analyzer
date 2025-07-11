// /api/interval.js (Public API Version)
import axios from 'axios';

// Helper function to send a JSON response
function sendJSON(res, statusCode, data) {
    res.statusCode = statusCode;
    res.setHeader('Content-Type', 'application/json');
    res.end(JSON.stringify(data));
}

async function fetchActiveWallets(tokenAddress, from, to) {
    const activeWallets = new Map();
    let offset = 0;
    const pageSize = 50;
    let continueFetching = true;

    while (continueFetching) {
        try {
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
                if (tx.blockTime < from) {
                    continueFetching = false;
                    break;
                }
                const wallet = tx.signer[0];
                if (wallet && tx.blockTime <= to) {
                    if (!activeWallets.has(wallet) || tx.blockTime > activeWallets.get(wallet).lastTx) {
                       activeWallets.set(wallet, { lastTx: tx.blockTime });
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

    return Array.from(activeWallets.entries()).map(([wallet, data]) => ({ wallet, lastTx: data.lastTx }));
}


export default async function handler(req, res) {
    const { token, from, to } = req.query;

    if (!token || typeof token !== 'string') {
        return sendJSON(res, 400, { error: 'Token address is required.' });
    }
    if (!from || !to) {
        return sendJSON(res, 400, { error: 'A time range (from, to) is required.' });
    }

    try {
        const wallets = await fetchActiveWallets(token, parseInt(from, 10), parseInt(to, 10));
        sendJSON(res, 200, wallets);
    } catch (error) {
        sendJSON(res, 500, { error: error.message || 'An unknown error occurred.' });
    }
}
