import React from 'react';
import { render } from '@testing-library/react-native';
import Navbar from '../components/Navbar';

// Navbar uses useAuth — mock it to control what role we test with
jest.mock('../context/AuthContext', () => ({
  useAuth: jest.fn(),
}));

// Navbar uses expo-router
jest.mock('expo-router', () => ({
  router: { push: jest.fn() },
}));

// Mock icon libraries
jest.mock('@expo/vector-icons', () => ({
  Ionicons: () => null,
}));
jest.mock('@expo/vector-icons/FontAwesome5', () => () => null);

import { useAuth } from '../context/AuthContext';
const mockUseAuth = useAuth as jest.Mock;

describe('Navbar', () => {

  // Test 1: "Welcome back" text is always shown
  it('renders welcome text', () => {
    mockUseAuth.mockReturnValue({ role: 'owner' });
    const { getByText } = render(<Navbar />);
    expect(getByText('Welcome back')).toBeTruthy();
  });

  // Test 2: The hardcoded name renders
  it('renders the user name', () => {
    mockUseAuth.mockReturnValue({ role: 'owner' });
    const { getByText } = render(<Navbar />);
    expect(getByText('Betemariam')).toBeTruthy();
  });

  // Test 3: Notification badge shows
  it('renders notification badge count', () => {
    mockUseAuth.mockReturnValue({ role: 'owner' });
    const { getByText } = render(<Navbar />);
    expect(getByText('8')).toBeTruthy();
  });

});