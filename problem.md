# Email Formatting Problem Analysis

## The Issue

**User expectation:** When user adds 1 empty line in the compose editor, they expect 1 empty line in the preview and sent email.

**Current behavior:**

- 1 empty line in compose → NO visible gap in preview/email
- 2 empty lines in compose → 1 visible gap in preview/email

## Visual Evidence

### Compose Page (Image 1)

```
Dear Delegate,
Greetings from IASCC!

[EMPTY LINE - user pressed Enter twice]
[EMPTY LINE - user pressed Enter twice again]

Thank you for joining us...
```

User added **2 empty lines** between "Greetings from IASCC!" and "Thank you for joining..."

### Preview/Sent Email (Image 2)

```
Dear Delegate,
Greetings from IASCC!

[ONLY 1 EMPTY LINE VISIBLE]

Thank you for joining us...
```

Only **1 empty line** is showing.

## Root Cause Analysis

### 1. TipTap Editor Output

When user presses Enter to create an empty line, TipTap generates:

```html
<p class="editor-paragraph">
  <br class="editor-break" /><br class="ProseMirror-trailingBreak" />
</p>
```

### 2. Current Formatter Processing

The formatter:

1. Strips `<br>` classes: `<br class="editor-break">` → `<br>`
2. **PROBLEM:** Normalizes multiple `<br>` to one: `<br><br>` → `<br>`
3. Converts `<p>` to `<div>`
4. Converts empty div with `<br>` to spacer: `<div style="min-height: 1.5em;">&nbsp;</div>`

### 3. The Mapping Problem

| Compose (Empty Lines) | HTML Generated                   | After Processing | Visual Result            |
| --------------------- | -------------------------------- | ---------------- | ------------------------ |
| 0 empty lines         | No empty `<p>`                   | No spacer div    | No gap                   |
| 1 empty line          | 1 empty `<p>` with 2 `<br>`      | 1 spacer div     | 1 gap                    |
| 2 empty lines         | 2 empty `<p>` with 2 `<br>` each | 2 spacer divs    | 1 gap (margin collapse?) |

## The Real Problem

The issue is likely **CSS margin collapsing**. When two adjacent `<div>` elements both have margins, browsers collapse them into a single margin. Even with `margin: 0`, the `min-height: 1.5em` spacer divs may be collapsing.

Also, there might be a mismatch between:

1. How the **TipTap editor** visually renders paragraphs (with its own CSS)
2. How the **preview iframe** renders the formatted HTML (with different CSS)
3. How **Gmail** renders the final email (with yet another CSS interpretation)

## Expected Behavior

The formatting should be **WYSIWYG (What You See Is What You Get)**:

- 1 empty line in compose = 1 empty line in preview = 1 empty line in sent email
- 2 empty lines in compose = 2 empty lines in preview = 2 empty lines in sent email

## Proposed Solution

1. **Don't normalize `<br>` tags** - Keep the exact structure from the editor
2. **Use consistent spacing** - Each empty paragraph should create exactly one line of visual space
3. **Match editor CSS with preview CSS** - Ensure the compose editor and preview use identical styling rules
4. **Test in actual Gmail** - Verify the sent email matches the preview

## Files Involved

- `/lib/email-formatter.ts` - Unified email formatter that handles all HTML processing
- `/components/rich-text-editor.tsx` - TipTap editor configuration
- `/components/compose-form.tsx` - Contains preview wrapper CSS
- `/components/email-preview.tsx` - Contains preview wrapper CSS

## Solution Applied

The formatting system was simplified from multiple patched files into a single unified `email-formatter.ts` file that:

- Converts TipTap/ProseMirror HTML to Gmail-compatible format in a single pass
- Preserves empty lines (each `<br>` or empty `<div>` creates one visual line break)
- Applies inline styles to all elements for email client compatibility
- Works both on server and client side
- Removed separate client formatter and API routes to eliminate duplication
