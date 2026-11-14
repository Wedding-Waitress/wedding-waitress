import React from 'react';
import { fireEvent, render, screen, waitFor } from '@testing-library/react';
import { afterEach, beforeAll, describe, expect, it, vi } from 'vitest';
import { AddGuestModal } from './AddGuestModal';

beforeAll(() => { HTMLElement.prototype.scrollIntoView = vi.fn(); });
afterEach(() => {
  Object.defineProperty(window, 'innerWidth', { configurable: true, writable: true, value: 1024 });
});

vi.mock('@/hooks/use-toast', () => ({ useToast: () => ({ toast: vi.fn() }) }));
vi.mock('@/hooks/useTables', () => ({
  useTables: () => ({ tables: [], fetchTables: vi.fn().mockResolvedValue(undefined) }),
}));
vi.mock('@/hooks/useEvents', () => ({
  useEvents: () => ({
    events: [{ id: 'event-1', user_id: 'owner-1', relation_mode: 'off', partner1_name: 'Hossam', partner2_name: 'Reema' }],
  }),
}));
vi.mock('@/integrations/supabase/client', () => ({
  supabase: {
    from: vi.fn((table: string) => {
      const builder: Record<string, ReturnType<typeof vi.fn>> = {};
      builder.select = vi.fn(() => builder);
      builder.eq = vi.fn(() => builder);
      builder.order = vi.fn().mockResolvedValue({
        data: table === 'guests'
          ? [{ id: 'guest-1', first_name: 'Nader', last_name: 'Elalfy', family_group: 'Elalfy Family' }]
          : null,
        error: null,
      });
      builder.single = vi.fn().mockResolvedValue({ data: null, error: null });
      return builder;
    }),
    auth: { getUser: vi.fn().mockResolvedValue({ data: { user: { id: 'owner-1' } } }) },
  },
}));
vi.mock('./RelationSelector', () => ({ RelationSelector: () => null }));
vi.mock('./GroupTypeDialog', () => ({ GroupTypeDialog: () => null }));
vi.mock('./RelationAssignmentDialog', () => ({ RelationAssignmentDialog: () => null }));

const renderModal = (width: number) => {
  Object.defineProperty(window, 'innerWidth', { configurable: true, writable: true, value: width });
  window.dispatchEvent(new Event('resize'));
  return render(
    <AddGuestModal
      isOpen
      onClose={vi.fn()}
      onGuestAdded={vi.fn()}
      eventId="event-1"
      relationsHidden
    />,
  );
};

const editGuest = {
  id: 'guest-1',
  first_name: 'Nader',
  last_name: 'Elalfy',
  table_id: null,
  seat_no: null,
  rsvp: 'Pending',
  dietary: 'NA',
  mobile: null,
  email: 'nader@example.test',
  notes: null,
  family_group: 'Elalfy Family',
  relation_partner: 'partner_two',
  relation_role: 'father',
  relation_display: 'Reema / Father',
};

const savedCategoryGuests = [
  { id: 'individual-1', family_group: null },
  { id: 'couple-1', family_group: 'Mia & Noah Couple' },
  { id: 'couple-2', family_group: 'Mia & Noah Couple' },
  { id: 'family-1', family_group: 'Elalfy Family' },
  { id: 'family-2', family_group: 'Elalfy Family' },
  { id: 'family-3', family_group: 'Elalfy Family' },
  { id: 'family-4', family_group: 'Elalfy Family' },
];

const categoryEditGuest = (id: string, firstName: string, familyGroup: string | null) => ({
  ...editGuest,
  id,
  first_name: firstName,
  family_group: familyGroup,
});

const expectSelectedCategory = async (category: 'Individual' | 'Couple' | 'Family') => {
  const track = screen.getByRole('group', { name: 'Guest Category' });
  await waitFor(() => expect(track).toHaveAttribute('data-active-category', category.toLowerCase()));
  expect(screen.getByRole('button', { name: category })).toHaveAttribute('aria-pressed', 'true');
};

const renderEditModal = () => render(
  <AddGuestModal
    isOpen
    onClose={vi.fn()}
    onGuestAdded={vi.fn()}
    eventId="event-1"
    editGuest={editGuest}
    isEdit
    relationsHidden
  />,
);

describe('AddGuestModal family member editor', () => {
  it('opens an authoritative Individual with the pink Individual selection', async () => {
    render(
      <AddGuestModal
        isOpen
        onClose={vi.fn()}
        onGuestAdded={vi.fn()}
        eventId="event-1"
        editGuest={categoryEditGuest('individual-1', 'Alice', null)}
        savedEventGuests={savedCategoryGuests}
        isEdit
        relationsHidden
      />,
    );
    await expectSelectedCategory('Individual');
  });

  it.each([
    ['couple-1', 'Mia'],
    ['couple-2', 'Noah'],
  ])('opens Couple member %s with the orange Couple selection', async (id, firstName) => {
    render(
      <AddGuestModal
        isOpen
        onClose={vi.fn()}
        onGuestAdded={vi.fn()}
        eventId="event-1"
        editGuest={categoryEditGuest(id, firstName, 'Mia & Noah Couple')}
        savedEventGuests={savedCategoryGuests}
        isEdit
        relationsHidden
      />,
    );
    await expectSelectedCategory('Couple');
  });

  it.each([
    ['family-1', 'Nader'],
    ['family-2', 'Nahla'],
    ['family-3', 'Kamal'],
    ['family-4', 'Hala'],
  ])('opens Family member %s with the blue Family selection', async (id, firstName) => {
    render(
      <AddGuestModal
        isOpen
        onClose={vi.fn()}
        onGuestAdded={vi.fn()}
        eventId="event-1"
        editGuest={categoryEditGuest(id, firstName, 'Elalfy Family')}
        savedEventGuests={savedCategoryGuests}
        isEdit
        relationsHidden
      />,
    );
    await expectSelectedCategory('Family');
  });

  it.each([1440, 768, 390])('resets the saved category between consecutive guests at %ipx', async (width) => {
    Object.defineProperty(window, 'innerWidth', { configurable: true, writable: true, value: width });
    window.dispatchEvent(new Event('resize'));
    const baseProps = {
      isOpen: true,
      onClose: vi.fn(),
      onGuestAdded: vi.fn(),
      eventId: 'event-1',
      savedEventGuests: savedCategoryGuests,
      isEdit: true,
      relationsHidden: true,
    };
    const { rerender } = render(
      <AddGuestModal {...baseProps} editGuest={categoryEditGuest('family-1', 'Nader', 'Elalfy Family')} />,
    );
    await expectSelectedCategory('Family');

    rerender(<AddGuestModal {...baseProps} editGuest={categoryEditGuest('couple-2', 'Noah', 'Mia & Noah Couple')} />);
    await expectSelectedCategory('Couple');

    rerender(<AddGuestModal {...baseProps} editGuest={categoryEditGuest('individual-1', 'Alice', null)} />);
    await expectSelectedCategory('Individual');
  });

  it('opens a one-person saved group as Individual and converts it to a Couple with one member', async () => {
    renderEditModal();
    await waitFor(() => expect(screen.getByRole('button', { name: 'Individual' })).toHaveAttribute('aria-pressed', 'true'));
    expect(screen.queryByText('Guest Group Type')).not.toBeInTheDocument();

    fireEvent.click(screen.getByRole('button', { name: 'Couple' }));
    fireEvent.click(screen.getByRole('button', { name: 'Add your partner to make you a couple' }));
    fireEvent.change(screen.getByPlaceholderText('First name'), { target: { value: 'Nahla' } });
    fireEvent.change(screen.getByPlaceholderText('Last name'), { target: { value: 'Elalfy' } });
    fireEvent.click(screen.getByRole('button', { name: 'Add Member' }));

    expect(screen.getByText('Members (1)')).toBeInTheDocument();
    expect(screen.getByRole('button', { name: 'Add your partner to make you a couple' })).toBeDisabled();
  });

  it('converts an Individual to Family, allows multiple pending members, and discards them on cancel', async () => {
    const onClose = vi.fn();
    render(
      <AddGuestModal
        isOpen
        onClose={onClose}
        onGuestAdded={vi.fn()}
        eventId="event-1"
        editGuest={editGuest}
        isEdit
        relationsHidden
      />,
    );
    await waitFor(() => expect(screen.getByRole('button', { name: 'Individual' })).toHaveAttribute('aria-pressed', 'true'));
    fireEvent.click(screen.getByRole('button', { name: 'Family' }));
    fireEvent.click(screen.getByRole('button', { name: 'Add another member to this family' }));
    fireEvent.change(screen.getByPlaceholderText('First name'), { target: { value: 'Nahla' } });
    fireEvent.change(screen.getByPlaceholderText('Last name'), { target: { value: 'Elalfy' } });
    fireEvent.click(screen.getByRole('button', { name: 'Add Member' }));
    expect(screen.getByRole('button', { name: 'Add another member to this family' })).not.toBeDisabled();

    const drawerCancel = screen.getAllByRole('button', { name: 'Cancel' }).at(-1)!;
    fireEvent.click(drawerCancel);
    expect(onClose).toHaveBeenCalledTimes(1);
    expect(screen.getByRole('button', { name: 'Individual' })).toHaveAttribute('aria-pressed', 'true');
    expect(screen.queryByText('Members (1)')).not.toBeInTheDocument();
  });

  it.each([1440, 768, 390])('keeps the requested family controls usable at %ipx', async (width) => {
    renderModal(width);
    fireEvent.click(screen.getByRole('button', { name: 'Family' }));
    fireEvent.click(screen.getByRole('button', { name: 'Add another member to this family' }));

    const badge = screen.getByText('Members (0)').parentElement;
    expect(badge).toHaveAttribute('data-has-members', 'false');

    fireEvent.change(screen.getByPlaceholderText('First name'), { target: { value: 'Nahla' } });
    fireEvent.change(screen.getByPlaceholderText('Last name'), { target: { value: 'Elalfy' } });
    fireEvent.change(screen.getByPlaceholderText('Mobile (optional)'), { target: { value: '+61404008408' } });
    fireEvent.change(screen.getByPlaceholderText('Email (optional)'), { target: { value: 'nahla@example.test' } });

    const addButton = screen.getByRole('button', { name: 'Add Member' });
    const cancelButton = screen.getAllByRole('button', { name: 'Cancel' })
      .find((button) => button.classList.contains('ww-emboss-red'));
    expect(addButton).toHaveClass('ww-emboss-green', 'text-white');
    expect(cancelButton).toHaveClass('ww-emboss-red', 'text-white');
    expect(addButton.compareDocumentPosition(cancelButton as Node) & Node.DOCUMENT_POSITION_FOLLOWING).toBeTruthy();
    fireEvent.click(addButton);

    const activeBadge = screen.getByText('Members (1)').parentElement;
    expect(activeBadge).toHaveAttribute('data-has-members', 'true');
    expect(screen.getByText('Nahla Elalfy')).toBeInTheDocument();
    const editButton = screen.getByRole('button', { name: 'Edit Guest' });
    const deleteButton = screen.getByRole('button', { name: 'Delete Guest' });
    expect(editButton).toBeInTheDocument();
    expect(deleteButton).toBeInTheDocument();
    expect(editButton.querySelector('svg')).toHaveClass('text-white');
    expect(deleteButton.querySelector('svg')).toHaveClass('text-white');
  });

  it('loads, changes and replaces an existing member without creating a duplicate', async () => {
    renderModal(1440);
    fireEvent.click(screen.getByRole('button', { name: 'Family' }));
    fireEvent.click(screen.getByRole('button', { name: 'Add another member to this family' }));
    fireEvent.change(screen.getByPlaceholderText('First name'), { target: { value: 'Nahla' } });
    fireEvent.change(screen.getByPlaceholderText('Last name'), { target: { value: 'Elalfy' } });
    fireEvent.change(screen.getByPlaceholderText('Mobile (optional)'), { target: { value: '+61404008408' } });
    fireEvent.change(screen.getByPlaceholderText('Email (optional)'), { target: { value: 'old@example.test' } });
    fireEvent.click(screen.getByRole('button', { name: 'Add Member' }));

    fireEvent.click(screen.getByRole('button', { name: 'Edit Guest' }));
    expect(screen.getByPlaceholderText('First name')).toHaveValue('Nahla');
    expect(screen.getByPlaceholderText('Last name')).toHaveValue('Elalfy');
    expect(screen.getByPlaceholderText('Mobile (optional)')).toHaveValue('+61404008408');
    expect(screen.getByPlaceholderText('Email (optional)')).toHaveValue('old@example.test');

    fireEvent.change(screen.getByPlaceholderText('First name'), { target: { value: 'Nahla Updated' } });
    fireEvent.change(screen.getByPlaceholderText('Mobile (optional)'), { target: { value: '' } });
    fireEvent.change(screen.getByPlaceholderText('Email (optional)'), { target: { value: 'new@example.test' } });
    fireEvent.click(screen.getByRole('button', { name: 'Save Changes' }));

    expect(screen.getByText('Members (1)')).toBeInTheDocument();
    expect(screen.getByText('Nahla Updated Elalfy')).toBeInTheDocument();
    expect(screen.queryByText('Nahla Elalfy')).not.toBeInTheDocument();
    expect(screen.getByText(/new@example\.test/)).toBeInTheDocument();
    expect(screen.queryByText(/old@example\.test/)).not.toBeInTheDocument();

    fireEvent.click(screen.getByRole('button', { name: 'Delete Guest' }));
    await waitFor(() => expect(screen.getByText('Members (0)')).toBeInTheDocument());
  });
});

it('associates Notes and family-member fields with their visible labels', async () => {
  renderModal(1280);
  expect(screen.getByLabelText('Notes').tagName).toBe('TEXTAREA');
    expect(screen.getByRole('dialog')).toHaveAccessibleDescription('Enter guest details and seating preferences, then save or cancel your changes.');
  fireEvent.click(screen.getByRole('button', {name:'Family'}));
  fireEvent.click(screen.getByRole('button', {name:'Add another member to this family'}));
  await waitFor(()=>expect(document.getElementById('party-member-first-name')).toBeTruthy());
  for(const [id,name] of [['first-name','First Name *'],['last-name','Last Name *'],['mobile','Mobile'],['email','Email']]) {
    expect(document.getElementById(`party-member-${id}`)).toHaveAccessibleName(name);
  }
});
