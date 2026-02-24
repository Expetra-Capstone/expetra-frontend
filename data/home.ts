import { Transaction } from "@/types/home";

// Generate realistic transaction data
export const allTransactions: Transaction[] = [
  {
    id: 1,
    bank: "BOA",
    amount: "1,250.00",
    date: "Feb 15, 2026",
    status: "Deposited",
    type: "deposit",
  },
  {
    id: 2,
    bank: "CBE",
    amount: "850.50",
    date: "Feb 14, 2026",
    status: "Withdrawn",
    type: "withdrawal",
  },
  {
    id: 3,
    bank: "Awash",
    amount: "3,420.75",
    date: "Feb 13, 2026",
    status: "Deposited",
    type: "deposit",
  },
  {
    id: 4,
    bank: "BOA",
    amount: "500.00",
    date: "Feb 12, 2026",
    status: "Withdrawn",
    type: "withdrawal",
  },
  {
    id: 5,
    bank: "Abyssinia",
    amount: "2,150.25",
    date: "Feb 11, 2026",
    status: "Deposited",
    type: "deposit",
  },
  {
    id: 6,
    bank: "CBE",
    amount: "920.00",
    date: "Feb 10, 2026",
    status: "Deposited",
    type: "deposit",
  },
  {
    id: 7,
    bank: "Awash",
    amount: "1,200.00",
    date: "Feb 9, 2026",
    status: "Withdrawn",
    type: "withdrawal",
  },
  {
    id: 8,
    bank: "BOA",
    amount: "4,580.00",
    date: "Feb 8, 2026",
    status: "Deposited",
    type: "deposit",
  },
  {
    id: 9,
    bank: "Abyssinia",
    amount: "675.50",
    date: "Feb 7, 2026",
    status: "Withdrawn",
    type: "withdrawal",
  },
  {
    id: 10,
    bank: "CBE",
    amount: "1,890.00",
    date: "Feb 6, 2026",
    status: "Deposited",
    type: "deposit",
  },
];

export const categories = [
  { id: "all", name: "All" },
  { id: "boa", name: "BOA" },
  { id: "cbe", name: "CBE" },
  { id: "awash", name: "Awash" },
  { id: "abyssinia", name: "Abyssinia" },
  { id: "zemen", name: "Abyssinia" },
  { id: "sinqe", name: "Abyssinia" },
];

export const dateRangeOptions = [
  { id: "all", label: "All time" },
  { id: "7days", label: "7 days" },
  { id: "30days", label: "30 days" },
  { id: "90days", label: "90 days" },
  { id: "1year", label: "1 year" },
];
