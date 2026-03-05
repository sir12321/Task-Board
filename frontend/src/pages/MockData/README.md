# MockData Module

This module contains all mock data and business logic for the TaskFlow board demo/development environment.

## File Structure

### `mockData.ts`
Contains all mock data used throughout the application:
- **Mock Users**: `MockUser1`, `MockUser2` - Sample user profiles
- **Mock Projects**: `mockProjects` - Array of project configurations
- **Mock Tasks**: `mockBoardTasks` - Tasks organized by board ID
- **Timestamps**: `nowIso` - Standard timestamp for mock data

### `constants.ts`
Global state and constants:
- `nextBoardId`, `nextCustomColumnId` - Auto-increment counters for generating unique IDs
- `mandatoryColumnIds` - List of column IDs that cannot be deleted ('col-story', 'col-backlog', 'col-done')
- Helper functions to manage these counters

### `boardColumns.ts`
Board column management:
- `createColumns()` - Factory function to create default board columns
- `mockBoardColumns` - State object storing all board column configurations
- `cloneColumns()`, `cloneTasks()` - Deep copy utilities
- `ensureMandatoryColumns()` - Validation to ensure mandatory columns exist
- `getOrCreateBoardColumns()` - Lazy initialization of board columns

### `routingHelpers.ts`
URL routing utilities:
- `buildBoardPath()` - Constructs board URLs in the format `/projects/{projectId}/boards/{boardId}`
- `defaultProjectId`, `defaultBoardId` - Default values for initial navigation
- `defaultBoardPath` - Pre-computed default navigation path

### `boardOperations.ts`
All board manipulation business logic:

**Project Operations:**
- `resolveProjectBoardSelection()` - Fetch and prepare project+board data
- `createBoardForProject()` - Create a new board in a project
- `updateProjectSettings()` - Edit project name/description

**Column Operations:**
- `addColumnToBoard()` - Create custom columns
- `renameColumnInBoard()` - Edit column names
- `reorderColumnInBoard()` - Reorder columns left/right
- `updateColumnWipInBoard()` - Set WIP (Work In Progress) limits
- `deleteColumnFromBoard()` - Remove custom columns

All operations include permission checks (PROJECT_ADMIN required) and validation.

### `BoardPage.tsx`
Main React component that:
- Resolves project/board from URL parameters
- Manages board state with React hooks
- Handles task operations (create, update, delete)
- Handles column operations (add, rename, reorder, etc.)
- Renders the `BoardView` component with callbacks

### `index.ts`
Central export file for the entire module - allows convenient importing:
```typescript
import { 
  MockUser1, 
  mockProjects, 
  resolveProjectBoardSelection,
  BoardPage 
} from '@/pages/MockData';
```

## Usage

### Import Individual Modules
```typescript
import { mockProjects, MockUser1 } from './mockData';
import { buildBoardPath, defaultBoardPath } from './routingHelpers';
```

### Import from Index
```typescript
import { 
  resolveProjectBoardSelection, 
  createBoardForProject,
  MockUser1
} from './';
```

### Common Patterns

**Get a project with its board:**
```typescript
const selection = resolveProjectBoardSelection('project-1', 'board-1');
if (selection) {
  const { project, board } = selection;
}
```

**Create a new board:**
```typescript
const newBoard = createBoardForProject('project-1', 'My New Board');
```

**Navigate to a board:**
```typescript
const path = buildBoardPath('project-1', 'board-1');
navigate(path);
```

## Data Flow

```
mockData.ts (raw data)
    ↓
boardColumns.ts (organize columns) + boardOperations.ts (manipulate)
    ↓
routingHelpers.ts (URL construction)
    ↓
BoardPage.tsx (React component with hooks)
    ↓
BoardView (presentation component)
```

## Permission Model

Operations are gated by `userRole`:
- `PROJECT_ADMIN` - Can create, update, delete boards, columns, and tasks
- `PROJECT_MEMBER` - Can create and edit tasks (in the future)
- `PROJECT_VIEWER` - Read-only access, cannot modify anything

## Notes

- All mock data is stored in memory and will reset on page reload
- The module manages its own state (no Redux/Context needed currently)
- IDs are generated with auto-incrementing counters
- Mandatory columns cannot be deleted but can be renamed
