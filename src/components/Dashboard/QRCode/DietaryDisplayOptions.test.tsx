import React from 'react';
import { fireEvent, render, screen } from '@testing-library/react';
import { describe, expect, it, vi } from 'vitest';
import { DietaryChartCustomizer } from './DietaryChartCustomizer';
import type { DietaryChartSettings } from '@/hooks/useDietaryChartSettings';

const settings: DietaryChartSettings = {
  sortBy: 'firstName', fontSize: 'standard', guestNameColor: '#000000',
  guestListColor: '#C62828', dietaryColor: '#1565C0', relationshipColor: '#2E7D32',
  seatNumberColor: '#967A59', showGuestNames: true, showGuestList: true,
  showDietary: true, showRelation: true, showSeatNumbers: true, showLogo: true,
  paperSize: 'A4', isBold: false, isItalic: false, isUnderline: false,
};

describe('Dietary Requirements display controls', () => {
  it('renders five ordered toggles with seven colours and no gold', () => {
    const onSettingsChange = vi.fn();
    render(<DietaryChartCustomizer settings={settings} onSettingsChange={onSettingsChange} />);
    const labels = ['Show Guest Names', 'Show Seat Numbers', 'Show Guest List', 'Show Dietary Requirements', 'Show Relationship'];
    const positions = labels.map(label => document.body.textContent!.indexOf(label));
    expect(positions).toEqual([...positions].sort((a, b) => a - b));
    expect(screen.getAllByRole('switch')).toHaveLength(5);
    expect(screen.queryByText('Show Mobile')).not.toBeInTheDocument();

    const groups = [
      ['guest names', 'guestNameColor'], ['seat numbers', 'seatNumberColor'],
      ['guest list', 'guestListColor'], ['dietary requirements', 'dietaryColor'],
      ['relationships', 'relationshipColor'],
    ] as const;
    groups.forEach(([name, key]) => {
      const buttons = screen.getByRole('group', { name: `${name} colour` }).querySelectorAll('button');
      expect(buttons).toHaveLength(7);
      expect(Array.from(buttons).map(button => (button as HTMLElement).style.backgroundColor)).toEqual([
        'rgb(0, 0, 0)', 'rgb(198, 40, 40)', 'rgb(21, 101, 192)', 'rgb(46, 125, 50)',
        'rgb(150, 122, 89)', 'rgb(126, 87, 194)', 'rgb(230, 126, 34)',
      ]);
      fireEvent.click(screen.getByRole('button', { name: `Use orange for ${name}` }));
      expect(onSettingsChange).toHaveBeenCalledWith({ [key]: '#E67E22' });
    });

    const toggleKeys = ['showGuestNames', 'showSeatNumbers', 'showGuestList', 'showDietary', 'showRelation'];
    screen.getAllByRole('switch').forEach((toggle, index) => {
      fireEvent.click(toggle);
      expect(onSettingsChange).toHaveBeenCalledWith({ [toggleKeys[index]]: false });
    });
  });
});
