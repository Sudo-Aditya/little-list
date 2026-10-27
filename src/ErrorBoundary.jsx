import React from "react";

// Family B containment (qa/analysis/bug-pattern-analysis.md): an uncaught
// render error unmounts the whole React root and leaves a white page. This
// boundary converts any such crash into a recoverable screen; the underlying
// bugs still get fixed at source, but a future one can never blank the app.
class ErrorBoundary extends React.Component {
  constructor(props) {
    super(props);
    this.state = { error: null };
  }

  static getDerivedStateFromError(error) {
    return { error };
  }

  componentDidCatch(error, info) {
    console.error("Little List hit a rendering error:", error, info.componentStack);
  }

  render() {
    if (!this.state.error) return this.props.children;
    return (
      <main className="error-boundary" role="alert">
        <h1>Something went wrong.</h1>
        <p>Your list is safe on the server — this was a display problem. Reload the page to continue; if it keeps happening, try another browser.</p>
        <button type="button" onClick={() => window.location.reload()}>Reload</button>
      </main>
    );
  }
}

export default ErrorBoundary;
