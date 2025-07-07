# Button Patterns and Layout Rules

## Form Buttons (Create/Edit Pages)

### Layout

- Use `flex justify-end gap-4` for horizontal right-aligned button layout
- Buttons should be side by side, not stacked vertically

### Button Order (left to right)

1. **Cancel/Secondary Button** - `variant="outline"`
2. **Primary Action Button** - default styling

### Button Text Patterns

- **Create Forms**: "Add [Feature Name]" (e.g., "Add Competition", "Add Training Session")
- **Edit Forms**: "Update [Feature Name]" (e.g., "Update Competition", "Update Training Session")
- **Loading States**: "Adding..." or "Updating..."
- **Cancel Button**: Always "Cancel"

### Code Example

```jsx
{
  /* Submit Buttons */
}
<div className="flex justify-end gap-4">
  <Button type="button" variant="outline" onClick={() => router.push('/[feature]')} disabled={loading}>
    Cancel
  </Button>
  <Button type="submit" disabled={loading} className="min-w-32">
    {loading ? 'Adding...' : 'Add [Feature Name]'}
  </Button>
</div>;
```

## Details Page Buttons

### Header Buttons (Top Right)

- Use `flex justify-between items-start` for header layout
- Right side: `flex gap-2` for action buttons
- Button order: Edit, Delete

### Header Code Example

```jsx
<CardHeader>
  <div className="flex justify-between items-start">
    <div>
      <CardTitle className="text-3xl font-bold">[Feature Name] Details</CardTitle>
      <CardDescription>[Description]</CardDescription>
    </div>
    <div className="flex gap-2">
      <Button variant="outline" onClick={handleEdit}>
        <Edit className="mr-2 h-4 w-4" />
        Edit
      </Button>
      <Button variant="destructive" onClick={() => setShowConfirm(true)} disabled={deleting}>
        <Trash2 className="mr-2 h-4 w-4" />
        {deleting ? 'Deleting...' : 'Delete'}
      </Button>
    </div>
  </div>
</CardHeader>
```

### Bottom Action Buttons

- Use `flex gap-4 pt-4 border-t` for horizontal layout with top border
- Button order: Back, Edit

### Bottom Code Example

```jsx
{
  /* Action Buttons */
}
<div className="flex gap-4 pt-4 border-t">
  <Button variant="outline" onClick={() => router.push('/[feature]')}>
    <ArrowLeft className="mr-2 h-4 w-4" />
    Back to [Feature Name]
  </Button>
  <Button onClick={handleEdit}>
    <Edit className="mr-2 h-4 w-4" />
    Edit [Feature Name]
  </Button>
</div>;
```

## Icon Guidelines

### Required Icons

- **Edit**: `<Edit className="mr-2 h-4 w-4" />`
- **Delete**: `<Trash2 className="mr-2 h-4 w-4" />`
- **Back**: `<ArrowLeft className="mr-2 h-4 w-4" />`

### Icon Placement

- Always use `mr-2` for right margin
- Size: `h-4 w-4`
- Place before button text

## Button Variants

### Primary Actions

- **Submit/Save**: Default button styling
- **Edit**: Default button styling

### Secondary Actions

- **Cancel**: `variant="outline"`
- **Back**: `variant="outline"`

### Destructive Actions

- **Delete**: `variant="destructive"`

## Consistent Styling Classes

### Form Buttons

- `min-w-32` for consistent minimum width on primary buttons
- `disabled={loading}` for loading states

### Layout Classes

- Form buttons: `flex justify-end gap-4`
- Header buttons: `flex gap-2`
- Bottom buttons: `flex gap-4 pt-4 border-t`

## Navigation Patterns

### Cancel/Back Actions

- Forms: Navigate back to feature list page
- Details: Navigate back to feature list page
- Use `router.push('/[feature]')` pattern

### Edit Actions

- Navigate to edit page using `router.push('/[feature]/[id]/edit')`

## Loading States

### Button Text Changes

- Create: "Adding..." → "Add [Feature]"
- Update: "Updating..." → "Update [Feature]"
- Delete: "Deleting..." → "Delete"

### Disabled States

- Disable buttons during loading operations
- Show loading text in button

## Error Handling

### Form Errors

- Display below buttons
- Use consistent error styling

### Success Messages

- Display below buttons
- Use consistent success styling

## Examples by Feature Type

### Competition Pattern

```jsx
// Form buttons
<div className="flex justify-end gap-4">
  <Button type="button" variant="outline" onClick={() => router.push('/competitions')} disabled={loading}>
    Cancel
  </Button>
  <Button type="submit" disabled={loading} className="min-w-32">
    {loading ? 'Adding...' : 'Add Competition'}
  </Button>
</div>

// Details page bottom buttons
<div className="flex gap-4 pt-4 border-t">
  <Button variant="outline" onClick={() => router.push('/competitions')}>
    <ArrowLeft className="mr-2 h-4 w-4" />
    Back to Competitions
  </Button>
  <Button onClick={handleEdit}>
    <Edit className="mr-2 h-4 w-4" />
    Edit Competition
  </Button>
</div>
```

### Training Session Pattern

```jsx
// Form buttons
<div className="flex justify-end gap-4">
  <Button type="button" variant="outline" onClick={() => router.push('/training')} disabled={loading}>
    Cancel
  </Button>
  <Button type="submit" disabled={loading} className="min-w-32">
    {loading ? 'Adding...' : 'Add Training Session'}
  </Button>
</div>

// Details page bottom buttons
<div className="flex gap-4 pt-4 border-t">
  <Button variant="outline" onClick={() => router.push('/training')}>
    <ArrowLeft className="mr-2 h-4 w-4" />
    Back to Training
  </Button>
  <Button onClick={handleEdit}>
    <Edit className="mr-2 h-4 w-4" />
    Edit Session
  </Button>
</div>
```

## Implementation Checklist

### For New Forms

- [ ] Buttons are right-aligned with `flex justify-end gap-4`
- [ ] Cancel button uses `variant="outline"`
- [ ] Primary button uses appropriate text pattern
- [ ] Loading states are implemented
- [ ] Cancel navigates to feature list

### For New Details Pages

- [ ] Header has edit/delete buttons on the right
- [ ] Bottom has back/edit buttons with border-top
- [ ] All buttons use appropriate icons
- [ ] Delete confirmation modal is implemented
- [ ] Navigation patterns are consistent

### Required Imports

```jsx
import { Edit, Trash2, ArrowLeft } from 'lucide-react';
```

This pattern ensures consistency across all CRUD operations in the application.
