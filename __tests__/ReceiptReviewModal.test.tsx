import React from 'react';
import { render, fireEvent } from '@testing-library/react-native';
import { TransactionReviewModal } from '../components/screenshot/ReceiptReviewModal';
import { TransactionData } from '../types/transaction.type';

// Mock icon library
jest.mock('@expo/vector-icons', () => ({
  Ionicons: () => null,
}));

// Fake transaction data
const mockTransaction: TransactionData = {
  transaction_time: '2024-01-15T10:30:00Z',
  amount: 2500.00,
  sender_name: 'Mekdes Tadesse',
  sender_account: '1000111222',
  beneficiary_name: 'Yonas Bekele',
  beneficiary_account: '2000333444',
  beneficiary_bank: 'Awash Bank',
  transaction_type: 'screenshot',
};

describe('TransactionReviewModal', () => {

  // Test 1: Modal renders when visible=true and data is present
  it('renders the modal title when visible', () => {
    const { getByText } = render(
      <TransactionReviewModal
        visible={true}
        transactionData={mockTransaction}
        capturedImage={null}
        isSaving={false}
        onRetake={() => {}}
        onSave={() => {}}
      />
    );
    expect(getByText('Review Transaction')).toBeTruthy();
  });

  // Test 2: Sender name shows
  it('renders sender name from transaction data', () => {
    const { getByText } = render(
      <TransactionReviewModal
        visible={true}
        transactionData={mockTransaction}
        capturedImage={null}
        isSaving={false}
        onRetake={() => {}}
        onSave={() => {}}
      />
    );
    expect(getByText('Mekdes Tadesse')).toBeTruthy();
  });

  // Test 3: Pressing "Retake" calls onRetake
  it('calls onRetake when Retake button is pressed', () => {
    const mockRetake = jest.fn();

    const { getByText } = render(
      <TransactionReviewModal
        visible={true}
        transactionData={mockTransaction}
        capturedImage={null}
        isSaving={false}
        onRetake={mockRetake}
        onSave={() => {}}
      />
    );

    fireEvent.press(getByText('Retake'));
    expect(mockRetake).toHaveBeenCalledTimes(1);
  });

  // Test 4: Pressing "Save Transaction" calls onSave
  it('calls onSave when Save Transaction button is pressed', () => {
    const mockSave = jest.fn();

    const { getByText } = render(
      <TransactionReviewModal
        visible={true}
        transactionData={mockTransaction}
        capturedImage={null}
        isSaving={false}
        onRetake={() => {}}
        onSave={mockSave}
      />
    );

    fireEvent.press(getByText('Save Transaction'));
    expect(mockSave).toHaveBeenCalledTimes(1);
  });

  // Test 5: While saving, button shows "Saving…" and is disabled
  it('shows Saving… text when isSaving is true', () => {
    const { getByText } = render(
      <TransactionReviewModal
        visible={true}
        transactionData={mockTransaction}
        capturedImage={null}
        isSaving={true}
        onRetake={() => {}}
        onSave={() => {}}
      />
    );
    expect(getByText('Saving…')).toBeTruthy();
  });

  // Test 6: Modal does not render content when transactionData is null
  it('does not show transaction details when transactionData is null', () => {
    const { queryByText } = render(
      <TransactionReviewModal
        visible={true}
        transactionData={null}
        capturedImage={null}
        isSaving={false}
        onRetake={() => {}}
        onSave={() => {}}
      />
    );
    // The modal body requires transactionData to be non-null to show
    expect(queryByText('Mekdes Tadesse')).toBeNull();
  });

});