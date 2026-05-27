import React, { Component, ErrorInfo, ReactNode } from 'react';
import { AlertTriangle, RefreshCw } from 'lucide-react';

interface Props {
  children: ReactNode;
}

interface State {
  hasError: boolean;
  error: Error | null;
}

export class ErrorBoundary extends Component<Props, State> {
  constructor(props: Props) {
    super(props);
    this.state = {
      hasError: false,
      error: null
    };
  }

  public static getDerivedStateFromError(error: Error): State {
    return { hasError: true, error };
  }

  public componentDidCatch(error: Error, errorInfo: ErrorInfo) {
    console.error('Uncaught error:', error, errorInfo);
  }

  private handleReset = () => {
    this.setState({ hasError: false, error: null });
    window.location.reload();
  };

  public render() {
    if (this.state.hasError) {
      let errorMessage = "An unexpected error occurred.";
      let isFirestoreError = false;

      try {
        if (this.state.error?.message) {
          const parsed = JSON.parse(this.state.error.message);
          if (parsed && typeof parsed === 'object' && 'error' in parsed && 'operationType' in parsed) {
            errorMessage = `Database Error: ${parsed.error} during ${parsed.operationType} on ${parsed.path}`;
            isFirestoreError = true;
          }
        }
      } catch {
        errorMessage = this.state.error?.message || errorMessage;
      }

      return (
        <div className="min-h-screen flex items-center justify-center bg-gray-50 p-4">
          <div className="max-w-md w-full bg-white rounded-3xl shadow-2xl border border-gray-100 p-8 text-center space-y-6">
            <div className="w-20 h-20 bg-red-50 rounded-full flex items-center justify-center mx-auto">
              <AlertTriangle className="w-10 h-10 text-[#FF385C]" />
            </div>
            
            <div className="space-y-2">
              <h2 className="text-2xl font-black text-gray-900">Something went wrong</h2>
              <p className="text-gray-500 font-medium leading-relaxed">
                {isFirestoreError ? "We encountered a permission issue with the database." : "We're sorry for the inconvenience. Our team has been notified."}
              </p>
            </div>

            <div className="bg-gray-50 rounded-2xl p-4 text-left">
              <p className="text-xs font-mono text-gray-400 uppercase tracking-widest mb-2">Error Details</p>
              <p className="text-sm font-bold text-gray-700 break-words">{errorMessage}</p>
            </div>

            <button
              onClick={this.handleReset}
              className="w-full py-4 bg-[#FF385C] text-white rounded-2xl font-bold shadow-lg shadow-red-100 hover:bg-[#d9304e] transition-all flex items-center justify-center gap-2"
            >
              <RefreshCw className="w-5 h-5" />
              Reload Application
            </button>
          </div>
        </div>
      );
    }

    return this.props.children;
  }
}
