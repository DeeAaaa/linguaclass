# Online Classroom - SPEC.md

## 1. Concept & Vision

A professional online learning platform for English language education. The app combines live video conferencing with screen sharing, file management, and an integrated scheduling system. It feels like a modern corporate learning management system - clean, efficient, and trustworthy. Every interaction helps students improve their English while accessing quality educational content.

## 2. Design Language

**Aesthetic Direction:** Corporate elegance meets educational warmth - think Notion meets Coursera. Clean lines, generous whitespace, subtle depth through shadows.

**Color Palette:**
- Primary: `#2563EB` (Royal Blue - trust, professionalism)
- Secondary: `#1E40AF` (Deep Blue - depth)
- Accent: `#F59E0B` (Amber - engagement, highlights)
- Background: `#F8FAFC` (Slate 50 - soft white)
- Surface: `#FFFFFF` (Pure white - cards, modals)
- Text Primary: `#0F172A` (Slate 900)
- Text Secondary: `#64748B` (Slate 500)
- Success: `#10B981` (Emerald)
- Error: `#EF4444` (Red)

**Typography:**
- Headings: Inter (700, 600)
- Body: Inter (400, 500)
- Monospace: JetBrains Mono (for code snippets)

**Spatial System:**
- Base unit: 4px
- Card padding: 24px
- Section gaps: 32px
- Border radius: 12px (cards), 8px (buttons), 6px (inputs)

**Motion:**
- Page transitions: 300ms ease-out fade
- Hover states: 150ms ease
- Modal entrance: 200ms scale from 0.95 + fade
- Button press: scale(0.98)

## 3. Layout & Structure

### Landing Page (/)
- Hero section with animated gradient background
- Feature highlights (3-4 cards)
- Video carousel for announcements
- Call-to-action for login/register
- Footer with links

### Dashboard (/dashboard)
- Sidebar navigation (collapsible on mobile)
- Main content area with role-based widgets
- Quick actions toolbar
- Recent activity feed

### Video Room (/room/:id)
- Full-screen video grid
- Floating control bar
- Screen share toggle
- Participant sidebar (collapsible)
- Chat/transcription panel

### Calendar (/calendar)
- Monthly calendar view
- Day detail popup
- Filter by subject/teacher
- "My Schedule" view for students

### Files (/files)
- Grid/List toggle view
- Category filters
- Upload zone (drag & drop)
- Preview modal

## 4. Features & Interactions

### Authentication
- Email/password login
- Role selection: Student, Teacher, Admin
- Session persistence with localStorage
- Role-based access control

### Video Classroom
- WebRTC-based video/audio
- Screen sharing capability
- Mute/unmute, camera on/off
- Participant list with hand raise
- Live transcription (English focus)
- Basic chat during session

### File Management
- Upload: PDF, MP4, MP3, DOCX, images
- Categories: Videos, Audio, Documents, Assignments
- Download tracking
- Preview for supported formats

### Calendar System
- Teachers/Admin: Create, edit, delete schedules
- Students: View only their schedules
- Fields: Date, time, subject, teacher, room/link, notes
- Day popup shows full schedule details
- Color-coded by subject

### Transcription & Translation
- Live transcription in video room
- Translation to: Chinese, Spanish, French, Arabic, Portuguese, Russian
- Toggle transcript visibility
- Save transcript option

## 5. Component Inventory

### Button
- Variants: Primary, Secondary, Ghost, Danger
- Sizes: Small (32px), Medium (40px), Large (48px)
- States: Default, Hover, Active, Disabled, Loading

### Card
- Standard card with shadow-sm
- Hover: shadow-md + translateY(-2px)
- Header + Body + Footer sections

### Modal
- Centered overlay with backdrop blur
- Close button top-right
- Sizes: Small (400px), Medium (600px), Large (800px)

### Input/Form Fields
- Label above input
- Error state with red border + message
- Focus: ring-2 ring-primary

### Calendar Day Cell
- Default: gray text
- Has events: blue dot indicator
- Selected: primary background
- Today: accent border

### Video Tile
- 16:9 aspect ratio
- Name overlay at bottom
- Muted icon indicator
- Speaking indicator (border glow)

## 6. Technical Approach

**Framework:** React 18 with Create React App
**Styling:** CSS Modules or styled-components pattern
**State:** React Context + useReducer
**Storage:** localStorage for persistence (demo mode)
**Video:** Browser WebRTC API (getUserMedia)
**Icons:** Inline SVG for crisp rendering

**File Structure:**
```
src/
  components/
    common/     # Button, Card, Modal, Input
    layout/     # Header, Sidebar, Footer
    features/   # VideoRoom, Calendar, FileManager
  pages/
    Landing.js
    Dashboard.js
    Calendar.js
    Files.js
    VideoRoom.js
  context/
    AuthContext.js
    AppContext.js
  utils/
    helpers.js
  App.js
  App.css
  index.js
```
