

## Capitalize CSV Template Filename and Headers

### 1. Capitalize the Download Filename

Change the downloaded file name from `guest-list-import-template.csv` to `Guest-List-Import-Template.csv`.

Single line change in `GuestListTable.tsx` at line 804.

### 2. Capitalize the Column Headers in the Template

Change the template CSV headers from snake_case (e.g., `first_name`, `last_name`) to Title Case (e.g., `First Name`, `Last Name`).

A new display header array will be created for the template:
```
First Name, Last Name, Table Name, Seat No, RSVP, Dietary, Mobile, Email, Notes, Relation Partner, Relation Role
```

The existing `IMPORT_TEMPLATE_HEADERS` array (lowercase/snake_case) will remain unchanged because the import parser depends on it.

The `downloadTemplate` function will use these new display headers instead.

### 3. Update the Import Parser to Accept Both Formats

Since users will now download a template with capitalized headers like "First Name", the import logic needs to accept both formats. A small mapping step will be added so that when headers like "First Name" are found, they get normalized back to `first_name` before processing. This ensures both old and new templates work for import.

### 4. Bold Headers -- Limitation

CSV is a plain text format and does not support any formatting such as bold, font size, or colors. When opened in Excel, all rows look the same. Making headers bold would require generating an Excel (.xlsx) file instead, which would need adding a new library. For now, the headers will be capitalized (Title Case) which already makes them stand out visually. If you want actual bold formatting in the future, we can look into adding Excel file generation.

### Summary of Changes

**File: `src/components/Dashboard/GuestListTable.tsx`**

- Add a display headers array: `['First Name', 'Last Name', 'Table Name', ...]`
- Update `downloadTemplate` to use display headers and capitalize the filename
- Update the import parser to normalize capitalized headers back to snake_case so imports still work with both old and new templates
- No other changes anywhere

