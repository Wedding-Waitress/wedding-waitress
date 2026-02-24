
The "Export Controls" section of the DJ-MC Questionnaire page will be updated to match the exact wording used in the Running Sheet's export controls section. This ensures consistency across the different dashboard modules.

### Changes to be made:

#### `src/components/Dashboard/DJMCQuestionnaire/DJMCQuestionnairePage.tsx`

- Update the description text inside the Export Controls box.
- **Current text**: "Download your questionnaire and share it with your DJ-MC or wedding venue."
- **New text**: "Download your running sheet and share it with your DJ-MC or any of your vendors."

This change will make the instruction text identical to the Running Sheet's export controls, as requested.

### Technical Details:
- The change is a simple string replacement in the component's render method.
- No functional changes or styling changes are required as the layout was already standardized in previous updates.
