# Online Library Management System (OLMS)

## Overview

The Online Library Management System is a multi-tenant SaaS application designed for library owners to manage student admissions, seat allocations, subscriptions, payments, and expenses across multiple shifts. The system supports libraries operating in 4 time shifts (6 AM-12 PM, 12 PM-6 PM, 6 PM-12 AM, 12 AM-6 AM) with configurable seat capacity.

The application features role-based access control (Super Admin, Admin, and custom users), dynamic menu generation from database, comprehensive reporting, and real-time seat availability tracking. It's built with a modern tech stack emphasizing clean design patterns and multi-tenant scalability.

## User Preferences

Preferred communication style: Simple, everyday language.

## System Architecture

### Frontend Architecture

**Framework & Styling:**
- React with TypeScript for type safety and component-based architecture
- Vite as the build tool for fast development and optimized production builds
- Tailwind CSS for utility-first styling with shadcn/ui component library
- Design system follows "system-based approach" inspired by Linear/Stripe/Notion with emphasis on data density and professional restraint

**State Management:**
- TanStack Query (React Query) for server state management with automatic caching and synchronization
- React Hook Form with Zod validation for form state and validation
- Session-based authentication state managed through custom `useAuth` hook

**Routing:**
- Wouter for lightweight client-side routing
- Protected routes enforced through authentication and permission checks

**Component Structure:**
- UI components in `/client/src/components/ui` from shadcn/ui library
- Page components in `/client/src/pages` for each feature module
- Shared hooks in `/client/src/hooks` for cross-cutting concerns
- AppSidebar component with dynamic menu generation from database

**Key Design Patterns:**
- Compound component pattern for complex UI elements
- Custom hooks for business logic separation
- Permission-based rendering using `hasPermission` utility
- Library context passing via props to support multi-tenancy

### Backend Architecture

**Framework:**
- Express.js server with TypeScript
- Session-based authentication using express-session with PostgreSQL store
- Middleware-based request logging and error handling

**Database ORM:**
- Drizzle ORM for type-safe database operations
- Neon Serverless PostgreSQL as the database provider
- Schema-first approach with shared types between frontend and backend
- Migration management through drizzle-kit

**API Design:**
- RESTful endpoints organized by feature domain using path parameters
- URL pattern: `/api/<resource>/:libraryId` for library-scoped endpoints
- Query parameters used for optional filters (shiftIds, status, etc.)
- Session-based authentication with bcrypt password hashing
- Role-based middleware (`requireAuth`, `requireAdmin`, `requireSuperAdmin`)
- Validation using Zod schemas shared between client and server

**Query Client URL Building:**
- Custom `buildUrl` function in `queryClient.ts` handles URL construction
- Skips null, undefined, and empty string values in query keys
- Converts object query key parts to URL query parameters
- Arrays in objects are JSON-stringified as query params

**Storage Layer:**
- Storage abstraction in `server/storage.ts` providing CRUD operations
- Multi-tenant data isolation through `libraryId` filtering
- Centralized database access patterns for consistency

**Multi-Tenancy:**
- Libraries table as the tenant entity
- All domain entities (students, subscriptions, seats, etc.) scoped by `libraryId`
- Super Admin can manage multiple libraries; regular users scoped to single library
- Library selector in UI for Super Admin context switching

### Data Storage Solutions

**Database Schema:**
- **Core Entities:** users, libraries, menuItems, userPermissions
- **Student Management:** students, subscriptions, payments
- **Seat Management:** shifts, seats, seatAllocations
- **Financial:** expenses, payments (with support for partial payments and discounts)
- **Configuration:** reportsConfig for dynamic report definitions

**Key Relationships:**
- Users belong to libraries (except Super Admin)
- Students belong to libraries and have subscriptions
- Seats belong to libraries and can be allocated to students per shift
- Subscriptions link students to seats with date ranges
- Payments track financial transactions with pending amount support

**Database Design Decisions:**
- UUID for user IDs (security and distributed systems)
- Serial integers for other entities (simplicity)
- Soft deletes via `isActive` flags
- Audit fields (`createdBy`, `modifiedBy`, timestamps) on all tables
- JSON fields for flexible configuration (reportsConfig columns)

**Student ID Format:**
- Per-library sequential IDs with library prefix: `LIB{libraryId}-STD{serial}`
- Example: `LIB001-STD000001` for first student in library 1
- Uses MAX(id) per library for unique serials even after deletions
- Format ensures unique IDs across the multi-tenant system

**Subscription Lifecycle:**
- Active subscriptions have `status: "active"` and `isActive: true`
- When renewed, old subscription gets `status: "renewed"` and `isActive: false`
- New subscription is created with fresh dates and `isActive: true`
- Seat allocations are deleted and recreated for renewed subscriptions

**Seat Allocation Rules:**
- Same seat can be allocated to different students in different shifts
- Server validates seat availability before registration to prevent race conditions
- Seat availability is checked per shift, not globally

**Active Shifts Page:**
- Shows seat allocation matrix with seats as rows and shifts as columns
- Displays shift statistics cards (Vacant/Occupied/Blocked counts per shift)
- Status badges indicate Vacant (green) or Occupied (student name in tooltip)
- Located at `/active-shifts` path with clock icon in sidebar

### Authentication and Authorization

**Authentication:**
- Session-based auth using express-session with PostgreSQL session store
- Passwords hashed with bcrypt (10 rounds)
- Session cookies with httpOnly and secure flags
- `/api/auth/login`, `/api/auth/logout`, `/api/auth/user` endpoints

**Authorization:**
- Three-tier role system: `super_admin`, `admin`, `user`
- Permission system with read/write granularity per menu item
- Permissions stored in `userPermissions` table linking users to menu items
- Frontend permission checks via `hasPermission` utility
- Backend middleware for route protection

**Access Control Strategy:**
- Super Admin: Full system access across all libraries
- Admin: Full access within their assigned library
- User: Granular permissions defined per menu item (read/write)
- Menu items dynamically rendered based on user permissions
- API endpoints validate permissions server-side before execution

### External Dependencies

**UI Component Library:**
- Radix UI primitives for accessible, unstyled components
- shadcn/ui as component collection built on Radix UI
- Lucide React for icon system

**Database:**
- Neon Serverless PostgreSQL for database hosting
- WebSocket support for Drizzle ORM via ws package

**Charts & Visualization:**
- Recharts for dashboard analytics (bar charts, pie charts)

**Form Management:**
- React Hook Form for performant form handling
- Hookform Resolvers for Zod integration
- Zod for schema validation (shared schemas in `/shared`)

**Development Tools:**
- Replit-specific plugins for dev environment (cartographer, dev banner, runtime error overlay)
- TSX for TypeScript execution in development
- ESBuild for production bundling

**Session Management:**
- connect-pg-simple for PostgreSQL session storage
- Ensures session persistence across server restarts

**Utilities:**
- date-fns for date manipulation
- clsx and tailwind-merge (via cn utility) for conditional styling
- class-variance-authority for component variant management