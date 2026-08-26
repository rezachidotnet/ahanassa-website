"use client";

/**
 * Catches errors in the root layout itself. Must render its own <html>/<body>
 * and stay maximally simple — this is the last line of defense, not a place
 * for design-system dependencies that could themselves fail.
 */
export default function GlobalError({ reset }: { error: Error; reset: () => void }) {
  return (
    <html lang="en">
      <body style={{ fontFamily: "system-ui, sans-serif", padding: "3rem", textAlign: "center" }}>
        <p>Something went wrong.</p>
        <button type="button" onClick={reset} style={{ marginTop: "1rem" }}>
          Retry
        </button>
      </body>
    </html>
  );
}
