

## Fix: Debounce Text Content Input in Invitations Customizer

**Problem**: Every keystroke in the "Text Content" input calls `updateZone` → `onSettingsChange`, which re-renders the entire canvas preview.

**Solution**: Extract the text input into a small `DebouncedTextInput` component with local state for instant typing feedback and a 300ms debounced callback for canvas updates.

### Changes in `src/components/Dashboard/Invitations/InvitationCardCustomizer.tsx`

**1. Add a `DebouncedTextInput` component** at the top of the file (after imports):

```tsx
const DebouncedTextInput: React.FC<{
  value: string;
  onChange: (value: string) => void;
  placeholder?: string;
  className?: string;
}> = ({ value, onChange, placeholder, className }) => {
  const [localValue, setLocalValue] = useState(value);
  const timerRef = useRef<ReturnType<typeof setTimeout>>();

  useEffect(() => { setLocalValue(value); }, [value]);

  const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const v = e.target.value;
    setLocalValue(v);
    clearTimeout(timerRef.current);
    timerRef.current = setTimeout(() => onChange(v), 300);
  };

  useEffect(() => () => clearTimeout(timerRef.current), []);

  return <Input value={localValue} onChange={handleChange} placeholder={placeholder} className={className} />;
};
```

**2. Replace the Input** at line 242-247 with:

```tsx
<DebouncedTextInput
  value={zone.text || (zone.type === 'preset' && zone.preset_field ? eventData[zone.preset_field] || '' : '')}
  onChange={(v) => updateZone(zone.id, { text: v })}
  placeholder={...}
  className="mt-1"
/>
```

**3. Add `useRef` to imports** if not already present (it's already imported via React).

One file changed, no other functionality affected.

