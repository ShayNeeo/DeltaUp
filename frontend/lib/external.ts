import axios from 'axios';

// CoinGecko API (Public, no key required for basic usage)
const COINGECKO_API_URL = 'https://api.coingecko.com/api/v3';

export interface CryptoPrice {
    id: string;
    symbol: string;
    name: string;
    current_price: number;
    price_change_percentage_24h: number;
    image: string;
}

export const externalAPI = {
    getMarketData: async (): Promise<CryptoPrice[]> => {
        try {
            const response = await axios.get(`${COINGECKO_API_URL}/coins/markets`, {
                params: {
                    vs_currency: 'usd',
                    ids: 'bitcoin,ethereum,solana,cardano,ripple', // Fetch top coins
                    order: 'market_cap_desc',
                    per_page: 5,
                    page: 1,
                    sparkline: false
                }
            });
            return response.data;
        } catch (error) {
            console.error("Failed to fetch external market data:", error);
            return []; // Return empty array on failure (graceful degradation)
        }
    }
};
