export function Footer() {
  return (
    <footer className="border-t border-border mt-32">
      <div className="max-w-6xl mx-auto px-6 py-12">
        <div className="flex flex-col md:flex-row items-center justify-between gap-6">
          <div className="text-center md:text-left">
            <p className="text-sm text-muted-foreground">Cape Peninsula University of Technology</p>
            <p className="text-sm text-muted-foreground">Diploma in Information and Communication Technology</p>
            <p className="text-sm text-muted-foreground mt-1">Project Presentation 3 • PRP370S/371S/372S</p>
          </div>

          <div className="text-center md:text-right">
            <p className="text-sm text-muted-foreground">Assessment Period: October 2024</p>
            <p className="text-sm text-muted-foreground mt-2">© {new Date().getFullYear()} All rights reserved</p>
          </div>
        </div>
      </div>
    </footer>
  )
}
