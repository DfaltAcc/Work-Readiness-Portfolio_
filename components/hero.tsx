export function Hero() {
  return (
    <section className="min-h-screen flex items-center justify-center px-6 pt-16">
      <div className="max-w-4xl mx-auto text-center space-y-8 animate-fade-in-up">
        <div className="space-y-4">
          <p className="text-sm text-muted-foreground tracking-wide uppercase">Digital Portfolio</p>
          <h1 className="text-5xl md:text-7xl font-semibold tracking-tight text-balance">
            Work Readiness & Professional Development
          </h1>
        </div>

        <p className="text-lg md:text-xl text-muted-foreground max-w-2xl mx-auto text-balance leading-relaxed">
          A comprehensive showcase of professional skills, training outcomes, and reflections from the Work Readiness
          program at Cape Peninsula University of Technology.
        </p>

        <div className="flex flex-col sm:flex-row items-center justify-center gap-4 pt-8">
          <a
            href="#business-communication"
            className="inline-flex items-center justify-center rounded-full bg-primary text-primary-foreground px-8 py-3 text-sm font-medium transition-all hover:opacity-90"
          >
            View Portfolio
          </a>
          <a
            href="#workplace-etiquette"
            className="inline-flex items-center justify-center rounded-full border border-border bg-background px-8 py-3 text-sm font-medium transition-all hover:bg-secondary"
          >
            Skip to End
          </a>
        </div>
      </div>
    </section>
  )
}
