import '@rainbow-me/rainbowkit/styles.css';
import { ScaffoldEthAppWithProviders } from '~~/components/ScaffoldEthAppWithProviders';
import { ThemeProvider } from '~~/components/ThemeProvider';
import '~~/styles/globals.css';
import { getMetadata } from '~~/utils/scaffold-eth/getMetadata';

export const metadata = {
  ...getMetadata({
    title: 'ENS Rent',
    description: 'Rent ENS domains',
  }),
  icons: {
    icon: [
      {
        url: 'data:image/svg+xml,<svg xmlns=%22http://www.w3.org/2000/svg%22 viewBox=%220 0 100 100%22><text y=%22.9em%22 font-size=%2290%22>🌀</text></svg>',
        type: 'image/svg+xml',
      },
    ],
  },
};

const ScaffoldEthApp = ({ children }: { children: React.ReactNode }) => {
  return (
    <html suppressHydrationWarning>
      <body>
        <ThemeProvider themes={['light']} enableSystem>
          <ScaffoldEthAppWithProviders>{children}</ScaffoldEthAppWithProviders>
        </ThemeProvider>
      </body>
    </html>
  );
};

export default ScaffoldEthApp;
