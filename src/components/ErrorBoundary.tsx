import { Component, type ErrorInfo, type ReactNode } from 'react';
import { Button, Text, Title2, tokens } from '@fluentui/react-components';

const containerStyle = {
  display: 'flex',
  flexDirection: 'column' as const,
  alignItems: 'center',
  justifyContent: 'center',
  gap: tokens.spacingVerticalM,
  minHeight: '100vh',
  padding: tokens.spacingHorizontalXXXL,
  textAlign: 'center' as const,
};

interface ErrorBoundaryProps {
  children: ReactNode;
}

interface ErrorBoundaryState {
  error: Error | null;
}

export class ErrorBoundary extends Component<ErrorBoundaryProps, ErrorBoundaryState> {
  state: ErrorBoundaryState = { error: null };

  static getDerivedStateFromError(error: Error): ErrorBoundaryState {
    return { error };
  }

  componentDidCatch(error: Error, info: ErrorInfo) {
    console.error('ProTrack crashed:', error, info.componentStack);
  }

  render() {
    if (this.state.error) {
      return (
        <div style={containerStyle}>
          <Title2>Etwas ist schiefgelaufen</Title2>
          <Text>{this.state.error.message}</Text>
          <Button appearance="primary" onClick={() => window.location.assign('/')}>
            Zur Startseite
          </Button>
        </div>
      );
    }
    return this.props.children;
  }
}
