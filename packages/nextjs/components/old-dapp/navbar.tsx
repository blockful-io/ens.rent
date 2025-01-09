import Link from "next/link";
import { ConnectButton } from "@rainbow-me/rainbowkit";
import { Button } from "@/src/components/ui/button";
import { useAccount } from "wagmi";
import toast from "react-hot-toast";
import { useRouter } from "next/router";

export function SiteHeader() {
  const { address } = useAccount();

  const router = useRouter();

  return (
    <header className="sticky top-0 z-40 w-full border-b bg-background">
      <div className="container flex h-16 items-center space-x-4 sm:justify-between sm:space-x-0 mx-auto">
        <nav>
          <Link href="/" className="flex items-center space-x-2">
            {/* <Icons.logo className="size-6" /> */}
            <span className="inline-block font-bold">ENS Rent</span>
          </Link>
        </nav>
        <div className="flex flex-1 items-center justify-end space-x-4">
          <nav className="flex items-center space-x-1">
            <Button variant="ghost" asChild>
              <Link href={"/browse"}>Rent</Link>
            </Button>
            <Button
              onClick={() => {
                if (!address) {
                  toast.error("Please connect your wallet");
                }
              }}
              variant="ghost"
              asChild
            >
              <Link href={address ? "/lend" : router.asPath}>List</Link>
            </Button>
            <Button
              onClick={() => {
                if (!address) {
                  toast.error("Please connect your wallet");
                }
              }}
              variant="ghost"
              asChild
            >
              <Link href={address ? "/manage" : router.asPath}>Manage</Link>
            </Button>
          </nav>
          {/* <nav className="flex items-center space-x-1">
            <ThemeToggle />
          </nav> */}
          <nav className="flex items-center space-x-1">
            <ConnectButton />
          </nav>
        </div>
      </div>
    </header>
  );
}
