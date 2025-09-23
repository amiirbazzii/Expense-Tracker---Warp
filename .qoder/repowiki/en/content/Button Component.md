# Button Component

<cite>
**Referenced Files in This Document**   
- [Button.tsx](file://src/components/Button.tsx)
</cite>

## Table of Contents
1. [Introduction](#introduction)
2. [API Reference](#api-reference)
3. [Variants and Styles](#variants-and-styles)
4. [Usage Examples](#usage-examples)
5. [Loading and Disabled States](#loading-and-disabled-states)
6. [Customization and Integration](#customization-and-integration)

## Introduction
The Button component is a reusable UI element designed for consistent interaction across the Expense Tracker application. It supports multiple visual states, sizes, and interactive behaviors such as loading and disabled modes. Built with React and Tailwind CSS, this component ensures accessibility, responsiveness, and ease of integration throughout the app.

The button uses a utility-based styling approach with dynamic class composition to support various states including hover, active (pressed), disabled, and loading. It also supports both text and icon-only button types, making it flexible for different UI contexts.

**Section sources**
- [Button.tsx](file://src/components/Button.tsx#L1-L107)

## API Reference

### ButtonProps Interface
The Button component accepts the following props to control its appearance and behavior:

**:variant**  
- Type: `'default' | 'pressed' | 'hover'`  
- Default: Inherits default styling  
- Description: Controls the visual state of the button. Note: This prop is defined but not directly used in the final rendering logic.

**:buttonType**  
- Type: `'text' | 'icon'`  
- Default: `'text'`  
- Description: Determines whether the button displays text content or functions as an icon button.

**:size**  
- Type: `'large' | 'medium'`  
- Default: `'large'`  
- Description: Sets the size of the button, affecting padding and font size.

**:disabled**  
- Type: `boolean`  
- Default: `false`  
- Description: Disables interaction and applies a visual disabled style.

**:loading**  
- Type: `boolean`  
- Default: `false`  
- Description: Shows a loading spinner and disables interaction.

**:icon**  
- Type: `React.ReactNode`  
- Optional  
- Description: Content to display when `buttonType="icon"`. Ignored in text mode.

**:children**  
- Type: `React.ReactNode`  
- Optional  
- Description: Text or content displayed inside the button in text mode.

**:className**  
- Type: `string`  
- Optional  
- Description: Additional Tailwind classes to override or extend styling.

**:HTMLButtonAttributes**  
- Inherited from `React.ButtonHTMLAttributes<HTMLButtonElement>`  
- Includes standard props like `type`, `onClick`, `id`, etc.

**Section sources**
- [Button.tsx](file://src/components/Button.tsx#L64-L105)

## Variants and Styles

The Button component implements a multi-layered styling system using utility functions and predefined variants.

### Base Styles
All buttons share these foundational styles:
- Flex layout with centered content
- Rounded corners (`rounded-xl`)
- Double border (`border-2 border-solid`)
- Smooth transition for all properties

### Interactive States
The component uses CSS classes to manage interactive feedback:
- **Default**: Light gray background with subtle outer and inner shadows
- **Hover**: Enhanced outer shadow for depth
- **Active/Pressed**: Darker border and stronger inset shadow for tactile feedback

### Size Options
**:large**  
- Horizontal padding: `px-6`  
- Vertical padding: `py-4`  
- Font size: `text-xl`  

**:medium**  
- Horizontal padding: `px-4`  
- Vertical padding: `py-3`  
- Font size: `text-lg`  

Size adapts when `buttonType="icon"` to provide consistent touch targets.

### Special States
**:disabled**  
- Grayed-out text (`text-[#a7a7a7]`)  
- Reduced opacity (`opacity-50`)  
- Not-allowed cursor  
- Prevents interaction

**:loading**  
- Applies `animate-pulse` class for subtle opacity animation
- Replaces content with a spinning loader icon

**Section sources**
- [Button.tsx](file://src/components/Button.tsx#L6-L32)

## Usage Examples

### Basic Text Button
```tsx
<Button size="large" type="submit">
  Add Expense
</Button>
```

### Medium Button
```tsx
<Button size="medium" onClick={handleClick}>
  Save Changes
</Button>
```

### Icon Button
```tsx
<Button buttonType="icon" size="large" icon={<EditIcon />} />
```

### Full-width Form Button
```tsx
<Button 
  type="submit" 
  className="w-full bg-[#EAEAEA] text-gray-700 hover:bg-[#E0E0E0]" 
  disabled={isSubmitting}
  loading={isSubmitting}
>
  Add Income
</Button>
```

### Integration Example from Expenses Page
The Button component is used in form submissions across the application:

```tsx
<Button
  type="submit"
  className="w-full bg-[#EAEAEA] text-gray-700 hover:bg-[#E0E0E0]"
  disabled={isSubmitting || formData.category.length === 0 || !formData.cardId}
  loading={isSubmitting}
>
  Add Expense
</Button>
```

This pattern ensures consistent behavior and visual feedback during form submission.

**Section sources**
- [Button.tsx](file://src/components/Button.tsx#L100-L105)
- [expenses/page.tsx](file://src/app/expenses/page.tsx#L380-L388)
- [income/page.tsx](file://src/app/income/page.tsx#L294-L302)

## Loading and Disabled States

The Button component handles loading and disabled states with appropriate visual and functional feedback.

### Loading State
When `loading={true}`:
- Content is replaced with a spinning SVG loader
- `disabled` is automatically set to `true`
- Applies pulse animation for visual indication

```tsx
const LucideLoaderCircle = () => (
  <svg className="animate-spin" width="24" height="24" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
    <path d="M21 12a9 9 0 1 1-6.219-8.56" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
  </svg>
);
```

### Disabled State
When `disabled={true}`:
- Interaction is blocked
- Displays placeholder text "Fill the information" instead of children
- Applies grayed-out appearance with reduced opacity

Note: When both `loading` and `disabled` are true, the loading spinner takes precedence over the disabled placeholder text.

**Section sources**
- [Button.tsx](file://src/components/Button.tsx#L34-L62)

## Customization and Integration

The Button component is designed for easy customization through the `className` prop while maintaining consistent base styling.

### Style Customization
Developers can override styles by passing Tailwind classes:
```tsx
<Button className="bg-blue-500 hover:bg-blue-600 text-white">
  Custom Styled Button
</Button>
```

### Accessibility Features
- Inherits all standard button attributes
- Proper focus management through browser defaults
- Visual feedback for all interaction states
- Disabled state prevents keyboard interaction

### Best Practices
1. Always provide meaningful content for screen readers
2. Use appropriate `type` attribute in forms (`submit`, `button`, `reset`)
3. Pair with proper loading indicators when making async calls
4. Maintain sufficient contrast for readability
5. Ensure touch targets are at least 44x44px for mobile usability

The Button component is a critical UI element used consistently throughout the Expense Tracker application, providing reliable interaction patterns and visual feedback across all user journeys.

**Section sources**
- [Button.tsx](file://src/components/Button.tsx#L1-L107)
- [expenses/page.tsx](file://src/app/expenses/page.tsx)
- [income/page.tsx](file://src/app/income/page.tsx)
- [settings/page.tsx](file://src/app/settings/page.tsx)