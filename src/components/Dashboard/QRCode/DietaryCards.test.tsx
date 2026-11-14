import React from 'react';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { cleanup, fireEvent, render, screen } from '@testing-library/react';
import { DietaryCards, DietaryCardsSheet, dietaryCardLocation, dietaryCardPages } from './DietaryCards';
const guest = (id: number, dietary = 'Vegetarian') => ({ id: String(id), first_name: `Guest ${id}`, last_name: 'Example', dietary, table_display: '1', seat_no: id });
beforeEach(() => {
  vi.stubGlobal('ResizeObserver', class { observe() {} disconnect() {} });
  HTMLDialogElement.prototype.showModal = function () { this.setAttribute('open', ''); };
  HTMLDialogElement.prototype.close = function () { this.removeAttribute('open'); };
});
afterEach(() => { cleanup(); vi.unstubAllGlobals(); });
describe('dietary cards', () => {
  it('prints one card per eligible guest, with six cards on each A4 sheet', () => {
    const pages = dietaryCardPages([...Array.from({ length: 7 }, (_, i) => guest(i)), guest(8, ' N/A '), guest(9, 'none'), guest(10, ' ')]);
    expect(pages.map(p => p.length)).toEqual([6, 1]);
    expect(pages.flat().map(g => g.id)).toEqual(['0', '1', '2', '3', '4', '5', '6']);
  });
  it('keeps all dietary wording and duplicates the same details on both faces', () => {
    const ref = React.createRef<HTMLDivElement>();
    render(<DietaryCardsSheet sheetRef={ref} guests={[guest(7, 'Vegetarian; Severe nut allergy — no peanuts or almonds')]} eventName="Wedding" pageIndex={0} totalPages={1}/>);
    expect(screen.getAllByText('Vegetarian; Severe nut allergy — no peanuts or almonds')).toHaveLength(2);
    expect(screen.getAllByText('Guest 7 Example')).toHaveLength(2);
    expect(screen.getAllByText('Table 1 · Seat 7')).toHaveLength(2);
    expect(ref.current?.dataset.printMirrorDocument).toBe('dietary-cards');
    expect(ref.current?.textContent).not.toContain('Wedding');
    expect(ref.current?.textContent).not.toContain('Fold');
    expect(ref.current?.textContent).not.toContain('Cut around');
    expect(ref.current?.querySelectorAll('.ww-dietary-cards-cut-guide')).toHaveLength(3);
  });
  it('labels unassigned seats and tables explicitly', () => {
    expect(dietaryCardLocation({ ...guest(1), table_display: '-', seat_no: null })).toBe('Table unassigned · Seat unassigned');
  });
  it('opens the preview, paginates, and follows realtime guest changes', () => {
    const guests = Array.from({ length: 7 }, (_, i) => guest(i));
    const { rerender } = render(<DietaryCards guests={guests} eventId="event" eventName="Wedding"/>);
    fireEvent.click(screen.getByRole('button', { name: 'Dietary Cards' }));
    expect(screen.getByRole('dialog', { name: 'Dietary Cards' })).toBeTruthy();
    expect(document.querySelectorAll('.ww-dietary-card')).toHaveLength(6);
    fireEvent.click(screen.getByRole('button', { name: 'Next' }));
    expect(document.querySelectorAll('.ww-dietary-card')).toHaveLength(1);
    expect(screen.getByText('Sheet 2 of 2')).toBeTruthy();
    rerender(<DietaryCards guests={[guest(0, 'Gluten Free, Dairy Free')]} eventId="event" eventName="Wedding"/>);
    expect(screen.getAllByText('Gluten Free, Dairy Free')).toHaveLength(2);
    expect(screen.getByText('Sheet 1 of 1')).toBeTruthy();
    fireEvent.click(screen.getByRole('button', { name: 'Close' }));
    expect(screen.queryByRole('dialog')).toBeNull();
  });
  it('blocks opening for a read-only/disabled context and an empty list', () => {
    const { rerender } = render(<DietaryCards guests={[guest(1)]} eventId="event" eventName="Wedding" disabled/>);
    expect((screen.getByRole('button', { name: 'Dietary Cards' }) as HTMLButtonElement).disabled).toBe(true);
    rerender(<DietaryCards guests={[]} eventId="event" eventName="Wedding"/>);
    expect((screen.getByRole('button', { name: 'Dietary Cards' }) as HTMLButtonElement).disabled).toBe(true);
  });
});
