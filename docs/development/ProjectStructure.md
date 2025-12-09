# Project Structure Documentation

## Overview
This document outlines the organization and structure of the Segmentor project.

## Directory Structure
```
segmentor/
├── docs/
│   ├── architecture/
│   ├── components/
│   ├── development/
│   ├── types/
│   └── utils/
├── public/
│   ├── index.html
│   └── assets/
├── src/
│   ├── components/
│   │   ├── data-entry/
│   │   ├── ui/
│   │   └── visualization/
│   ├── types/
│   ├── utils/
│   └── styles/
├── tests/
│   ├── unit/
│   └── integration/
└── config/
    ├── webpack/
    └── jest/
```

## Component Organization

### Data Entry Module
```
data-entry/
├── DataEntryModule.tsx
├── forms/
│   ├── CSVImport.tsx
│   ├── DataInput.tsx
│   └── ScaleSelector.tsx
├── table/
│   └── DataDisplay.tsx
├── utils/
│   ├── validation.ts
│   └── formatting.ts
└── types/
    └── index.ts
```

### Visualization Module
```
visualization/
├── QuadrantChart.tsx
├── components/
│   ├── Controls/
│   ├── DataPoints/
│   ├── Grid/
│   └── Zones/
├── utils/
│   ├── calculations.ts
│   └── formatting.ts
└── types/
    └── index.ts
```

## Code Organization

### Component Structure
```typescript
// Component file structure
import React from 'react';
import { ComponentProps } from './types';
import './styles.css';

export const Component: React.FC<ComponentProps> = () => {
  // Implementation
};
```

### Utility Structure
```typescript
// Utility file structure
export function utilityFunction() {
  // Implementation
}

export class UtilityClass {
  // Implementation
}
```

## Module Dependencies

### Core Dependencies
```json
{
  "react": "^18.0.0",
  "typescript": "^4.8.0",
  "papaparse": "^5.3.0",
  "react-window": "^1.8.0"
}
```

### Development Dependencies
```json
{
  "@testing-library/react": "^13.0.0",
  "jest": "^29.0.0",
  "typescript": "^4.8.0"
}
```

## File Naming Conventions

### Components
```
ComponentName.tsx
ComponentName.css
ComponentName.test.tsx
```

### Utilities
```
utilityName.ts
utilityName.test.ts
```

### Types
```
types.ts
interfaces.ts
```

## Import Organization

### Import Order
```typescript
// React and external libraries
import React from 'react';
import { external } from 'library';

// Project components
import { LocalComponent } from './components';

// Utilities and types
import { utility } from './utils';
import { Type } from './types';

// Styles
import './styles.css';
```

## State Management

### Local State
```typescript
// Component state
const [state, setState] = useState();

// Context state
const value = useContext(Context);
```

### Shared State
```typescript
// Storage management
const storageManager = StorageManager.getInstance();

// Scale management
const scaleManager = ScaleManager.getInstance();
```

## Testing Organization

### Test Structure
```typescript
// Component tests
describe('Component', () => {
  // Test cases
});

// Utility tests
describe('utility', () => {
  // Test cases
});
```

## Style Organization

### CSS Modules
```
ComponentName.module.css
theme.css
variables.css
```

### Styling Hierarchy
1. Base styles
2. Component styles
3. Theme variations
4. Utility classes

## Documentation Organization

### Component Documentation
```markdown
# ComponentName

## Props
## Usage
## Examples
```

### Utility Documentation
```markdown
# UtilityName

## Functions
## Types
## Examples
```

## Build Configuration

### webpack
```
webpack/
├── webpack.common.js
├── webpack.dev.js
└── webpack.prod.js
```

### TypeScript
```
├── tsconfig.json
└── tsconfig.test.json
```

## Development Workflow

### Branch Organization
```
main
├── feature/*
├── bugfix/*
└── release/*
```

### Version Control
```
.gitignore
.gitattributes
.github/
```

## Notes
- Maintain consistency
- Follow conventions
- Document changes
- Update dependencies
- Monitor performance
- Handle security