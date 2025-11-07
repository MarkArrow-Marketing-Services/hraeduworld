import React from "react";
import "../styles/ErrorBoundary.css";

class ErrorBoundary extends React.Component {
  constructor(props) {
    super(props);
    this.state = { hasError: false };
  }

  // keep existing error lifecycle logic unchanged
  static getDerivedStateFromError(error) {
    return { hasError: true };
  }

  componentDidCatch(error, errorInfo) {
    console.error("Error Boundary caught an error", error, errorInfo);
  }

  // lightweight retry helper (non-destructive UX improvement)
  handleRetry = () => {
    // simple page reload to retry — keeps behaviour predictable
    if (typeof window !== "undefined") {
      window.location.reload();
    }
  };

  render() {
    if (this.state.hasError) {
      return (
        // role + aria-live improve screen-reader behavior when an error happens
        <div className="error-boundary" role="alert" aria-live="polite">
          <div className="eb-card">
            {/* Primary message — clear visual hierarchy */}
            <h2 className="eb-title">Something went wrong</h2>

            {/* Short helpful guidance — readable lines and relaxed spacing */}
            <p className="eb-message">
              We're sorry — an unexpected error occurred. Try refreshing the
              page, or contact support if the problem persists.
            </p>

            {/* Actions area: retry + contact — keyboard accessible and big tap targets on mobile */}
            <div className="eb-actions">
              <button
                className="eb-btn eb-btn-primary"
                onClick={this.handleRetry}
                aria-label="Retry (reload page)"
              >
                Retry
              </button>

              <a
                className="eb-btn eb-btn-ghost"
                href="mailto:support@example.com?subject=App%20Error%20Report"
                aria-label="Contact support"
              >
                Contact Support
              </a>
            </div>

            {/* subtle footer note — helpful for power users / debugging */}
            <div className="eb-footer" aria-hidden="true">
              If the issue continues, please note any steps you took and include
              them in your message.
            </div>
          </div>
        </div>
      );
    }

    // no change to normal rendering path
    return this.props.children;
  }
}

export default ErrorBoundary;
