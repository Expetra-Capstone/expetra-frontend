import React from 'react';
import { render, act } from '@testing-library/react-native';
import { Text } from 'react-native';
import { AuthProvider, useAuth } from '../context/AuthContext';

// --- MOCKS ---

jest.mock('expo-secure-store', () => ({
  setItemAsync: jest.fn().mockResolvedValue(undefined),
  getItemAsync: jest.fn().mockResolvedValue(null),
  deleteItemAsync: jest.fn().mockResolvedValue(undefined),
}));

jest.mock('../services/apiService', () => ({
  ownerLogin: jest.fn().mockResolvedValue({
    data: { token: 'fake-token-123', role: 'owner' },
  }),
  getOwnerProfile: jest.fn().mockResolvedValue({
    data: {
      owner: { id: 1, owner_name: 'Test Owner', phone: '0911', company_name: 'TestCo' },
      business: { id: 10, name: 'TestCo', invitation_id: 'inv-abc' },
    },
  }),
  employeeLogin: jest.fn(),
  getEmployeeProfile: jest.fn(),
}));

// --- HELPER ---

function TestConsumer({ onRender }: { onRender: (ctx: ReturnType<typeof useAuth>) => void }) {
  const auth = useAuth();
  onRender(auth);
  return <Text>test</Text>;
}

// --- TESTS ---

describe('AuthContext', () => {

  it('starts with no user and no token', async () => {
    let capturedAuth: any;

    // render OUTSIDE act — RNTL v13 handles async internally
    render(
      <AuthProvider>
        <TestConsumer onRender={(ctx) => { capturedAuth = ctx; }} />
      </AuthProvider>
    );

    // wait for the useEffect (session restore) to finish
    await act(async () => {});

    expect(capturedAuth.user).toBeNull();
    expect(capturedAuth.token).toBeNull();
  });

  it('sets token and user after successful login', async () => {
    let capturedAuth: any;

    render(
      <AuthProvider>
        <TestConsumer onRender={(ctx) => { capturedAuth = ctx; }} />
      </AuthProvider>
    );

    await act(async () => {});

    // now call login inside act — this triggers state updates
    await act(async () => {
      await capturedAuth.login('0911223344', 'password123', 'business');
    });

    expect(capturedAuth.token).toBe('fake-token-123');
    expect(capturedAuth.user?.name).toBe('Test Owner');
    expect(capturedAuth.role).toBe('owner');
  });

  it('clears token and user after logout', async () => {
    let capturedAuth: any;

    render(
      <AuthProvider>
        <TestConsumer onRender={(ctx) => { capturedAuth = ctx; }} />
      </AuthProvider>
    );

    await act(async () => {});

    await act(async () => {
      await capturedAuth.login('0911223344', 'password123', 'business');
    });

    await act(async () => {
      await capturedAuth.logout();
    });

    expect(capturedAuth.token).toBeNull();
    expect(capturedAuth.user).toBeNull();
    expect(capturedAuth.role).toBeNull();
  });

});