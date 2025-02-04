import Link from 'next/link';

export function EnsDappLink({ name }: { name: string }) {
  return (
    <Link
      target="_blank"
      className="text-blue-500 hover:underline"
      href={`https://app.ens.domains/${name}`}
    >
      {name}
    </Link>
  );
}
