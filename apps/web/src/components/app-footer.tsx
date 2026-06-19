export function AppFooter() {
  return (
    <footer className="mt-auto border-t border-border">
      <div className="mx-auto flex max-w-7xl items-center justify-between px-4 py-4 text-xs text-muted-foreground">
        <span>
          <span className="font-display font-semibold text-foreground">SVNHUB</span>
          <span className="text-muted-foreground"> — gerenciamento SVN moderno</span>
        </span>
        <span>© {new Date().getFullYear()}</span>
      </div>
    </footer>
  );
}
