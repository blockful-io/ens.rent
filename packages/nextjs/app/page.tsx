'use client';

import Link from 'next/link';
import { ShoppingBag, Tag, Wallet } from 'lucide-react';
import type { NextPage } from 'next';
import { Button } from '~~/components/old-dapp/ui/button';
import {
  Card,
  CardContent,
  CardDescription,
  CardFooter,
  CardHeader,
  CardTitle,
} from '~~/components/old-dapp/ui/card';

const Home: NextPage = () => {
  return (
    <div className="h-[calc(100vh-65px)] bg-base-100 bg-gradient-to-b from-blue-100 to-white">
      {/* Main Content */}
      <main className="container mx-auto px-4 py-12">
        {/* Welcome Section */}
        <div className="mb-12 text-center">
          <h1 className="mb-4 text-4xl font-bold">Welcome to ens.rent</h1>
          <p className="mx-auto max-w-2xl text-lg text-muted-foreground text-gray-500">
            Your platform for renting and listing ENS domains. Choose whether
            you want to rent a domain or list your domains for others to rent.
          </p>
        </div>

        {/* Options Grid */}
        <div className="mx-auto grid max-w-4xl gap-8 md:grid-cols-2">
          {/* Rent a Domain Card */}
          <Card className="flex flex-col transition-shadow hover:shadow-lg bg-white">
            <CardHeader>
              <div className="flex items-center space-x-2">
                <ShoppingBag className="size-6 text-blue-500 " />
                <CardTitle>Rent a Domain</CardTitle>
              </div>
              <CardDescription className="text-gray-500">
                Browse and rent available ENS domains for your project or
                organization
              </CardDescription>
            </CardHeader>
            <CardContent className="flex-1">
              <div className="space-y-2 text-sm">
                <div className="flex items-center">
                  <span className="mr-2">✓</span>
                  Browse available domains
                </div>
                <div className="flex items-center">
                  <span className="mr-2">✓</span>
                  Filter by duration and price
                </div>
                <div className="flex items-center">
                  <span className="mr-2">✓</span>
                  Secure rental agreements
                </div>
                <div className="flex items-center">
                  <span className="mr-2">✓</span>
                  Instant domain transfer
                </div>
              </div>
            </CardContent>
            <CardFooter>
              <Button
                className="w-full bg-gray-900 text-white hover:bg-gray-800"
                size="lg"
                asChild
              >
                <Link href="/browse">Find Domains to Rent</Link>
              </Button>
            </CardFooter>
          </Card>

          {/* List Your Domains Card */}
          <Card className="flex flex-col transition-shadow hover:shadow-lg bg-white">
            <CardHeader>
              <div className="flex items-center space-x-2">
                <Tag className="size-6 text-green-500" />
                <CardTitle>List Your Domains</CardTitle>
              </div>
              <CardDescription className="text-gray-500">
                List your ENS domains for rent and earn passive income
              </CardDescription>
            </CardHeader>
            <CardContent className="flex-1">
              <div className="space-y-2 text-sm ">
                <div className="flex items-center">
                  <span className="mr-2">✓</span>
                  Set your rental terms
                </div>
                <div className="flex items-center">
                  <span className="mr-2">✓</span>
                  Manage multiple listings
                </div>
                <div className="flex items-center">
                  <span className="mr-2">✓</span>
                  Track rental income
                </div>
                <div className="flex items-center">
                  <span className="mr-2">✓</span>
                  Automated payments
                </div>
              </div>
            </CardContent>
            <CardFooter>
              <Button
                variant="secondary"
                className="w-full bg-gray-100 text-black hover:bg-gray-50"
                size="lg"
                asChild
              >
                <Link href="/lend">List Your Domains</Link>
              </Button>
            </CardFooter>
          </Card>
        </div>

        {/* Info Section */}
        <div className="mt-8 text-center">
          <h2 className="mb-4 text-2xl font-semibold ">How It Works</h2>
          <div className="mx-auto grid max-w-4xl gap-8 md:grid-cols-3">
            <div>
              <div className="mx-auto mb-4 flex size-12 items-center justify-center rounded-full bg-blue-100 ">
                <Wallet className="size-6 text-blue-600 " />
              </div>
              <h3 className="mb-2 font-medium ">Connect Wallet</h3>
              <p className="text-sm text-muted-foreground ">
                Connect your wallet to start renting or listing domains
              </p>
            </div>
            <div>
              <div className="mx-auto mb-4 flex size-12 items-center justify-center rounded-full bg-green-100 ">
                <ShoppingBag className="size-6 text-green-600 " />
              </div>
              <h3 className="mb-2 font-medium ">Choose Option</h3>
              <p className="text-sm text-muted-foreground ">
                Select whether you want to rent or list domains
              </p>
            </div>
            <div>
              <div className="mx-auto mb-4 flex size-12 items-center justify-center rounded-full bg-purple-100 ">
                <Tag className="size-6 text-purple-600 " />
              </div>
              <h3 className="mb-2 font-medium ">Complete Transaction</h3>
              <p className="text-sm text-muted-foreground ">
                Finalize your rental agreement or listing
              </p>
            </div>
          </div>
        </div>
      </main>
    </div>
  );
};

export default Home;
