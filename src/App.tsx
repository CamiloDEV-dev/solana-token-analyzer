import React, { useState, useMemo } from 'react';
// These are the correct, standard imports for a local project
import DatePicker from 'react-datepicker';
import "react-datepicker/dist/react-datepicker.css";
import axios from 'axios';

// --- Start of inlined /src/utils/solscan.ts ---

// WalletData interface defines the shape of our data rows.
export interface WalletData {
    wallet: string;
    amount?: number;
    volume?: number;
    lastTx?: number;
}

/**
 * Formats a long Solana wallet address into a shortened version (e.g., "So11...1112").
 * This makes the UI cleaner and easier to read.
 * @param address The full wallet address string.
 * @param chars The number of characters to show at the beginning and end.
 * @returns The formatted address string.
 */
export function formatWalletAddress(address: string, chars = 4): string {
    if (!address || address.length <= chars * 2) {
        return address;
    }
    return `${address.slice(0, chars)}...${address.slice(-chars)}`;
}

/**
 * An object that wraps all our client-side calls to the backend API endpoints.
 * This keeps our API calls organized and separate from the component logic.
 */
export const api = {
    /**
     * Fetches top token holders.
     * @param token The SPL token address.
     * @param limit The max number of holders to return.
     * @param minAmount The minimum token amount a wallet must hold.
     * @returns A promise that resolves to an array of wallet data.
     */
    getHolders: async (token: string, limit: number, minAmount: number): Promise<WalletData[]> => {
        const params = new URLSearchParams({
            token,
            limit: String(limit),
            minAmount: String(minAmount),
        });
        // In development, Vite automatically proxies this request to the backend functions.
        const response = await axios.get(`/api/holders?${params.toString()}`);
        return response.data;
    },

    /**
     * Fetches top traders by volume.
     * @param token The SPL token address.
     * @param limit The max number of traders to return.
     * @returns A promise that resolves to an array of wallet data.
     */
    getTopTraders: async (token: string, limit: number): Promise<WalletData[]> => {
        const params = new URLSearchParams({
            token,
            limit: String(limit),
        });
        const response = await axios.get(`/api/traders?${params.toString()}`);
        return response.data;
    },

    /**
     * Fetches wallets that were active in a given time interval.
     * @param token The SPL token address.
     * @param from The start date of the interval.
     * @param to The end date of the interval.
     * @returns A promise that resolves to an array of wallet data.
     */
    getActiveInInterval: async (token: string, from: Date, to: Date): Promise<WalletData[]> => {
        const params = new URLSearchParams({
            token,
            from: String(Math.floor(from.getTime() / 1000)), // Convert to Unix timestamp
            to: String(Math.floor(to.getTime() / 1000)),   // Convert to Unix timestamp
        });
        const response = await axios.get(`/api/interval?${params.toString()}`);
        return response.data;
    },
};
// --- End of inlined /src/utils/solscan.ts ---


type SortConfig = {
    key: keyof WalletData;
    direction: 'ascending' | 'descending';
};

const App: React.FC = () => {
    const [tokenAddress, setTokenAddress] = useState('DezXAZ8z7PnrnRJjz3wXBoRgixCa6xjnB7YaB1pPB263'); // Default to BONK
    const [topN, setTopN] = useState(100);
    const [minAmount, setMinAmount] = useState(0);
    const [dateRange, setDateRange] = useState<[Date | null, Date | null]>([null, null]);
    const [filterType, setFilterType] = useState<'holders' | 'traders' | 'interval'>('holders');
    
    const [data, setData] = useState<WalletData[]>([]);
    const [loading, setLoading] = useState(false);
    const [error, setError] = useState<string | null>(null);
    const [sortConfig, setSortConfig] = useState<SortConfig | null>(null);

    const handleApplyFilters = async () => {
        setLoading(true);
        setError(null);
        setData([]);
        try {
            let result: WalletData[] = [];
            if (filterType === 'holders') {
                result = await api.getHolders(tokenAddress, topN, minAmount);
            } else if (filterType === 'traders') {
                result = await api.getTopTraders(tokenAddress, topN);
            } else if (filterType === 'interval' && dateRange[0] && dateRange[1]) {
                result = await api.getActiveInInterval(tokenAddress, dateRange[0], dateRange[1]);
            }
            setData(result);
        } catch (e: any) {
            setError(e.response?.data?.error || e.message || 'An unexpected error occurred.');
        } finally {
            setLoading(false);
        }
    };

    const sortedData = useMemo(() => {
        let sortableData = [...data];
        if (sortConfig !== null) {
            sortableData.sort((a, b) => {
                const aValue = a[sortConfig.key] ?? 0;
                const bValue = b[sortConfig.key] ?? 0;
                if (aValue < bValue) {
                    return sortConfig.direction === 'ascending' ? -1 : 1;
                }
                if (aValue > bValue) {
                    return sortConfig.direction === 'ascending' ? 1 : -1;
                }
                return 0;
            });
        }
        return sortableData;
    }, [data, sortConfig]);

    const requestSort = (key: keyof WalletData) => {
        let direction: 'ascending' | 'descending' = 'ascending';
        if (sortConfig && sortConfig.key === key && sortConfig.direction === 'ascending') {
            direction = 'descending';
        }
        setSortConfig({ key, direction });
    };

    const exportToCSV = () => {
        const headers = ["Wallet", "Amount", "Volume", "Last Transaction (UTC)"];
        const rows = sortedData.map(row => [
            `"${row.wallet}"`, // Enclose in quotes to handle potential commas
            row.amount ?? 'N/A',
            row.volume ?? 'N/A',
            row.lastTx ? `"${new Date(row.lastTx * 1000).toUTCString()}"` : 'N/A'
        ].join(','));

        const csvContent = "data:text/csv;charset=utf-8," + [headers.join(','), ...rows].join('\n');
        const encodedUri = encodeURI(csvContent);
        const link = document.createElement("a");
        link.setAttribute("href", encodedUri);
        link.setAttribute("download", "token_holder_data.csv");
        document.body.appendChild(link);
        link.click();
        document.body.removeChild(link);
    };

    return (
        <div className="bg-gray-900 text-white min-h-screen p-4 sm:p-8 font-sans">
            <div className="max-w-7xl mx-auto">
                <header className="mb-8">
                    <h1 className="text-4xl font-bold text-cyan-400 mb-2">SPL Token Analyzer</h1>
                    <p className="text-gray-400">Analyze SPL token holders and traders on the Solana network.</p>
                </header>

                <div className="bg-gray-800 p-6 rounded-lg shadow-lg mb-8">
                    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 items-end">
                        {/* Token Address Input */}
                        <div className="lg:col-span-2">
                            <label htmlFor="tokenAddress" className="block text-sm font-medium text-gray-300 mb-2">Token Address</label>
                            <input
                                id="tokenAddress"
                                type="text"
                                value={tokenAddress}
                                onChange={(e) => setTokenAddress(e.target.value)}
                                className="w-full bg-gray-700 border border-gray-600 rounded-md px-3 py-2 text-white focus:ring-2 focus:ring-cyan-500 focus:outline-none"
                                placeholder="Enter SPL token address"
                            />
                        </div>

                        {/* Filter Type Selector */}
                        <div>
                            <label htmlFor="filterType" className="block text-sm font-medium text-gray-300 mb-2">Filter Type</label>
                            <select
                                id="filterType"
                                value={filterType}
                                onChange={(e) => setFilterType(e.target.value as any)}
                                className="w-full bg-gray-700 border border-gray-600 rounded-md px-3 py-2 text-white focus:ring-2 focus:ring-cyan-500 focus:outline-none"
                            >
                                <option value="holders">Top Holders</option>
                                <option value="traders">Top Traders</option>
                                <option value="interval">Active in Range</option>
                            </select>
                        </div>
                        
                        {/* Apply Filters Button */}
                        <div>
                            <button
                                onClick={handleApplyFilters}
                                disabled={loading}
                                className="w-full bg-cyan-600 hover:bg-cyan-700 disabled:bg-gray-500 disabled:cursor-not-allowed text-white font-bold py-2 px-4 rounded-md transition duration-300 ease-in-out"
                            >
                                {loading ? 'Loading...' : 'Apply Filters'}
                            </button>
                        </div>

                        {/* Conditional Inputs */}
                        {filterType !== 'interval' && (
                            <div>
                                <label htmlFor="topN" className="block text-sm font-medium text-gray-300 mb-2">Top N</label>
                                <input
                                    id="topN"
                                    type="number"
                                    value={topN}
                                    onChange={(e) => setTopN(Number(e.target.value))}
                                    className="w-full bg-gray-700 border border-gray-600 rounded-md px-3 py-2 text-white focus:ring-2 focus:ring-cyan-500 focus:outline-none"
                                />
                            </div>
                        )}
                        {filterType === 'holders' && (
                            <div>
                                <label htmlFor="minAmount" className="block text-sm font-medium text-gray-300 mb-2">Min. Holding Amount</label>
                                <input
                                    id="minAmount"
                                    type="number"
                                    value={minAmount}
                                    onChange={(e) => setMinAmount(Number(e.target.value))}
                                    className="w-full bg-gray-700 border border-gray-600 rounded-md px-3 py-2 text-white focus:ring-2 focus:ring-cyan-500 focus:outline-none"
                                />
                            </div>
                        )}
                        {filterType === 'interval' && (
                             <div className="lg:col-span-2">
                                <label className="block text-sm font-medium text-gray-300 mb-2">Date Range</label>
                                <DatePicker
                                    selectsRange={true}
                                    startDate={dateRange[0]}
                                    endDate={dateRange[1]}
                                    onChange={(update) => setDateRange(update as [Date, Date])}
                                    isClearable={true}
                                    className="w-full bg-gray-700 border border-gray-600 rounded-md px-3 py-2 text-white focus:ring-2 focus:ring-cyan-500 focus:outline-none"
                                    wrapperClassName="w-full"
                                />
                            </div>
                        )}
                    </div>
                </div>
                
                {error && <div className="bg-red-500/20 border border-red-500 text-red-300 p-4 rounded-md mb-8">{error}</div>}

                <div className="bg-gray-800 rounded-lg shadow-lg overflow-hidden">
                    <div className="flex justify-end p-4 border-b border-gray-700">
                        <button
                            onClick={exportToCSV}
                            disabled={data.length === 0 || loading}
                            className="bg-green-600 hover:bg-green-700 disabled:bg-gray-500 disabled:cursor-not-allowed text-white font-bold py-2 px-4 rounded-md transition duration-300 ease-in-out"
                        >
                            Export CSV
                        </button>
                    </div>
                    <div className="overflow-x-auto">
                        <table className="w-full text-left">
                            <thead className="bg-gray-700/50">
                                <tr>
                                    <th className="p-4 cursor-pointer hover:bg-gray-600 transition" onClick={() => requestSort('wallet')}>Wallet</th>
                                    <th className="p-4 cursor-pointer hover:bg-gray-600 transition" onClick={() => requestSort('amount')}>Amount</th>
                                    <th className="p-4 cursor-pointer hover:bg-gray-600 transition" onClick={() => requestSort('volume')}>Volume</th>
                                    <th className="p-4 cursor-pointer hover:bg-gray-600 transition" onClick={() => requestSort('lastTx')}>Last Tx (UTC)</th>
                                </tr>
                            </thead>
                            <tbody>
                                {loading ? (
                                    <tr><td colSpan={4} className="text-center p-8 text-gray-400">Loading data...</td></tr>
                                ) : sortedData.length > 0 ? (
                                    sortedData.map((row, index) => (
                                        <tr key={index} className="border-b border-gray-700 hover:bg-gray-700/50">
                                            <td className="p-4 font-mono" title={row.wallet}>{formatWalletAddress(row.wallet)}</td>
                                            <td className="p-4">{row.amount?.toLocaleString() ?? 'N/A'}</td>
                                            <td className="p-4">{row.volume?.toLocaleString() ?? 'N/A'}</td>
                                            <td className="p-4">{row.lastTx ? new Date(row.lastTx * 1000).toLocaleString() : 'N/A'}</td>
                                        </tr>
                                    ))
                                ) : (
                                    <tr><td colSpan={4} className="text-center p-8 text-gray-400">No data to display. Apply filters to begin.</td></tr>
                                )}
                            </tbody>
                        </table>
                    </div>
                </div>
            </div>
        </div>
    );
};

export default App;
