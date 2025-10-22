# Navigation Build Script

This script automatically injects a consistent navigation bar into all HTML files for GitHub Pages deployment.

## 🚀 How It Works

1. **Build-time injection**: Navigation is added to HTML files during the build process
2. **DRY principle**: Navigation is defined once and injected everywhere
3. **No JavaScript dependency**: Works even with JavaScript disabled
4. **GitHub Pages compatible**: Pure static HTML/CSS solution

## 📁 Files Processed

- `public/index.html` (React app)
- `public/about.html`
- `public/faq.html` 
- `public/404.html`
- `build/index.html` (after React build)
- `build/about.html`
- `build/faq.html`
- `build/404.html`

## 🔧 Usage

### Manual Build
```bash
npm run build:nav
```

### Automatic Build (recommended)
```bash
npm run build
```
This runs the React build AND injects navigation automatically.

### Deploy to GitHub Pages
```bash
npm run deploy
```
This builds, injects navigation, and deploys to GitHub Pages.

## 🎨 Navigation Features

- **Responsive design**: Works on mobile and desktop
- **Sticky navigation**: Stays at top when scrolling
- **Brand logo**: Links to homepage
- **Primary CTA**: "Use Tool" button stands out
- **Hover effects**: Smooth transitions
- **Accessibility**: Proper semantic HTML

## 🛠️ Customization

Edit `scripts/build-navigation.js` to modify:
- Navigation links
- Styling
- Logo
- Layout

## ✅ Benefits

- ✅ **DRY**: No duplicate navigation code
- ✅ **Maintainable**: Change once, update everywhere
- ✅ **Fast**: No JavaScript required for navigation
- ✅ **SEO friendly**: Search engines can crawl navigation
- ✅ **Accessible**: Works with screen readers
- ✅ **GitHub Pages ready**: Pure static solution
