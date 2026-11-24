import React from 'react';
import { cleanup, fireEvent, render, screen } from '@testing-library/react';
import { afterEach, describe, expect, it, vi } from 'vitest';
import { RelationSelector } from './RelationSelector';

vi.mock('@/hooks/use-toast', () => ({ useToast: () => ({ toast: vi.fn() }) }));
vi.mock('@/integrations/supabase/client', () => ({
  supabase: { from: vi.fn(() => ({ update: vi.fn(() => ({ eq: vi.fn() })) })) },
}));

afterEach(cleanup);

describe('RelationSelector approved relationship choices', () => {
  it.each([375, 768, 1440])('shows the same ten options for both partners at %ipx', (width) => {
    Object.defineProperty(window, 'innerWidth', { configurable: true, value: width });
    render(
      <RelationSelector
        value={{ partner: '', role: '' }}
        onChange={vi.fn()}
        partner1Name="Hossam"
        partner2Name="Reema"
        isOpen
        onToggle={vi.fn()}
        customRoles={['Guest']}
        eventId="event-1"
      />
    );

    for (const label of ['Bridal Party', 'Father', 'Mother', 'Brother', 'Sister', 'Cousin', 'Uncle', 'Auntie', 'Guest', 'Vendor']) {
      expect(screen.getAllByText(label)).toHaveLength(2);
    }
    expect(screen.getAllByText('Guest')).toHaveLength(2);
    expect(screen.getAllByText('Organizer')).toHaveLength(2);
    expect(screen.getAllByText('Bride')).toHaveLength(1);
    expect(screen.getAllByText('Groom')).toHaveLength(1);
  });

  it('saves the manually selected Bride and supports Organizer for a single-person event',()=>{
    const onChange=vi.fn();
    const {rerender}=render(<RelationSelector value={{partner:'',role:''}} onChange={onChange} isOpen onToggle={vi.fn()} eventId="event"/>);
    fireEvent.click(screen.getByText('Bride'));fireEvent.click(screen.getByRole('button',{name:'Select',exact:true}));
    expect(onChange).toHaveBeenCalledWith('partner_one','bride');
    rerender(<RelationSelector value={{partner:'',role:''}} onChange={onChange} isOpen onToggle={vi.fn()} eventId="event" isSinglePerson/>);
    expect(screen.getAllByText('Organizer')).toHaveLength(1);
    fireEvent.click(screen.getByText('Organizer'));fireEvent.click(screen.getByRole('button',{name:'Select',exact:true}));
    expect(onChange).toHaveBeenLastCalledWith('partner_one','organizer');
  });

  it('retains a saved Guest relationship without mutating it', () => {
    const onChange = vi.fn();
    render(
      <RelationSelector
        value={{ partner: 'partner_one', role: 'guest' }}
        onChange={onChange}
        isOpen
        onToggle={vi.fn()}
        eventId="event-1"
      />
    );

    expect(screen.getByText('Partner 1 / Guest')).toBeInTheDocument();
    expect(onChange).not.toHaveBeenCalled();
  });
});
