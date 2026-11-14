import React from 'react';
import { Select, SelectTrigger, SelectValue, SelectContent, SelectItem } from '@/components/ui/select';
import { guestDietaryOptions } from './guestDietaryOptions';
import styles from './GuestDietarySelect.module.css';

export function GuestDietarySelect({ id, value, onChange, disabled = false }: { id: string; value: string; onChange: (value: string) => void; disabled?: boolean }) {
  const options: readonly string[] = value && !guestDietaryOptions.includes(value as typeof guestDietaryOptions[number])
    ? [value, ...guestDietaryOptions] : guestDietaryOptions;
  return (
    <Select value={value || 'NA'} onValueChange={onChange} disabled={disabled}>
      <SelectTrigger id={id} className={`border-primary h-11 w-full min-w-0 text-base ${styles.trigger}`}>
        <SelectValue />
      </SelectTrigger>
      <SelectContent className={`ww-public-live-menu ${styles.menu}`} position="popper" collisionPadding={12}>
        {options.map(option => <SelectItem key={option} value={option} className={styles.option}>{option}</SelectItem>)}
      </SelectContent>
    </Select>
  );
}
