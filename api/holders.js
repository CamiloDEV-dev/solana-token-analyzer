// /api/holders.js (Public API Version with better logging)
import axios from 'axios';

function sendJSON(res, statusCode, data) {
    res.statusCode = statusCode;
    res.setHeader('Content-Type', 'application/json');
    res.end(JSON.stringify(data));
}

async function fetchHolders(tokenAddress, limit, minAmount) {
    let holders = [];
    let offset = 0;
    const pageSize = 50;

    while (holders.length < limit) {
        try {
            const response = await axios.get(`https://public-api.solscan.io/token/holders`, {
                params: { 
                    tokenAddress: tokenAddress,
                    offset: offset,
                    limit: pageSize 
                }
            });

            const data = response.data.data;
            if (!data || data.length === 0) break;
            
            const filteredHolders = data.filter(h => h.uiAmount >= minAmount);
            holders.push(...filteredHolders.map(h => ({ 
                wallet: h.owner, 
                amount: h.uiAmount 
            })));

            if (holders.length >= limit || data.length < pageSize) break;
            
            offset += pageSize;
        } catch (error) {
            // More detailed logging
            console.error('--- Full Error from Solscan Public API ---');
            if (error.response) {
                // The request was made and the server responded with a status code
                // that falls out of the range of 2xx
                console.error('Data:', error.response.data);
                console.error('Status:', error.response.status);
                console.error('Headers:', error.response.headers);
            } else if (error.request) {
                // The request was made but no response was received
                console.error('Request:', error.request);
            } else {
                // Something happened in setting up the request that triggered an Error
                console.error('Error Message:', error.message);
            }
            console.error('--- End of Error ---');
            throw new Error('Failed to fetch holder data from Solscan.');
        }
    }
    return holders.slice(0, limit);
}

export default async function handler(req, res) {
    const { token, limit = '100', minAmount = '0' } = req.query;

    if (!token || typeof token !== 'string') {
        return sendJSON(res, 400, { error: 'Token address is required.' });
    }

    try {
        const holders = await fetchHolders(token, parseInt(limit, 10), parseFloat(minAmount));
        sendJSON(res, 200, holders);
    } catch (error) {
        sendJSON(res, 500, { error: error.message || 'An unknown error occurred.' });
    }
}
