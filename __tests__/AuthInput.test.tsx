import React from 'react';
import AuthInput from '../components/auth/AuthInput';
import { render, fireEvent } from '@testing-library/react-native';

// This mocks the SVG eye icons so they don't crash in tests
jest.mock('react-native-svg', () => {
  const { View } = require('react-native');
  return {
    __esModule: true,
    default: View,
    Svg: View,
    Circle: View,
    Path: View,
  };
});

describe('AuthInput', () => {

  // Test 1: Does the label appear?
  it('renders the label', () => {
    const { getByText } = render(
      <AuthInput
        label="Phone Number"
        placeholder="Enter your phone"
        value=""
        onChangeText={() => {}}
      />
    );
    expect(getByText('Phone Number')).toBeTruthy();
  });

  // Test 2: Does the placeholder appear?
  it('renders the placeholder', () => {
    const { getByPlaceholderText } = render(
      <AuthInput
        label="Phone Number"
        placeholder="Enter your phone"
        value=""
        onChangeText={() => {}}
      />
    );
    expect(getByPlaceholderText('Enter your phone')).toBeTruthy();
  });

  // Test 3: When user types, does onChangeText get called?
  it('calls onChangeText when user types', () => {
    // jest.fn() creates a fake function that records calls
    const mockOnChange = jest.fn();

    const { getByPlaceholderText } = render(
      <AuthInput
        label="Phone Number"
        placeholder="Enter your phone"
        value=""
        onChangeText={mockOnChange}
      />
    );

    // fireEvent simulates the user typing
    fireEvent.changeText(getByPlaceholderText('Enter your phone'), '0911223344');

    // Did our fake function get called with the right value?
    expect(mockOnChange).toHaveBeenCalledWith('0911223344');
  });

  // Test 4: Does the error message show up?
  it('shows error message when error prop is provided', () => {
    const { getByText } = render(
      <AuthInput
        label="Phone"
        placeholder="Enter phone"
        value=""
        onChangeText={() => {}}
        error="Phone is required"
      />
    );
    expect(getByText('Phone is required')).toBeTruthy();
  });

  // Test 5: No error when error prop is not passed
  it('does not show error when error prop is absent', () => {
    const { queryByText } = render(
      <AuthInput
        label="Phone"
        placeholder="Enter phone"
        value=""
        onChangeText={() => {}}
      />
    );
    // queryByText returns null instead of throwing — good for "should NOT exist" checks
    expect(queryByText('Phone is required')).toBeNull();
  });

});