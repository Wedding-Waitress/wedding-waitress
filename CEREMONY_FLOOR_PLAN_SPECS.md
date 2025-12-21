# 🔒 CEREMONY FLOOR PLAN SPECIFICATIONS

## ⚠️ PRODUCTION LOCKED STATUS

| Status | Lock Date | Approval Required |
|--------|-----------|-------------------|
| **LOCKED** | 2025-12-21 | **YES - Owner approval required for ANY modifications** |

---

## 📁 PROTECTED COMPONENT FILES

| File | Status | Purpose |
|------|--------|---------|
| `src/components/Dashboard/FloorPlan/FloorPlanPage.tsx` | ✅ LOCKED | Main page component with export controls |
| `src/components/Dashboard/FloorPlan/CeremonyFloorPlan/CeremonyFloorPlanSettings.tsx` | ✅ LOCKED | Settings panel with sliders and inputs |
| `src/components/Dashboard/FloorPlan/CeremonyFloorPlan/CeremonyFloorPlanVisual.tsx` | ✅ LOCKED | Interactive visual preview |
| `src/hooks/useCeremonyFloorPlan.ts` | ✅ LOCKED | Data hook with CRUD operations |
| `src/lib/ceremonyFloorPlanPdfExporter.ts` | ✅ LOCKED | PDF export engine |

---

## 🗄️ DATABASE TABLE

| Table Name | Type |
|------------|------|
| `ceremony_floor_plans` | Main data storage |

### Key Columns:
- `id`, `event_id`, `user_id`
- `chairs_per_row` (1-6)
- `total_rows` (1-15)
- `assigned_rows` (1 to total_rows)
- `left_side_label`, `right_side_label`, `altar_label`
- `seat_assignments` (JSON array)
- `bridal_party_left`, `bridal_party_right` (JSON arrays)
- `bridal_party_count_left`, `bridal_party_count_right` (0-12 each)
- `bridal_party_roles_left`, `bridal_party_roles_right` (JSON arrays)
- `couple_side_arrangement` ('groom_left' | 'bride_left')
- `person_left_name`, `person_right_name`
- `show_row_numbers`, `show_seat_numbers` (boolean)

---

## 📐 PDF EXPORT SPECIFICATIONS

### Page Dimensions
| Property | Value |
|----------|-------|
| Page Size | A4 (210mm × 297mm) |
| Orientation | Portrait |
| Left Margin | 15mm |
| Right Margin | 15mm |
| Top Margin | 15mm |
| Bottom Margin | 20mm |

### Seat Dimensions
| Element | Width | Height |
|---------|-------|--------|
| Seat Box | 12mm | 9mm |
| Seat Gap | 1.5mm | - |
| Row Gap | 2mm | - |
| Aisle Width | 20mm | - |

### Bridal Party Dimensions
| Element | Width | Height |
|---------|-------|--------|
| Bridal Party Box | 12mm | 9mm |
| Bridal Gap | 1mm | - |
| Bridal Row Gap | 2mm | - |
| Role Label Height | 3mm | - |

### Circle Dimensions
| Element | Radius |
|---------|--------|
| Couple Circle | 5.5mm |
| Celebrant Circle | 4.5mm |

### Font Sizes
| Element | Size |
|---------|------|
| Event Name | 14pt (bold) |
| Date/Time Line | 9pt |
| Venue/Generated | 10pt |
| Total Attending | 8pt |
| Side Labels | 9pt (bold) |
| Seat Names | 5.5pt |
| Seat Numbers | 5.5pt |
| Bridal Party Names | 5.5pt |
| Bridal Party Roles | 4.5pt (italic) |
| Celebrant Label | 4pt |
| Couple Names | 7pt |
| Row Numbers | 7pt |
| Walkway Text | 11pt (bold) |
| General Seating | 6pt |

### Colors
| Element | Color |
|---------|-------|
| Primary Purple | `#7248e6` (RGB: 114, 72, 230) |
| Filled Seat Border | Primary Purple |
| Empty Seat Border | `#B4B4B4` (RGB: 180, 180, 180) |
| General Seat Border | `#DCDCDC` (RGB: 220, 220, 220) |
| Row Numbers | `#646464` (RGB: 100, 100, 100) |
| Role Labels | `#787878` (RGB: 120, 120, 120) |

---

## 🖥️ SCREEN PREVIEW SPECIFICATIONS

### Seat Dimensions
| Element | Size (Tailwind) | Pixels |
|---------|-----------------|--------|
| Seat Box | `w-16 h-12` | 64px × 48px |
| Bridal Party Box | `w-16 h-12` | 64px × 48px |
| Couple Circle | `w-16 h-16` | 64px × 64px |
| Celebrant Circle | `w-14 h-14` | 56px × 56px |

### Layout Rules
- Max bridal party per row: 6
- Second row appears when count > 6
- Row numbers on LEFT for left side (Groom's Family)
- Row numbers on RIGHT for right side (Bride's Family)

---

## 🧮 CALCULATION FORMULAS

### Total Attending Ceremony
```
Total = 3 + bridal_party_count_left + bridal_party_count_right + (total_rows × chairs_per_row × 2)
```

Where `3` = Bride + Groom + Celebrant

### Family Seats Per Side
```
Family Seats = total_rows × chairs_per_row
```

---

## 📝 EXPLANATORY TEXT (EXACT WORDING - DO NOT CHANGE)

```
(This includes Bride & Groom + Celebrant + Bridal Party + all Family & Friends)
```

---

## ⚙️ SETTINGS CONSTRAINTS

| Setting | Min | Max | Default |
|---------|-----|-----|---------|
| Chairs Per Row | 1 | 6 | 5 |
| Total Rows | 1 | 15 | 10 |
| Assigned Rows | 1 | total_rows | 3 |
| Bridal Party (Left) | 0 | 12 | 3 |
| Bridal Party (Right) | 0 | 12 | 3 |

---

## 🔄 BRIDAL PARTY ROLE LOGIC

### Position-Based Defaults
- **Best Man**: Closest to groom (last index on groom's side if left, first index if right)
- **Maid of Honor**: Closest to bride (first index on bride's side if right, last index if left)
- All others: "Groomsman" or "Bridesmaid"

### Custom Role Handling
- Standard roles (`Best Man`, `Groomsman`, `Maid of Honor`, `Bridesmaid`) always follow position-based logic
- Truly custom roles (e.g., "Junior Bridesmaid", "Ring Bearer") are preserved as entered

---

## ✅ TESTING CHECKLIST

Before any modifications (if approved):

- [ ] Total Attending Ceremony calculation matches formula
- [ ] PDF export generates correctly
- [ ] All seat assignments save/load properly
- [ ] Bridal party names and roles save/load properly
- [ ] Couple arrangement toggle swaps names correctly
- [ ] Row numbers display on correct sides (left numbers on left, right numbers on right)
- [ ] Show/hide toggles work for row and seat numbers
- [ ] General seating separator displays when assigned_rows < total_rows
- [ ] Second bridal party row displays when count > 6
- [ ] PDF footer logo renders correctly
- [ ] Interactive editing (click-to-edit) works for all elements

---

## 🚫 PRODUCTION LOCK NOTICE

This feature has been **finalized and tested** as of **December 21, 2025**.

### Consequences of Unauthorized Modifications:
1. PDF layout may break
2. Calculations may become incorrect
3. Interactive editing may stop working
4. Data may not save properly
5. Visual alignment may be disrupted

### Required Approval Process:
1. Request must be submitted to project owner
2. Detailed explanation of proposed changes required
3. Impact assessment must be performed
4. Testing plan must be provided
5. Owner must provide explicit written approval

---

## 📞 OWNER CONTACT

For modification requests, contact the project owner through the established communication channels.

---

**Document Version:** 1.0  
**Created:** 2025-12-21  
**Last Updated:** 2025-12-21
