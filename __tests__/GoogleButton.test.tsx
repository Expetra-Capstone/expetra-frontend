import React from 'react';
import { render, fireEvent } from '@testing-library/react-native';
import GoogleButton from '../components/auth/GoogleButton';

// Mock SVG again (same reason as above)
jest.mock('react-native-svg', () => {
  const { View } = require('react-native');
  return { __esModule: true, default: View, Svg: View, Path: View };
});

describe('GoogleButton', () => {

  // Test 1: Does the button text show?
  it('renders the sign in text', () => {
    const { getByText } = render(<GoogleButton />);
    expect(getByText('Sign in with Google')).toBeTruthy();
  });

  // Test 2: Does pressing it call onPress?
  it('calls onPress when pressed', () => {
    const mockPress = jest.fn();
    const { getByText } = render(<GoogleButton onPress={mockPress} />);

    fireEvent.press(getByText('Sign in with Google'));

    expect(mockPress).toHaveBeenCalledTimes(1);
  });

  // Test 3: Does it work without an onPress (no crash)?
  it('renders without crashing when onPress is not provided', () => {
    const { getByText } = render(<GoogleButton />);
    expect(getByText('Sign in with Google')).toBeTruthy();
  });

});