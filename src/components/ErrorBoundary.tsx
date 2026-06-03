import React from 'react';

type State = { hasError: boolean; message?: string };

export default class ErrorBoundary extends React.Component<React.PropsWithChildren, State> {
  constructor(props: React.PropsWithChildren) {
    super(props);
    this.state = { hasError: false };
  }

  static getDerivedStateFromError(error: Error) {
    return { hasError: true, message: error?.message };
  }

  componentDidCatch(error: Error, info: any) {
    // Send to logging backend if available
    // eslint-disable-next-line no-console
    console.error('Unhandled render error:', error, info);
  }

  render() {
    if (this.state.hasError) {
      return (
        <div className="p-6 min-h-screen flex items-center justify-center bg-white text-gray-800">
          <div className="max-w-lg text-center">
            <h1 className="text-2xl font-semibold mb-2">An error occurred</h1>
            <p className="mb-4">The application encountered an unexpected error. Please try refreshing the page.</p>
            {this.state.message && <pre className="text-sm text-left bg-gray-100 p-3 rounded">{this.state.message}</pre>}
          </div>
        </div>
      );
    }

    return this.props.children as React.ReactElement;
  }
}
