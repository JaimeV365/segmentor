import React, { Component, ErrorInfo, ReactNode } from 'react';
import { Database, AlertCircle } from 'lucide-react';

interface Props {
  children: ReactNode;
  onError?: (error: Error, errorInfo: ErrorInfo) => void;
}

interface State {
  hasError: boolean;
  error?: Error;
}

export class DataProcessingErrorBoundary extends Component<Props, State> {
  constructor(props: Props) {
    super(props);
    this.state = { hasError: false };
  }

  static getDerivedStateFromError(error: Error): State {
    return { hasError: true, error };
  }

  componentDidCatch(error: Error, errorInfo: ErrorInfo) {
    console.error('Data Processing Error Boundary caught an error:', error, errorInfo);
    
    this.setState({ error });

    if (this.props.onError) {
      this.props.onError(error, errorInfo);
    }
  }

  handleRetry = () => {
    this.setState({ hasError: false, error: undefined });
  };

  render() {
    if (this.state.hasError) {
      return (
        <div className="data-processing-error">
          <div className="error-content">
            <div className="error-icon">
              <Database size={32} color="#f59e0b" />
            </div>
            <h4 className="error-title">Data Processing Error</h4>
            <p className="error-message">
              There was an issue processing the chart data. This might be due to invalid data format or missing required fields.
            </p>
            
            {process.env.NODE_ENV === 'development' && this.state.error && (
              <div className="error-details">
                <AlertCircle size={16} color="#ef4444" />
                <span className="error-text">{this.state.error.message}</span>
              </div>
            )}
            
            <button 
              className="retry-button"
              onClick={this.handleRetry}
            >
              Retry Data Processing
            </button>
          </div>
        </div>
      );
    }

    return this.props.children;
  }
}




















































