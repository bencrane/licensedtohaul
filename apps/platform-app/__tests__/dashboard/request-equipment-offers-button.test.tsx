// @vitest-environment jsdom
import { describe, it, expect, afterEach } from 'vitest';
import { render, screen, fireEvent, act, cleanup } from '@testing-library/react';
import React from 'react';
import RequestEquipmentOffersButton from '@/components/dashboard/RequestEquipmentOffersButton';

describe('RequestEquipmentOffersButton', () => {
  afterEach(() => cleanup());

  it('renders the trigger button with the expected label', () => {
    render(React.createElement(RequestEquipmentOffersButton));
    expect(
      screen.queryByRole('button', { name: /Request offers for new equipment/i }),
    ).not.toBeNull();
  });

  it('is closed by default — no dialog rendered until clicked', () => {
    render(React.createElement(RequestEquipmentOffersButton));
    expect(screen.queryByRole('dialog')).toBeNull();
  });

  it('opens the dialog when the trigger is clicked', () => {
    render(React.createElement(RequestEquipmentOffersButton));
    const trigger = screen.getByRole('button', {
      name: /Request offers for new equipment/i,
    });
    fireEvent.click(trigger);

    const dialog = screen.queryByRole('dialog');
    expect(dialog).not.toBeNull();
    expect(screen.queryByText('Request equipment offers')).not.toBeNull();
  });

  it('closes when the X / Cancel button is clicked', () => {
    render(React.createElement(RequestEquipmentOffersButton));
    fireEvent.click(
      screen.getByRole('button', { name: /Request offers for new equipment/i }),
    );
    expect(screen.queryByRole('dialog')).not.toBeNull();

    fireEvent.click(screen.getByRole('button', { name: /Cancel/i }));
    expect(screen.queryByRole('dialog')).toBeNull();
  });

  it('closes when Escape is pressed', () => {
    render(React.createElement(RequestEquipmentOffersButton));
    fireEvent.click(
      screen.getByRole('button', { name: /Request offers for new equipment/i }),
    );
    expect(screen.queryByRole('dialog')).not.toBeNull();

    fireEvent.keyDown(document, { key: 'Escape' });
    expect(screen.queryByRole('dialog')).toBeNull();
  });

  it('submitting the form transitions to the success state', async () => {
    render(React.createElement(RequestEquipmentOffersButton));
    fireEvent.click(
      screen.getByRole('button', { name: /Request offers for new equipment/i }),
    );

    // Fill required numeric fields
    const unitsInput = screen.getByRole('spinbutton', { name: /Units/i });
    const amountInput = screen.getByRole('spinbutton', {
      name: /Target amount/i,
    });
    fireEvent.change(unitsInput, { target: { value: '2' } });
    fireEvent.change(amountInput, { target: { value: '150000' } });

    // Submit
    const submit = screen.getByRole('button', { name: /Send request/i });
    await act(async () => {
      fireEvent.click(submit);
      // Component awaits a 600ms simulated network delay before flipping to success.
      await new Promise((r) => setTimeout(r, 700));
    });

    expect(screen.queryByText('Request sent')).not.toBeNull();
    expect(screen.queryByRole('button', { name: /Done/i })).not.toBeNull();
  });
});
