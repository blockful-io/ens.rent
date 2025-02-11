'use client';

import Avatar from 'boring-avatars';
import Link from 'next/link';
import { useEffect, useState } from 'react';
import { normalize } from 'viem/ens';
import { useEnsName, usePublicClient } from 'wagmi';

export function EnsDappLink({
  name,
  address,
}: {
  name?: string;
  address?: `0x${string}`;
}) {
  const [ensAvatar, setEnsAvatar] = useState<string | null>(null);
  const { data: ensName } = useEnsName({ address });

  const nameToUse = name || ensName;

  const publicClient = usePublicClient();

  // Helper function to shorten the address.
  // This will turn an address like "0xa123456789abcdefa23..." into "0xa12...a23"
  const shortenAddress = (addr: string): string => {
    if (addr.length <= 10) return addr;
    return `${addr.substring(0, 5)}...${addr.substring(addr.length - 3)}`;
  };

  const getEnsAvatar = async () => {
    const ensText = nameToUse
      ? await publicClient?.getEnsAvatar({
          name: normalize(nameToUse),
        })
      : null;

    console.log(nameToUse + ' - ' + ensText);

    setEnsAvatar(ensText ?? '');
  };

  useEffect(() => {
    getEnsAvatar();
  }, [publicClient, ensName, name]);

  return (
    <>
      {nameToUse ? (
        <Link
          target="_blank"
          className="text-blue-500 hover:underline flex items-center gap-2"
          href={`https://app.ens.domains/${nameToUse}`}
        >
          {ensAvatar ? (
            <img
              src={ensAvatar}
              alt={name}
              className="w-6 h-6 rounded-full bg-grey-500"
            />
          ) : (
            <Avatar className="w-6 h-6 rounded-full bg-grey-500" name={name} />
          )}
          {nameToUse}
        </Link>
      ) : (
        <span>{address ? shortenAddress(address) : null}</span>
      )}
    </>
  );
}
