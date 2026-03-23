import React from 'react';
import { render } from '@testing-library/react-native';
import TransactionList from '../components/TransactionList';
import { Transaction } from '../services/apiService';

// TransactionList uses expo-router internally — mock it so tests don't crash
jest.mock('expo-router', () => ({
  useRouter: () => ({ push: jest.fn() }),
}));

// Mock the hugeicons package
jest.mock('hugeicons-react-native', () => ({
  Invoice02Icon: () => null,
}));

// Fake transaction data matching the real Transaction type
const mockTransactions: Transaction[] = [
  {
    id: 1,
    transaction_time: '2024-01-15T10:30:00Z',
    amount: 1500.00,
    sender_name: 'Abebe Kebede',
    sender_account: '1000123456',
    beneficiary_name: 'Tigist Haile',
    beneficiary_account: '2000654321',
    beneficiary_bank: 'CBE',
    transaction_type: 'sms',
  },
  {
    id: 2,
    transaction_time: '2024-01-16T14:00:00Z',
    amount: 500.50,
    sender_name: 'Dawit Alemu',
    sender_account: undefined,
    beneficiary_name: undefined,
    beneficiary_account: undefined,
    beneficiary_bank: undefined,
    transaction_type: 'screenshot',
  },
];

describe('TransactionList', () => {

  // Test 1: Do the sender names show?
  it('renders sender names for each transaction', () => {
    const { getByText } = render(
      <TransactionList transactions={mockTransactions} />
    );
    expect(getByText('Abebe Kebede')).toBeTruthy();
    expect(getByText('Dawit Alemu')).toBeTruthy();
  });

  // Test 2: Do amounts show?
  it('renders transaction amounts', () => {
    const { getByText } = render(
      <TransactionList transactions={mockTransactions} />
    );
    // The component formats to 2 decimal places with toLocaleString
    expect(getByText(/1[,.]?500[.,]00/)).toBeTruthy();
  });

  // Test 3: Empty state message
  it('shows empty message when no transactions', () => {
    const { getByText } = render(
      <TransactionList transactions={[]} emptyMessage="No transactions yet" />
    );
    expect(getByText('No transactions yet')).toBeTruthy();
  });

  // Test 4: Default empty message
  it('shows default empty message', () => {
    const { getByText } = render(
      <TransactionList transactions={[]} />
    );
    expect(getByText('No transactions found')).toBeTruthy();
  });

});