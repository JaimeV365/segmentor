# Contributing to Segmentor

## Table of Contents
1. [Code of Conduct](#code-of-conduct)
2. [Getting Started](#getting-started)
3. [Development Process](#development-process)
4. [Pull Request Process](#pull-request-process)
5. [Coding Standards](#coding-standards)
6. [Documentation](#documentation)
7. [Testing](#testing)
8. [Release Process](#release-process)

## Code of Conduct

### Our Pledge
We are committed to providing a friendly, safe, and welcoming environment for all contributors.

### Our Standards
- Be respectful and inclusive
- Accept constructive criticism
- Focus on what's best for the community
- Show empathy towards others

## Getting Started

### Prerequisites
- Node.js (v16 or higher)
- npm or yarn
- Git
- TypeScript knowledge
- React experience

### Setup Steps
1. Fork the repository
2. Clone your fork:
```bash
git clone https://github.com/your-username/segmentor.git
```
3. Add upstream remote:
```bash
git remote add upstream https://github.com/original/segmentor.git
```
4. Install dependencies:
```bash
npm install
```

### Development Environment
1. Create a new branch:
```bash
git checkout -b feature/your-feature-name
```
2. Start development server:
```bash
npm start
```

## Development Process

### 1. Issue First
- Check existing issues
- Create new issue for features/bugs
- Get issue assigned to you
- Discuss approach if needed

### 2. Branch Naming
```
feature/description
fix/description
docs/description
refactor/description
test/description
```

### 3. Commit Messages
```
type(scope): description

[optional body]

[optional footer]
```

Types:
- feat: New feature
- fix: Bug fix
- docs: Documentation
- style: Formatting
- refactor: Code restructuring
- test: Adding tests
- chore: Maintenance

### 4. Development Workflow
1. Update your branch:
```bash
git fetch upstream
git rebase upstream/main
```
2. Make your changes
3. Run tests:
```bash
npm test
```
4. Check formatting:
```bash
npm run lint
```

## Pull Request Process

### 1. Preparation
- Update documentation
- Add/update tests
- Run all checks
- Update changelog

### 2. PR Template
```markdown
## Description
[Description of changes]

## Type of change
- [ ] Bug fix
- [ ] New feature
- [ ] Breaking change
- [ ] Documentation update

## Checklist
- [ ] Tests added/updated
- [ ] Documentation updated
- [ ] Changelog updated
- [ ] All checks passing
```

### 3. Review Process
1. Request reviews
2. Address feedback
3. Update PR as needed
4. Get approvals

## Coding Standards

### TypeScript Guidelines
```typescript
// Use interfaces for objects
interface ComponentProps {
  prop1: string;
  prop2?: number;
}

// Use type for unions
type ScaleFormat = '1-5' | '1-7' | '1-10';

// Use enums for fixed sets
enum QuadrantType {
  Loyalist = 'loyalist',
  Mercenary = 'mercenary'
}
```

### React Components
```typescript
// Functional components
const Component: React.FC<Props> = ({ prop1, prop2 }) => {
  // State first
  const [state, setState] = useState();

  // Effects second
  useEffect(() => {
    // Effect logic
  }, [dependencies]);

  // Handlers third
  const handleEvent = () => {
    // Handler logic
  };

  // Render last
  return (
    <div>
      {/* JSX */}
    </div>
  );
};
```

### CSS Guidelines
- Use CSS Modules
- Follow BEM naming
- Keep styles scoped
- Use variables

## Documentation

### Component Documentation
```typescript
/**
 * Component description
 * @component
 * @example
 * ```tsx
 * <Component prop1="value" prop2={42} />
 * ```
 */
```

### Update Requirements
- README.md if needed
- Component docs
- API documentation
- Usage examples
- Edge cases

## Testing

### Unit Tests
```typescript
describe('Component', () => {
  it('should render correctly', () => {
    render(<Component />);
    expect(screen.getByText('text')).toBeInTheDocument();
  });
});
```

### Integration Tests
```typescript
describe('Integration', () => {
  it('should work with other components', () => {
    // Test integration
  });
});
```

### Test Coverage
- Maintain >80% coverage
- Cover edge cases
- Test error states
- Test interactions

## Release Process

### 1. Version Bump
```bash
npm version patch|minor|major
```

### 2. Changelog
```markdown
## [1.0.0] - YYYY-MM-DD
### Added
- New feature

### Changed
- Modified feature

### Fixed
- Bug fix
```

### 3. Release Steps
1. Update version
2. Update changelog
3. Create release PR
4. Get approvals
5. Merge and tag

## Getting Help
- Check documentation
- Ask in issues
- Join discussions
- Contact maintainers

Remember: Quality over quantity. Take time to do things right.
