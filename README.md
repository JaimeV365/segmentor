# Segmentor

> Professional customer segmentation tool. Start with the Apostles Model visualization, then dive into powerful analytics, reporting, and actionable insights - all with complete privacy. Your data never leaves your device.

**🌐 Live at:** [segmentor.app](https://segmentor.app)

## Overview

Segmentor is a privacy-first, web-based customer segmentation tool that helps businesses understand and act on their customer loyalty and satisfaction data. The application starts with the Apostles Model visualization for enthusiasts, then provides powerful additional analytics, reporting, and insights. All processing happens locally - no data collection, no cookies, no cloud storage.

## Key Features

- 📊 **Apostles Model Visualization** - Start with the classic quadrant analysis for Apostles Model enthusiasts
- 🚀 **Powerful Analytics** - Advanced reporting, insights, and actionable recommendations beyond the basic model
- 🔒 **Privacy-First** - 100% local processing, no data collection, no cookies, no cloud storage
- 📝 **Multiple Input Methods** - Manual entry and CSV import support
- 📈 **Flexible Scales** - Support for 5-point, 7-point, and 10-point satisfaction scales
- 🎯 **Advanced Analysis** - Zone management, positioning, and comprehensive reporting
- 📱 **Responsive Design** - Modern UI components that work on all devices
- 💾 **Local Storage** - Your data stays on your device
- 📤 **Export Capabilities** - Generate reports and export your analysis

## Target Audience

Any company with a Customer Experience (CX) programme in place or working on implementing one - regardless of size. Perfect for:

- Customer Experience (CX) teams
- Marketing departments
- Business consultants
- Companies analyzing customer satisfaction and loyalty data
- Organizations looking for actionable customer insights

## Getting Started

### Prerequisites
- Node.js (v16 or higher)
- npm or yarn

### Installation

1. Clone the repository:
```bash
git clone https://github.com/your-username/segmentor.git
cd segmentor
```

2. Install dependencies:
```bash
npm install
# or
yarn install
```

3. Start the development server:
```bash
npm start
# or
yarn start
```

The application will open at `http://localhost:3000`

### Building for Production

```bash
npm run build
```

This creates an optimized production build in the `build` folder.

## Project Structure

```
segmentor/
├── src/
│   ├── components/        # React components
│   │   ├── data-entry/   # Data input components
│   │   ├── ui/           # Shared UI components
│   │   └── visualization/# Visualization components
│   ├── types/            # TypeScript type definitions
│   └── utils/            # Utility functions
├── docs/                 # Documentation
└── public/              # Static assets
```

## Technology Stack

- **React 18** - UI framework
- **TypeScript** - Type safety
- **Tailwind CSS** - Styling
- **PapaParse** - CSV parsing
- **React-Window** - Virtualization for large datasets
- **Recharts** - Charting and data visualization
- **D3-scale** - Advanced scaling functions

## Documentation

Detailed documentation is available in the `docs` directory:
- [Architecture Overview](./docs/architecture/)
- [Component Documentation](./docs/components/)
- [Development Guide](./docs/development/)
- [Business Plan](./docs/architecture/business-plan.md)

## Contributing

We welcome contributions! Please see our [Contributing Guide](./docs/CONTRIBUTING.md) for details.

## License

This project is licensed under the MIT License - see the [LICENSE](LICENSE) file for details.

## Links

- **Website:** [segmentor.app](https://segmentor.app)
- **Documentation:** See `/docs` directory
- **Issues:** [GitHub Issues](https://github.com/your-username/segmentor/issues)

## Acknowledgments

- Apostles Model methodology (for the initial visualization)
- Built with privacy and user experience as core principles
