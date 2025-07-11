// /src/utils/solscan.ts
import axios from 'axios';

export interface WalletData {
    wallet: string;
    amount?: number;
    volume?: number;
    lastTx?: number;
}

/**
 * Jest Test for formatWalletAddress.
 * @jest-environment jsdom
 */
describe('formatWalletAddress', () => {
    it('should shorten the wallet address correctly', () => {
        const address = 'So11111111111111111111111111111111111111112';
        expect(formatWalletAddress(address)).toBe('So11...1112');
    });
    it('should handle short strings', () => {
        const address = 'short';
        expect(formatWalletAddress(address)).toBe('short');
    });
});

export function formatWalletAddress(address: string, chars = 4): string {
    if (address.length <= chars * 2) {
        return address;
    }
    return `${address.slice(0, chars)}...${address.slice(-chars)}`;
}

export const api = {
    getHolders: async (token: string, limit: number, minAmount: number): Promise<WalletData[]> => {
        const params = new URLSearchParams({
            token,
            limit: String(limit),
            minAmount: String(minAmount),
        });
        const response = await axios.get(`/api/holders?${params.toString()}`);
        return response.data;
    },

    getTopTraders: async (token: string, limit: number): Promise<WalletData[]> => {
        const params = new URLSearchParams({
            token,
            limit: String(limit),
        });
        const response = await axios.get(`/api/traders?${params.toString()}`);
        return response.data;
    },

    getActiveInInterval: async (token: string, from: Date, to: Date): Promise<WalletData[]> => {
        const params = new URLSearchParams({
            token,
            from: String(Math.floor(from.getTime() / 1000)),
            to: String(Math.floor(to.getTime() / 1000)),
        });
        const response = await axios.get(`/api/interval?${params.toString()}`);
        return response.data;
    },
};
