import React, { useState, useRef } from 'react';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Input } from "@/components/ui/input";

interface TimePickerProps {
  value?: string;
  onChange: (time: string) => void;
  placeholder?: string;
  disabled?: boolean;
}

export const TimePicker: React.FC<TimePickerProps> = ({
  value,
  onChange,
  placeholder = "Select time",
  disabled = false
}) => {
  const [isManualInput, setIsManualInput] = useState(false);
  const [manualValue, setManualValue] = useState('');

  // Generate time options for every minute
  const generateTimeOptions = () => {
    const options = [];
    for (let hour = 0; hour < 24; hour++) {
      for (let minute = 0; minute < 60; minute++) {
        const timeString = `${hour.toString().padStart(2, '0')}:${minute.toString().padStart(2, '0')}`;
        const displayTime = formatDisplayTime(timeString);
        options.push({ value: timeString, label: displayTime });
      }
    }
    return options;
  };

  // Convert 24-hour format to 12-hour AM/PM display
  const formatDisplayTime = (time: string) => {
    if (!time) return '';
    const [hour, minute] = time.split(':');
    const hourNum = parseInt(hour);
    const ampm = hourNum >= 12 ? 'PM' : 'AM';
    const displayHour = hourNum % 12 || 12;
    return `${displayHour}:${minute} ${ampm}`;
  };

  // Convert 12-hour AM/PM format to 24-hour format for database
  const parseTimeInput = (input: string): string | null => {
    if (!input) return null;
    
    // Remove extra spaces and convert to uppercase
    const cleanInput = input.trim().toUpperCase();
    
    // Match patterns like "4:05 PM", "11:45AM", "4PM", "4:05"
    const timeRegex = /^(\d{1,2})(?::(\d{2}))?\s*(AM|PM)?$/i;
    const match = cleanInput.match(timeRegex);
    
    if (!match) return null;
    
    let hour = parseInt(match[1]);
    const minute = parseInt(match[2] || '0');
    const period = match[3];
    
    // Validate ranges
    if (hour < 1 || hour > 12) return null;
    if (minute < 0 || minute > 59) return null;
    
    // Convert to 24-hour format
    if (period === 'PM' && hour !== 12) {
      hour += 12;
    } else if (period === 'AM' && hour === 12) {
      hour = 0;
    }
    
    return `${hour.toString().padStart(2, '0')}:${minute.toString().padStart(2, '0')}`;
  };

  const timeOptions = generateTimeOptions();

  const handleManualInput = (inputValue: string) => {
    setManualValue(inputValue);
    
    const parsedTime = parseTimeInput(inputValue);
    if (parsedTime) {
      onChange(parsedTime);
    }
  };

  const displayValue = value ? formatDisplayTime(value) : '';

  if (isManualInput) {
    return (
      <Input
        value={manualValue}
        onChange={(e) => handleManualInput(e.target.value)}
        onBlur={() => {
          setIsManualInput(false);
          setManualValue('');
        }}
        placeholder="e.g. 4:30 PM"
        className="w-full"
        autoFocus
        disabled={disabled}
      />
    );
  }

  return (
    <Select 
      value={value} 
      onValueChange={onChange} 
      disabled={disabled}
      onOpenChange={(open) => {
        if (!open) return;
        // Allow switching to manual input by typing
        const handleKeyDown = (e: KeyboardEvent) => {
          if (e.key.match(/[0-9]/)) {
            setIsManualInput(true);
            setManualValue(e.key);
            document.removeEventListener('keydown', handleKeyDown);
          }
        };
        document.addEventListener('keydown', handleKeyDown);
        setTimeout(() => document.removeEventListener('keydown', handleKeyDown), 3000);
      }}
    >
      <SelectTrigger className="w-full">
        <SelectValue placeholder={placeholder}>
          {displayValue || placeholder}
        </SelectValue>
      </SelectTrigger>
      <SelectContent className="max-h-[200px]">
        <SelectItem value="manual" onSelect={() => setIsManualInput(true)}>
          <span className="text-muted-foreground italic">Type time manually...</span>
        </SelectItem>
        {timeOptions.map((option) => (
          <SelectItem key={option.value} value={option.value}>
            {option.label}
          </SelectItem>
        ))}
      </SelectContent>
    </Select>
  );
};