import Link from "next/link";
import { useRouter } from "next/navigation";
import { Button } from "./ui/button";
import { ConnectButton } from "@rainbow-me/rainbowkit";
import toast from "react-hot-toast";
import { useAccount } from "wagmi";

export function SiteHeader() {
  const { address } = useAccount();
  const router = useRouter();

  const handleNavigation = (path: string) => {
    if (!address) {
      toast.error("Please connect your wallet");
      return;
    }
    router.push(path);
  };

  return (
    <header className="sticky top-0 z-40 w-full border-b bg-white">
      <div className="container flex h-16 items-center space-x-4 sm:justify-between sm:space-x-0 mx-auto">
        <nav>
          <Link href="/" className="flex items-center space-x-2">
            {/* <Icons.logo className="size-6" /> */}
            <span className="inline-block font-bold">ENS Rent</span>
          </Link>
        </nav>
        <div className="flex flex-1 items-center justify-end space-x-4">
          <nav className="flex items-center space-x-1">
            <Button asChild variant="ghost">
              <Link href={"/browse"}>Rent</Link>
            </Button>
            <Button onClick={() => handleNavigation("/lend")} variant="ghost">
              List
            </Button>
            <Button onClick={() => handleNavigation("/manage")} variant="ghost">
              Manage
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
