Solana SPL Token Holder Analysis ToolThis web application provides a dashboard to analyze the holders of a given Solana SPL token. It allows users to filter and sort wallet data based on various criteria, including holding amount, trading volume, and activity within a specific time range.FeaturesTop N Holders: View the top holders of a token, configurable by the user.Top Traders by Volume: Identify the wallets with the highest trading volume.Activity by Time Range: Filter for wallets that were active during a specific date range.Minimum Holding Amount: Filter out wallets holding less than a specified amount of the token.Sortable Data Table: Easily sort the results by wallet address, amount, volume, or last transaction date.CSV Export: Export the filtered and sorted data to a CSV file for further analysis.Tech StackBackend: Node.js, ExpressFrontend: React, Vite, Tailwind CSSAPI: Solscan Pro APIDeployment: VercelProject Structure/
├── api/
│   ├── holders.ts       # API endpoint for top N holders
│   ├── traders.ts       # API endpoint for top traders by volume
│   └── interval.ts      # API endpoint for wallets active in a time range
├── src/
│   ├── App.tsx          # Main React component with UI
│   └── utils/
│       └── solscan.ts   # Client-side API wrapper
├── .env.local           # Local environment variables (not committed)
├── package.json
└── README.md
Setup and InstallationClone the repository:git clone <repository-url>
cd <repository-directory>
Install dependencies:npm install
Set up environment variables:Create a file named .env.local in the root of your project and add your Solscan Pro API key:VITE_SOLSCAN_PRO_API_KEY=your_solscan_pro_api_key_here
Note: For deployment on Vercel, you will need to set this environment variable in your Vercel project settings.Running the Development ServerTo start the Vite development server, run:npm run dev
The application will be available at http://localhost:5173.API EndpointsThe backend API is served by Vercel Functions located in the /api directory.GET /api/holders?token=<address>&limit=<n>&minAmount=<amount>GET /api/traders?token=<address>&limit=<n>GET /api/interval?token=<address>&from=<timestamp>&to=<timestamp>These endpoints are called by the frontend to fetch the necessary data from the Solscan API.DeploymentThis project is configured for easy deployment on Vercel.Push your code to a Git repository (e.g., GitHub, GitLab, Bitbucket).Import your project into Vercel.Configure Environment Variables: In your Vercel project settings, add the VITE_SOLSCAN_PRO_API_KEY with your Solscan API key.Deploy. Vercel will automatically detect the Vite configuration and deploy the application. The serverless functions in the /api directory will be deployed as well.
