"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { AlertCircle, ArrowLeft, Clock, TrendingDown } from "lucide-react";
import { useAccount } from "wagmi";
import { Alert, AlertDescription, AlertTitle } from "~~/components/old-dapp/ui/alert";
import { Button } from "~~/components/old-dapp/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "~~/components/old-dapp/ui/card";
import { Input } from "~~/components/old-dapp/ui/input";

// Update mock auction data
const mockAuction = {
  domain: "awesome.eth",
  owner: "0x3a872f8FED4421E7d5BE5c98Ab5Ea0e0245169A1",
  startingPrice: 2.0,
  timeLeft: 3600,
  minimumBid: 0.45,
  status: "active",
  winner: "0x1234...5678",
  finalPrice: 0.48,
  sealedBids: [
    {
      id: 1,
      bidder: "0x1234...5678",
      amount: 0.5,
      timestamp: "2024-03-16 10:30",
    },
    {
      id: 2,
      bidder: "0x8765...4321",
      amount: 0.46,
      timestamp: "2024-03-16 10:15",
    },
    {
      id: 3,
      bidder: "0x5432...8765",
      amount: 0.45,
      timestamp: "2024-03-16 10:00",
    },
  ],
};

export default function AuctionDetails() {
  const [bidAmount, setBidAmount] = useState("");
  const router = useRouter();
  const { address } = useAccount();
  const isOwner = address?.toLowerCase() === mockAuction.owner.toLowerCase();

  const formatTimeLeft = (seconds: number) => {
    const hours = Math.floor(seconds / 3600);
    const minutes = Math.floor((seconds % 3600) / 60);
    return `${hours}h ${minutes}m`;
  };

  const handleBid = () => {
    // Handle bid submission logic here
    console.log("Placing bid:", bidAmount);
  };

  return (
    <div className="min-h-screen bg-gray-100 p-4 dark:bg-gray-900">
      <div className="mx-auto max-w-4xl space-y-6">
        {/* Back button */}
        <Button variant="ghost" className="flex items-center gap-2" onClick={() => router.push("/browse")}>
          <ArrowLeft className="size-4" />
          Back to Browse
        </Button>

        {/* Domain Info */}
        <div className="text-center">
          <h1 className="mb-2 text-3xl font-bold text-gray-800 dark:text-white">{mockAuction.domain}</h1>
          <p className="text-gray-500 dark:text-gray-400">Auction in Progress</p>
        </div>

        {/* Main auction info card */}
        <Card className="p-6 bg-white">
          <div className="grid grid-cols-1 gap-8">
            {/* Update price display section */}
            <div className="space-y-6">
              {mockAuction.status === "ended" ? (
                <div>
                  <h2 className="mb-2 text-lg font-medium">Auction Results</h2>
                  <div className="space-y-2">
                    <p className="text-xl">
                      Winner: <span className="font-bold">{mockAuction.winner}</span>
                    </p>
                    <p className="text-xl">
                      Final Price: <span className="font-bold">{mockAuction.finalPrice} ETH</span>
                    </p>
                  </div>
                </div>
              ) : (
                <div className="text-center">
                  <h2 className="mb-2 text-lg font-medium">Sealed Bid Auction</h2>
                  <Alert>
                    <AlertCircle className="mx-auto size-4" />
                    <AlertTitle>Private Bidding in Progress</AlertTitle>
                    <AlertDescription>
                      All bids are sealed until the auction ends. The highest bidder will win and pay the second-highest
                      bid price.
                    </AlertDescription>
                  </Alert>
                </div>
              )}

              {/* Time remaining section */}
              <div>
                <h2 className="mb-2 text-lg font-medium">Time Remaining</h2>
                <div className="flex items-center gap-2">
                  <Clock className="size-6 text-blue-500" />
                  <span className="text-3xl font-bold">
                    {mockAuction.status === "ended" ? "Auction Ended" : formatTimeLeft(mockAuction.timeLeft)}
                  </span>
                </div>
              </div>

              {/* Only show bid placement if auction is active */}
              {mockAuction.status === "active" && (
                <div className="space-y-4">
                  <h2 className="text-lg font-medium">Place Your Bid</h2>
                  {isOwner ? (
                    <Alert variant="destructive">
                      <AlertCircle className="size-4" />
                      <AlertTitle>Cannot Bid on Own Domain</AlertTitle>
                      <AlertDescription>
                        As the owner of this domain, you cannot participate in the auction.
                      </AlertDescription>
                    </Alert>
                  ) : (
                    <>
                      <Alert>
                        <AlertCircle className="size-4" />
                        <AlertTitle>Minimum bid: {mockAuction.minimumBid} ETH</AlertTitle>
                        <AlertDescription>Your bid will be kept private until the auction ends</AlertDescription>
                      </Alert>
                      <div className="flex gap-2">
                        <Input
                          type="number"
                          placeholder="Enter bid amount in ETH"
                          value={bidAmount}
                          onChange={e => setBidAmount(e.target.value)}
                          step="0.01"
                          min={mockAuction.minimumBid}
                          onWheel={e => e.currentTarget.blur()}
                        />
                        <Button
                          className="whitespace-nowrap"
                          onClick={handleBid}
                          disabled={!bidAmount || Number(bidAmount) < mockAuction.minimumBid || Number(bidAmount) <= 0}
                        >
                          Place Bid
                        </Button>
                      </div>
                    </>
                  )}
                </div>
              )}
            </div>
          </div>
        </Card>

        {/* Add sealed bids display */}
        <Card className="bg-white">
          <CardHeader>
            <CardTitle>{mockAuction.status === "ended" ? "Auction Results" : "Sealed Bids"}</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-4">
              {mockAuction.sealedBids.map(bid => (
                <div key={bid.id} className="flex items-center justify-between rounded-lg border p-4">
                  {mockAuction.status === "ended" ? (
                    <>
                      <div>
                        <p className="font-medium">{bid.bidder}</p>
                        <p className="text-sm text-gray-500">{bid.timestamp}</p>
                      </div>
                      <span className="font-bold">{bid.amount} ETH</span>
                    </>
                  ) : (
                    <>
                      <div>
                        <p className="font-medium">Sealed Bid</p>
                        <p className="text-sm text-gray-500">{bid.timestamp}</p>
                      </div>
                      <span className="rounded-full bg-gray-100 px-3 py-1 text-sm font-medium">Hidden until end</span>
                    </>
                  )}
                </div>
              ))}
            </div>
          </CardContent>
        </Card>

        {/* Update auction rules */}
        <Card className="bg-white">
          <CardHeader>
            <CardTitle>Auction Rules</CardTitle>
          </CardHeader>
          <CardContent className="space-y-2">
            <p>• This is a sealed-bid second-price auction</p>
            <p>• All bids are private until the auction ends</p>
            <p>• The highest bidder wins and pays the second-highest bid price</p>
            <p>• All bids are final and cannot be withdrawn</p>
            <p>• Minimum bid amount: {mockAuction.minimumBid} ETH</p>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
