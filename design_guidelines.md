# Design Guidelines: Online Library Management System (OLMS)

## Design Approach
**System-Based Approach** - Drawing from modern SaaS admin panels (Linear, Stripe Dashboard, Notion) prioritizing clarity, efficiency, and data accessibility over visual flourishes.

## Core Design Principles
1. **Data First**: Information hierarchy optimized for scanning and quick decision-making
2. **Consistent Patterns**: Predictable layouts across all modules reduce cognitive load
3. **Professional Restraint**: Clean, understated design that doesn't compete with content
4. **Multi-Tenant Ready**: Scalable components that work across varying data volumes

---

## Typography

**Font Family**: Inter or System UI Stack  
- **Headings**: 600 weight, sizes: 2xl (page titles), xl (section headers), lg (card headers)
- **Body**: 400 weight, base size for content, sm for supporting text
- **Data Tables**: 400 weight, sm size for optimal density
- **Numbers/Metrics**: 600 weight for dashboard KPIs, tabular-nums for alignment

---

## Layout System

**Spacing Units**: Tailwind scale - consistent use of 4, 6, 8, 12, 16 units  
- Card padding: p-6 or p-8
- Section gaps: gap-6 or gap-8  
- Form field spacing: space-y-4
- Dashboard grid gaps: gap-4 or gap-6

**Container Strategy**:
- Sidebar: Fixed 64 width (16rem), collapsible on mobile
- Main content: max-w-7xl with px-6 or px-8
- Forms: max-w-4xl centered for focused data entry
- Tables: Full width within container for maximum data visibility

---

## Component Library

### Navigation & Structure
**Sidebar Menu**:
- Fixed left sidebar with hierarchical menu structure
- Active state: Subtle left border accent + background tint
- Icons from Heroicons (outline style) paired with menu labels
- Collapsible sub-sections for grouped features (e.g., Reports sub-menu)
- Tenant/Library selector at top for Super Admin context switching

**Top Bar**:
- User profile dropdown (right-aligned)
- Breadcrumb navigation (left-aligned) showing current location
- Height: h-16 with subtle bottom border

### Dashboard Elements
**Metric Cards**:
- Grid layout: 2 columns on mobile, 4 columns on desktop (grid-cols-1 md:grid-cols-2 lg:grid-cols-4)
- Each card: Rounded corners (rounded-lg), padding p-6
- Structure: Large number (text-3xl, font-semibold), label below (text-sm), optional trend indicator

**Charts**:
- Payment overview: Combine bar chart (6-month trend) and pie chart (gender/shift distribution) side-by-side
- Use Chart.js or Recharts with muted palette
- Maintain consistent aspect ratios in grid layouts

**Data Lists** (Recent Expenses, Payments, Renewals):
- Compact table format with alternating row backgrounds
- Limit to 10 rows with "View All" link
- Include mini status badges (e.g., "Paid", "Pending")

### Forms
**Register Student / Manage Forms**:
- Two-column layout on desktop (grid-cols-2 gap-6), single column on mobile
- Field groups with subtle borders/backgrounds to separate sections
- Required field indicators (asterisk or label color)
- Dynamic seat dropdown: Grouped by shift, disabled options for occupied seats
- Action buttons: Primary (Submit/Renew) + Secondary (Update/Reset) aligned right

**Input Fields**:
- Height: h-11, rounded-md borders
- Focus states: Ring accent with subtle border change
- Labels: text-sm, font-medium, positioned above inputs
- Validation: Inline error messages in destructive color below fields

### Data Tables
**Structure**:
- Sticky header row with sort indicators
- Zebra striping for row clarity (alternate background tint)
- Compact row height (h-12) for data density
- Action column (right-aligned): Icon buttons for edit/delete/view
- Pagination footer: Center-aligned page numbers, per-page selector

**Responsive Strategy**:
- Desktop: Full table with all columns
- Tablet: Hide less critical columns, show expand icon
- Mobile: Card-based layout with key fields only

### Seat Management Grid
**Visual Design**:
- Grid layout: 10 columns (adjustable based on total seats)
- Each seat: Square cells with rounded-sm, minimum touch target size (h-12 w-12)
- Clear legend above grid showing status meanings
- Shift tabs/filter at top to view specific shift allocations

**Status Indicators** (via background patterns/borders, no colors mentioned):
- Vacant: Light background
- Occupied (Male): Distinct pattern/texture
- Occupied (Female): Different pattern/texture  
- Blocked: Diagonal stripes or distinct marker

### Reports Module
**Report Selection**:
- Card-based layout for report types (2-3 columns)
- Each card: Icon, report name, description, "Generate" button

**Report Display**:
- Filter bar at top (date ranges, status dropdowns)
- Export buttons (CSV, PDF) aligned right
- Data table below with dynamic columns from database
- Summary totals row if applicable

### Access Control Indicators
**Permission Badges**:
- Read-only mode: Disabled form fields with tooltip explaining lack of edit permissions
- Unauthorized access: Full-page centered message with illustration
- Role indicator: Small badge next to username in top bar

---

## Interaction Patterns

**Loading States**: Skeleton screens for tables, spinner overlays for button actions  
**Notifications**: Toast messages (top-right) for success/error feedback  
**Modals**: Centered overlays for confirmations (delete, renewal) with backdrop blur  
**Hover States**: Subtle background changes on table rows, cards, and buttons

---

## Animation Guidelines
Minimal, purposeful motion only:
- Sidebar collapse/expand: 200ms ease transition
- Modal fade-in: 150ms
- Button loading states: Spinner animation
- No scroll-triggered or decorative animations

---

## Responsive Breakpoints
- Mobile: < 768px (stacked layouts, hamburger menu)
- Tablet: 768px - 1024px (2-column grids, condensed sidebar)
- Desktop: > 1024px (full layouts, expanded sidebar)