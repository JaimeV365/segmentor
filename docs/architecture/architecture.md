# Segmentor - Architecture Documentation

## System Overview

### Architecture Diagram
```
┌─────────────────────────────────────────────────────┐
│                  App Container                       │
├─────────────────┬─────────────────┬─────────────────┤
│   Data Entry    │  Visualization  │     Report      │
│     Module      │     Module      │    Module       │
├─────────────────┴─────────────────┴─────────────────┤
│               Shared Components Layer                │
├─────────────────────────────────────────────────────┤
│               State Management Layer                 │
├─────────────────────────────────────────────────────┤
│                  Utility Layer                      │
└─────────────────────────────────────────────────────┘
```

## Core Modules

### 1. Data Entry Module
Handles all data input and management functionality.

#### Key Components:
- Manual Data Entry Form
- CSV Import System
- Data Display Table
- Scale Management
- Data Validation
- Storage Management

#### Data Flow:
1. User inputs data (manual/CSV)
2. Data validation
3. Scale management
4. Storage update
5. UI update

### 2. Visualization Module
Manages the interactive visualization of the Apostles Model.

#### Key Components:
- Quadrant Chart
- Interactive Controls
- Data Point Display
- Zone Management
- Scale Display
- Grid System

#### Features:
- Interactive positioning
- Dynamic scaling
- Zone resizing
- Data point clustering
- Label management

### 3. Report Module (Planned)
Will handle analysis and report generation.

## Technical Architecture

### 1. Component Structure
- Modular design
- Hierarchical organization
- Clear separation of concerns
- Component reusability

```
src/
├── components/           # React components
│   ├── data-entry/      # Data input components
│   ├── visualization/   # Visualization components
│   └── ui/             # Shared UI components
├── types/               # TypeScript definitions
└── utils/              # Utility functions
```

### 2. State Management
- Local component state for UI
- Props for data flow
- Context for shared state
- Local storage for persistence

### 3. Data Flow
```
┌──────────────┐     ┌──────────────┐     ┌──────────────┐
│  Data Entry  │ ──► │    State     │ ──► │Visualization │
└──────────────┘     └──────────────┘     └──────────────┘
       ▲                    │                     │
       │                    ▼                     ▼
       │            ┌──────────────┐     ┌──────────────┐
       └────────── │   Storage    │     │   Report     │
                   └──────────────┘     └──────────────┘
```

## Key Design Decisions

### 1. Scale Management
- Dynamic scale support (5, 7, 10)
- Scale locking mechanism
- Scale validation system
- Scale transition handling

### 2. Data Structures
```typescript
interface DataPoint {
  id: string;
  name: string;
  satisfaction: number;
  loyalty: number;
  group: string;
  excluded?: boolean;
}

type ScaleFormat = '1-5' | '1-7' | '1-10';

interface ScaleState {
  satisfactionScale: ScaleFormat;
  loyaltyScale: ScaleFormat;
  isLocked: boolean;
}
```

### 3. Component Communication
- Props for parent-child
- Context for global state
- Events for cross-component
- Callbacks for updates

### 4. Performance Optimizations
- Virtualized lists
- Memoization
- Lazy loading
- Efficient re-renders

## Technical Dependencies

### Core Dependencies
- React 18
- TypeScript
- CSS Modules

### Key Libraries
- PapaParse (CSV handling)
- React-Window (virtualization)
- Recharts (charting)
- lucide-react (icons)

## Development Patterns

### 1. Component Pattern
```typescript
// Standard component structure
const Component: React.FC<Props> = ({ prop1, prop2 }) => {
  // State management
  const [state, setState] = useState();

  // Effects and callbacks
  useEffect(() => {
    // Side effects
  }, [dependencies]);

  // Event handlers
  const handleEvent = () => {
    // Event handling
  };

  // Render
  return (
    <div>
      {/* Component JSX */}
    </div>
  );
};
```

### 2. Type Safety
- Strong typing
- Interface definitions
- Type guards
- Strict null checks

### 3. Error Handling
- Boundary components
- Try-catch blocks
- Error notifications
- Graceful degradation

## Future Considerations

### 1. Planned Features
- Report generation
- Data export
- Advanced analytics
- Custom visualizations

### 2. Scalability
- Component splitting
- Code splitting
- Performance monitoring
- Cache management

### 3. Maintenance
- Documentation updates
- Performance audits
- Dependency updates
- Code reviews

## Security Considerations

### 1. Data Safety
- Local storage encryption
- Data validation
- XSS prevention
- Input sanitization

### 2. Error Prevention
- Type checking
- Input validation
- Scale verification
- Data integrity

## Testing Strategy

### 1. Unit Tests
- Component testing
- Utility testing
- Type testing
- Scale testing

### 2. Integration Tests
- Module interaction
- Data flow
- State management
- Scale transitions

## Development Guidelines

### 1. Code Organization
- Modular structure
- Clear naming
- Consistent patterns
- Documentation

### 2. Style Guide
- ESLint configuration
- Prettier setup
- TypeScript rules
- Component structure

## Conclusion
This architecture is designed to be:
- Modular
- Maintainable
- Scalable
- Performance-oriented

Future updates to this document will reflect:
- New features
- Architecture changes
- Performance improvements
- Technical debt resolution