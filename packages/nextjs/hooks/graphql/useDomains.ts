import { useEffect, useState } from "react";
import { getNamesForAddress } from "@ensdomains/ensjs/subgraph";
import { Address } from "viem";
import { usePublicClient } from "wagmi";
import type { ClientWithEns } from "@ensdomains/ensjs/contracts";

export default function useDomainsByAddress(address: Address | undefined): [string[], boolean, Error | null] {
  const [names, setNames] = useState<string[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<Error | null>(null);
  const publicClient = usePublicClient();

  useEffect(() => {
    const getNames = async (address: Address) => {
      setIsLoading(true);

      if (!publicClient) return;

      try {
        const result = await getNamesForAddress(publicClient as unknown as ClientWithEns, {
          address: address as `0x${string}`,
          filter: {
            registrant: true,
            resolvedAddress: false,
            owner: false,
            wrappedOwner: true,
          },
        });

        setNames(result.map(object => object.name!).filter(name => name.split(".").length === 2));
      } catch (error) {
        setError(new Error("An error occurred fetching domains"));
      } finally {
        setIsLoading(false);
      }
    };

    if (address) getNames(address);
  }, [address, publicClient]);

  return [names, isLoading, error];
}
