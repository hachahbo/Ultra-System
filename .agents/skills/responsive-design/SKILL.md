---
name: responsive-design
description: Mobile-first responsive design patterns. Use when building responsive layouts and components.
---

# Responsive Design Skill

This skill covers mobile-first responsive design patterns for React applications.

## When to Use

Use this skill when:
- Building responsive layouts
- Creating mobile-first designs
- Implementing adaptive components
- Handling different screen sizes

## Core Principle

**MOBILE FIRST** - Design for mobile, then enhance for larger screens. This results in simpler, more maintainable CSS.

## Breakpoints

### Tailwind CSS Default Breakpoints

| Breakpoint | Min Width | CSS |
|------------|-----------|-----|
| (default) | 0px | Base styles |
| sm | 640px | `@media (min-width: 640px)` |
| md | 768px | `@media (min-width: 768px)` |
| lg | 1024px | `@media (min-width: 1024px)` |
| xl | 1280px | `@media (min-width: 1280px)` |
| 2xl | 1536px | `@media (min-width: 1536px)` |

### Mobile First Approach

```typescript
// Start with mobile styles, add breakpoints for larger screens
<div className="
  w-full          // Mobile: full width
  sm:w-1/2        // >=640px: half width
  lg:w-1/3        // >=1024px: third width
  xl:w-1/4        // >=1280px: quarter width
">
```

## Layout Patterns

### Responsive Container

```typescript
function Container({ children }: { children: React.ReactNode }): React.ReactElement {
  return (
    <div className="mx-auto w-full max-w-7xl px-4 sm:px-6 lg:px-8">
      {children}
    </div>
  );
}
```

### Responsive Grid

```typescript
// Basic responsive grid
<div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
  {items.map((item) => (
    <Card key={item.id} {...item} />
  ))}
</div>

// Auto-fill grid (flexible columns)
<div className="grid gap-4 grid-cols-[repeat(auto-fill,minmax(250px,1fr))]">
  {items.map((item) => (
    <Card key={item.id} {...item} />
  ))}
</div>
```

### Responsive Flexbox

```typescript
// Stack on mobile, row on desktop
<div className="flex flex-col gap-4 sm:flex-row sm:items-center">
  <div>Item 1</div>
  <div>Item 2</div>
  <div>Item 3</div>
</div>

// Reverse order on mobile
<div className="flex flex-col-reverse gap-4 lg:flex-row">
  <aside className="w-full lg:w-64">Sidebar</aside>
  <main className="flex-1">Content</main>
</div>
```

### Responsive Sidebar Layout

```typescript
function DashboardLayout({ children }: { children: React.ReactNode }): React.ReactElement {
  return (
    <div className="min-h-screen lg:flex">
      {/* Sidebar - hidden on mobile, fixed on desktop */}
      <aside className="hidden lg:fixed lg:inset-y-0 lg:flex lg:w-64 lg:flex-col">
        <nav className="flex flex-1 flex-col bg-gray-900 px-4 py-6">
          {/* Navigation items */}
        </nav>
      </aside>

      {/* Mobile header */}
      <header className="sticky top-0 z-40 flex h-16 items-center bg-white shadow lg:hidden">
        <button className="px-4">
          <MenuIcon />
        </button>
      </header>

      {/* Main content */}
      <main className="flex-1 lg:pl-64">
        <div className="px-4 py-6 sm:px-6 lg:px-8">
          {children}
        </div>
      </main>
    </div>
  );
}
```

## Component Patterns

### Responsive Navigation

```typescript
'use client';

import { useState } from 'react';
import { Menu, X } from 'lucide-react';

function Navigation(): React.ReactElement {
  const [isOpen, setIsOpen] = useState(false);

  return (
    <nav className="bg-white shadow">
      <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
        <div className="flex h-16 justify-between">
          {/* Logo */}
          <div className="flex items-center">
            <Logo />
          </div>

          {/* Desktop navigation */}
          <div className="hidden sm:flex sm:items-center sm:space-x-8">
            <NavLink href="/">Home</NavLink>
            <NavLink href="/about">About</NavLink>
            <NavLink href="/contact">Contact</NavLink>
          </div>

          {/* Mobile menu button */}
          <div className="flex items-center sm:hidden">
            <button
              onClick={() => setIsOpen(!isOpen)}
              className="inline-flex items-center justify-center p-2"
            >
              {isOpen ? <X /> : <Menu />}
            </button>
          </div>
        </div>
      </div>

      {/* Mobile menu */}
      {isOpen && (
        <div className="sm:hidden">
          <div className="space-y-1 px-2 pb-3 pt-2">
            <MobileNavLink href="/">Home</MobileNavLink>
            <MobileNavLink href="/about">About</MobileNavLink>
            <MobileNavLink href="/contact">Contact</MobileNavLink>
          </div>
        </div>
      )}
    </nav>
  );
}
```

### Responsive Card

```typescript
function ProductCard({ product }: { product: Product }): React.ReactElement {
  return (
    <div className="
      flex flex-col
      sm:flex-row
      lg:flex-col
      rounded-lg border bg-white shadow-sm overflow-hidden
    ">
      {/* Image - full width on mobile, side on tablet, full on desktop */}
      <div className="
        w-full
        sm:w-48 sm:flex-shrink-0
        lg:w-full
      ">
        <img
          src={product.image}
          alt={product.name}
          className="h-48 w-full object-cover sm:h-full lg:h-48"
        />
      </div>

      {/* Content */}
      <div className="flex flex-1 flex-col p-4">
        <h3 className="text-lg font-semibold">{product.name}</h3>
        <p className="mt-1 text-sm text-gray-500 line-clamp-2">
          {product.description}
        </p>
        <div className="mt-auto pt-4">
          <span className="text-lg font-bold">${product.price}</span>
        </div>
      </div>
    </div>
  );
}
```

### Responsive Table

```typescript
// Table on desktop, cards on mobile
function ResponsiveTable({ data }: { data: User[] }): React.ReactElement {
  return (
    <>
      {/* Mobile cards */}
      <div className="space-y-4 md:hidden">
        {data.map((user) => (
          <div key={user.id} className="rounded-lg border bg-white p-4">
            <div className="font-medium">{user.name}</div>
            <div className="mt-1 text-sm text-gray-500">{user.email}</div>
            <div className="mt-2 text-sm">
              <span className="font-medium">Role:</span> {user.role}
            </div>
          </div>
        ))}
      </div>

      {/* Desktop table */}
      <table className="hidden w-full md:table">
        <thead>
          <tr className="border-b">
            <th className="px-4 py-3 text-left">Name</th>
            <th className="px-4 py-3 text-left">Email</th>
            <th className="px-4 py-3 text-left">Role</th>
          </tr>
        </thead>
        <tbody>
          {data.map((user) => (
            <tr key={user.id} className="border-b">
              <td className="px-4 py-3">{user.name}</td>
              <td className="px-4 py-3">{user.email}</td>
              <td className="px-4 py-3">{user.role}</td>
            </tr>
          ))}
        </tbody>
      </table>
    </>
  );
}
```

## Typography

### Responsive Text Sizes

```typescript
<h1 className="text-2xl font-bold sm:text-3xl lg:text-4xl xl:text-5xl">
  Responsive Heading
</h1>

<p className="text-sm sm:text-base lg:text-lg">
  Responsive paragraph text.
</p>
```

### Fluid Typography (CSS Clamp)

```css
/* globals.css */
.fluid-heading {
  font-size: clamp(1.5rem, 5vw, 3rem);
}
```

## Spacing

### Responsive Padding/Margin

```typescript
<section className="py-8 sm:py-12 lg:py-16 xl:py-20">
  <div className="px-4 sm:px-6 lg:px-8">
    Content with responsive spacing
  </div>
</section>
```

## useMediaQuery Hook

```typescript
import { useState, useEffect } from 'react';

export function useMediaQuery(query: string): boolean {
  const [matches, setMatches] = useState(false);

  useEffect(() => {
    const media = window.matchMedia(query);
    if (media.matches !== matches) {
      setMatches(media.matches);
    }
    const listener = (): void => setMatches(media.matches);
    media.addEventListener('change', listener);
    return () => media.removeEventListener('change', listener);
  }, [matches, query]);

  return matches;
}

// Usage
function Component(): React.ReactElement {
  const isDesktop = useMediaQuery('(min-width: 1024px)');

  return isDesktop ? <DesktopView /> : <MobileView />;
}
```

## Best Practices

1. **Mobile first** - Start with mobile styles
2. **Use breakpoints consistently** - Stick to Tailwind defaults
3. **Test on real devices** - Emulators aren't perfect
4. **Consider touch targets** - Min 44x44px on mobile
5. **Use semantic HTML** - Improves accessibility
6. **Avoid fixed widths** - Use relative/fluid sizing

## Accessibility Considerations

- Ensure touch targets are at least 44x44px on mobile
- Don't hide critical content on mobile
- Test with screen readers at all breakpoints
- Ensure text remains readable when zoomed

## Notes

- Test at various breakpoints, not just exact values
- Consider landscape orientation on mobile
- Use Container Queries for component-level responsiveness (Tailwind v3.4+)
