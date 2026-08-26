interface SkipLinkProps {
  label: string;
}

/** Keyboard-only "skip to content" link — first focusable element on every page. */
export function SkipLink({ label }: SkipLinkProps) {
  return (
    <a className="skip-link" href="#main-content">
      {label}
    </a>
  );
}
