import React from 'react';
import { Check, Save, Trash2, X } from 'lucide-react';
import {
  AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription,
  AlertDialogFooter, AlertDialogHeader, AlertDialogTitle,
} from '@/components/ui/alert-dialog';
import { Sheet, SheetContent, SheetDescription, SheetHeader, SheetTitle } from '@/components/ui/sheet';
import {
  EVENT_BUDGET_CATEGORIES, type EventBudgetExpense, type EventBudgetExpenseInput, parseCurrencyInput,
} from '@/lib/eventBudget';
import type { CurrencyCode } from '@/lib/currencyPricing';
import { CURRENCY_PREFIX } from '@/lib/liveCurrencyPricing';
import styles from './EventBudgetPlanner.module.css';

interface ExpenseDrawerProps {
  open: boolean;
  eventId: string;
  currency: CurrencyCode;
  expense: EventBudgetExpense | null;
  saving: boolean;
  deleting: boolean;
  returnFocusRef: React.RefObject<HTMLButtonElement>;
  onSave: (input: EventBudgetExpenseInput) => Promise<void>;
  onDelete: () => Promise<void>;
  onClose: () => void;
}

interface ExpenseFormState {
  category: string; customCategory: string; vendorName: string;
  contactPerson: string; phone: string; email: string; address: string;
  estimatedCost: string; actualCost: string; amountPaid: string;
  paymentDate: string; balanceDueDate: string; notes: string;
}

const makeForm = (expense: EventBudgetExpense | null): ExpenseFormState => ({
  category: expense?.category ?? '', customCategory: expense?.custom_category ?? '',
  vendorName: expense?.vendor_name ?? '',
  contactPerson: expense?.contact_person ?? '', phone: expense?.phone ?? '', email: expense?.email ?? '',
  address: expense?.address ?? '', estimatedCost: expense?.estimated_cost?.toFixed(2) ?? '',
  actualCost: expense?.actual_cost?.toFixed(2) ?? '', amountPaid: expense?.amount_paid?.toFixed(2) ?? '',
  paymentDate: expense?.payment_date ?? '', balanceDueDate: expense?.balance_due_date ?? '', notes: expense?.notes ?? '',
});

const optionalText = (value: string): string | null => value.trim() || null;
const isValidDateInput = (value: string): boolean => {
  if (!value) return true;
  if (!/^\d{4}-\d{2}-\d{2}$/.test(value)) return false;
  const [year, month, day] = value.split('-').map(Number);
  const parsed = new Date(Date.UTC(year, month - 1, day));
  return parsed.getUTCFullYear() === year && parsed.getUTCMonth() === month - 1 && parsed.getUTCDate() === day;
};

export const ExpenseDrawer: React.FC<ExpenseDrawerProps> = ({
  open, eventId, currency, expense, saving, deleting, returnFocusRef, onSave, onDelete, onClose,
}) => {
  const [form, setForm] = React.useState<ExpenseFormState>(() => makeForm(expense));
  const [initial, setInitial] = React.useState<ExpenseFormState>(() => makeForm(expense));
  const [errors, setErrors] = React.useState<Record<string, string>>({});
  const [submitError, setSubmitError] = React.useState('');
  const [confirmation, setConfirmation] = React.useState<'discard' | 'delete' | null>(null);
  const firstFieldRef = React.useRef<HTMLSelectElement>(null);

  React.useEffect(() => {
    if (!open) return;
    const next = makeForm(expense);
    setForm(next); setInitial(next); setErrors({}); setSubmitError(''); setConfirmation(null);
  }, [expense, open]);

  const dirty = JSON.stringify(form) !== JSON.stringify(initial);
  const update = (field: keyof ExpenseFormState) => (event: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement | HTMLSelectElement>) => {
    setForm(current => ({ ...current, [field]: event.target.value }));
    setErrors(current => ({ ...current, [field]: '' }));
  };

  const requestClose = () => dirty ? setConfirmation('discard') : onClose();

  const validate = (): EventBudgetExpenseInput | null => {
    const nextErrors: Record<string, string> = {};
    if (!form.category) nextErrors.category = 'Category is required.';
    if (form.category === 'Other' && !form.customCategory.trim()) nextErrors.customCategory = 'Enter a custom category.';
    if (form.email.trim() && !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(form.email.trim())) nextErrors.email = 'Enter a valid email address.';
    if (!isValidDateInput(form.paymentDate)) nextErrors.paymentDate = 'Enter a valid payment date.';
    if (!isValidDateInput(form.balanceDueDate)) nextErrors.balanceDueDate = 'Enter a valid balance due date.';

    const moneyFields = [['estimatedCost', form.estimatedCost], ['actualCost', form.actualCost], ['amountPaid', form.amountPaid]] as const;
    const parsed: Record<string, number | null> = {};
    moneyFields.forEach(([key, value]) => {
      if (!value.trim()) { parsed[key] = key === 'amountPaid' ? 0 : null; return; }
      parsed[key] = parseCurrencyInput(value);
      if (parsed[key] === null) nextErrors[key] = 'Enter a valid amount of zero or more, with up to two decimal places.';
    });
    setErrors(nextErrors);
    if (Object.values(nextErrors).some(Boolean)) return null;

    return {
      event_id: eventId,
      category: form.category,
      custom_category: form.category === 'Other' ? optionalText(form.customCategory) : null,
      // Keep legacy names when editing, but omit this retired field from new records.
      ...(expense ? { expense_name: expense.expense_name } : {}), vendor_name: optionalText(form.vendorName),
      contact_person: optionalText(form.contactPerson), phone: optionalText(form.phone), email: optionalText(form.email),
      address: optionalText(form.address), estimated_cost: parsed.estimatedCost,
      actual_cost: parsed.actualCost, amount_paid: parsed.amountPaid ?? 0,
      payment_date: optionalText(form.paymentDate), balance_due_date: optionalText(form.balanceDueDate),
      notes: optionalText(form.notes), display_order: expense?.display_order ?? 0,
    };
  };

  const submit = async (event: React.FormEvent) => {
    event.preventDefault();
    setSubmitError('');
    const input = validate();
    if (!input) return;
    try { await onSave(input); } catch (error) {
      setSubmitError(error instanceof Error ? error.message : 'The expense could not be saved. Your entries have been preserved.');
    }
  };

  const confirmDelete = async () => {
    try { await onDelete(); setConfirmation(null); } catch (error) {
      setSubmitError(error instanceof Error ? error.message : 'The expense could not be deleted.');
      setConfirmation(null);
    }
  };

  const field = (id: keyof ExpenseFormState, label: string, type = 'text', fullWidth = false) => (
    <label className={`${styles.formField} ${fullWidth ? styles.fullField : ''}`} htmlFor={`budget-${id}`}>
      <span>{label}</span>
      <input id={`budget-${id}`} type={type} value={form[id]} onChange={update(id)} min={type === 'number' ? '0' : undefined} step={type === 'number' ? '0.01' : undefined} aria-invalid={Boolean(errors[id])} />
      {errors[id] && <small role="alert">{errors[id]}</small>}
    </label>
  );

  return <>
    <Sheet open={open} onOpenChange={(next) => { if (!next) requestClose(); }}>
      <SheetContent
        side="right"
        className={`w-full sm:max-w-[42rem] p-0 flex flex-col overflow-hidden ${styles.drawer}`}
        onEscapeKeyDown={(event) => { event.preventDefault(); requestClose(); }}
        onInteractOutside={(event) => { if (dirty) { event.preventDefault(); setConfirmation('discard'); } }}
        onOpenAutoFocus={(event) => { event.preventDefault(); window.setTimeout(() => firstFieldRef.current?.focus(), 0); }}
        onCloseAutoFocus={(event) => { event.preventDefault(); returnFocusRef.current?.focus(); }}
      >
        <SheetHeader className={styles.drawerHeader}>
          <SheetTitle>{expense ? 'Edit Expense' : 'Add Expense'}</SheetTitle>
          <SheetDescription className="sr-only">{expense ? 'Update or delete this event budget expense.' : 'Add an expense to the selected event budget.'}</SheetDescription>
          <button type="button" className={styles.drawerClose} onClick={requestClose} aria-label="Close expense drawer"><X size={19} /></button>
        </SheetHeader>
        <form className={styles.drawerForm} onSubmit={submit} noValidate>
          <div className={styles.formGrid}>
            <label className={styles.formField} htmlFor="budget-category"><span>Category</span>
              <select id="budget-category" ref={firstFieldRef} value={form.category} onChange={update('category')} aria-invalid={Boolean(errors.category)}>
                <option value="">Select a category</option>{EVENT_BUDGET_CATEGORIES.map(category => <option key={category}>{category}</option>)}
              </select>{errors.category && <small role="alert">{errors.category}</small>}
            </label>
            {field('vendorName', 'Business Name')}
            {form.category === 'Other' && field('customCategory', 'Custom Category', 'text', true)}
            {field('contactPerson', 'Contact Person')}{field('phone', 'Contact Phone Number', 'tel')}
            {field('email', 'Email Address', 'email', true)}
            <label className={`${styles.formField} ${styles.fullField}`} htmlFor="budget-address"><span>Address</span><textarea id="budget-address" value={form.address} onChange={update('address')} rows={2} /></label>
            {field('estimatedCost', `Budgeted Cost (${currency} ${CURRENCY_PREFIX[currency]})`, 'number')}{field('actualCost', `Actual Cost (${currency} ${CURRENCY_PREFIX[currency]})`, 'number')}
            {field('amountPaid', `Amount Paid or Deposit (${currency} ${CURRENCY_PREFIX[currency]})`, 'number')}{field('paymentDate', 'Payment Date', 'date')}
            {field('balanceDueDate', 'Balance Due Date', 'date')}
            <label className={`${styles.formField} ${styles.fullField}`} htmlFor="budget-notes"><span>Notes</span><textarea id="budget-notes" value={form.notes} onChange={update('notes')} rows={4} /></label>
          </div>
          {submitError && <p className={styles.formError} role="alert">{submitError}</p>}
          <div className={styles.drawerActions}>
            {expense && <button type="button" className={styles.dangerButton} onClick={() => setConfirmation('delete')} disabled={saving || deleting}><Trash2 size={16} />Delete Expense</button>}
            <button type="button" className={styles.dangerButton} onClick={requestClose} disabled={saving || deleting}><X size={16} aria-hidden="true" />Cancel</button>
            <button type="submit" className={styles.successButton} disabled={saving || deleting}>{saving ? <><span className={styles.spinner} />Saving…</> : <><Save size={16} />{expense ? 'Save Changes' : 'Save Expense'}</>}</button>
          </div>
        </form>
      </SheetContent>
    </Sheet>

    <AlertDialog open={confirmation !== null} onOpenChange={(next) => { if (!next) setConfirmation(null); }}>
      <AlertDialogContent className={styles.confirmDialog}>
        <AlertDialogHeader><AlertDialogTitle>{confirmation === 'delete' ? 'Delete this expense?' : 'Discard unsaved changes?'}</AlertDialogTitle>
          <AlertDialogDescription>{confirmation === 'delete'
            ? `${expense?.vendor_name || expense?.expense_name || expense?.custom_category || expense?.category || 'This expense'} will be permanently removed from this event budget.`
            : 'Your changes have not been saved. Close the drawer and discard them?'}</AlertDialogDescription></AlertDialogHeader>
        <AlertDialogFooter><AlertDialogCancel>Keep Editing</AlertDialogCancel>
          <AlertDialogAction className={confirmation === 'delete' ? styles.dangerButton : styles.successButton} onClick={(event) => {
            event.preventDefault();
            if (confirmation === 'delete') void confirmDelete(); else { setConfirmation(null); onClose(); }
          }}>{confirmation === 'delete' ? <><Trash2 size={16} />Delete Expense</> : <><Check size={16} />Discard Changes</>}</AlertDialogAction></AlertDialogFooter>
      </AlertDialogContent>
    </AlertDialog>
  </>;
};
