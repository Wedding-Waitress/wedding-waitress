

# Fix Text Styling on QR Code Seating Chart Page

## Changes

### 1. Update photo tip text (`QRCodeMainCard.tsx`, line 1452)
Change "horizontal" to "horizontal - landscape" in the tip text.
- From: `📸 For best results, use a horizontal (6×4) photo.`
- To: `📸 For best results, use a horizontal - landscape (6×4) photo.`

### 2. Change "QR Code Generator" heading to black (line 493)
- From: `text-2xl font-medium text-[#7248e6]`
- To: `text-2xl font-medium text-foreground`

### 3. Change "Guest Live View Configuration" heading to black and match font size (line 740)
- From: `text-xl font-medium text-[#7248e6]`
- To: `text-2xl font-medium text-foreground`

### Files Modified
1. `src/components/Dashboard/QRCode/QRCodeMainCard.tsx` -- 3 line changes

