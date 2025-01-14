import { type ClassValue, clsx } from "clsx";
import { twMerge } from "tailwind-merge";
import { RentalStatus } from "~~/types/types";

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}

export function shortenAddress(address: string) {
  if (!address) return "";

  const start = address.slice(0, 6);
  const end = address.slice(-4);

  return `${start}...${end}`;
}

export const getStatusColor = (status: RentalStatus) => {
  switch (status) {
    case RentalStatus.available:
      return "bg-green-100 text-green-700 dark:bg-green-900/20 dark:text-green-400";
    case RentalStatus.rentedOut:
      return "bg-blue-100 text-blue-700 dark:bg-blue-900/20 dark:text-blue-400";
    case RentalStatus.rentedIn:
      return "bg-red-100 text-red-700 dark:bg-red-900/20 dark:text-red-400";
    case RentalStatus.listed:
      return "bg-yellow-100 text-yellow-700 dark:bg-yellow-900/20 dark:text-yellow-400";
    default:
      return "bg-gray-100 text-gray-700 dark:bg-gray-900/20 dark:text-gray-400";
  }
};
