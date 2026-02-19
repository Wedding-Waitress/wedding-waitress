

# Update Running Sheet Default Rows to Match Your Template

## What Changes

Only **one file** is modified: `src/hooks/useRunningSheet.ts` -- specifically the `DEFAULT_ROWS` array (lines 14-25).

The current 10 generic rows will be replaced with your exact wedding running sheet template from the screenshot.

## New Default Rows (from your screenshot)

| # | TIME | EVENT | WHO |
|---|------|-------|-----|
| 1 | 3.00 | Guests Arrive | |
| 2 | **3.30** | **Ceremony** | Celebrant |
| 3 | 4.00 | Group & Family Photos | Photographer |
| 4 | 4.30 | Pre-Dinner Drinks & Canapes | Venue |
| 5 | **6.00** | **Reception doors open & Guests Seated** | Venue |
| 6 | 6.30 | Bridal Party Introduction | DJ / Band & MC, Photographer & Video |
| 7 | **7.00** | **Entree Served** | Venue |
| 8 | 7.30 | Cake Cutting & Toasting for Photos, Bridal Dance, Bridal Party Dance with Wedding Couple, Dance Floor Open for All Guests | DJ / Band & MC, Photographer & Video |
| 9 | **8.00** | **Main Meals Served** | Venue |
| 10 | 8.30 | Speeches | MC, Photographer & Video |
| 11 | 9.00 | Games then Dance Bracket (The Shoe Game, The Photo Dash, Dance Floor opened) | DJ / Band & MC, Photographer & Video |
| 12 | 10.30 | Flower Toss, Garter Toss, Farewell Circle or Arch! | DJ / Band & MC, Photographer & Video |
| 13 | **11.00** | **Conclusion** | |

That is **13 rows** replacing the current 10.

## Technical Detail

- File: `src/hooks/useRunningSheet.ts`, lines 14-25
- Replace the `DEFAULT_ROWS` array with the 13 rows above
- Bold/header rows (3.30 Ceremony, 6.00 Reception, 7.00 Entree, 8.00 Main Meals, 11.00 Conclusion) will use `is_section_header: true` so they can be styled with bold text
- Multi-line event descriptions (rows 6, 8, 10, 11, 12) will include bullet points in the `description_rich.text` field
- No other files are changed

