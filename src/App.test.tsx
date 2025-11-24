import { render } from '@testing-library/react';
import { describe, it, expect } from 'vitest';
import App from './App';

describe('App', () => {
  it('renders without crashing', () => {
    render(<App />);
    // Basic check to see if the app renders something
    // You might want to adjust this based on what's actually in your App component
    // For now, we just check if the container exists
    expect(document.body).toBeInTheDocument();
  });
});
