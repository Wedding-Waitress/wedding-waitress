import React, { Component, ReactNode } from 'react';
import { AlertCircle } from 'lucide-react';
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert';

interface Props {
  children: ReactNode;
  sectionLabel?: string;
}

interface State {
  hasError: boolean;
  error?: Error;
}

export class SectionErrorBoundary extends Component<Props, State> {
  constructor(props: Props) {
    super(props);
    this.state = { hasError: false };
  }

  static getDerivedStateFromError(error: Error): State {
    return { hasError: true, error };
  }

  componentDidCatch(error: Error, errorInfo: React.ErrorInfo) {
    console.error('Section error:', error, errorInfo);
  }

  render() {
    if (this.state.hasError) {
      return (
        <Alert variant="destructive" className="my-4">
          <AlertCircle className="h-4 w-4" />
          <AlertTitle>
            {this.props.sectionLabel ? `Error in "${this.props.sectionLabel}"` : 'Section Error'}
          </AlertTitle>
          <AlertDescription className="text-sm">
            This section couldn't load. The rest of your questionnaire is unaffected.
            {this.state.error?.message && (
              <p className="mt-1 text-xs opacity-75">{this.state.error.message}</p>
            )}
          </AlertDescription>
        </Alert>
      );
    }

    return this.props.children;
  }
}
