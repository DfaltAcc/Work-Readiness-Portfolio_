import { Card } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { VideoUpload } from "@/components/video-upload"

interface Evidence {
  title: string
  description: string
  highlights: string[]
}

interface Reflection {
  situation: string
  task: string
  action: string
  result: string
}

interface PortfolioSectionProps {
  id: string
  title: string
  description: string
  evidence: Evidence
  reflection: Reflection
}

export function PortfolioSection({ id, title, description, evidence, reflection }: PortfolioSectionProps) {
  const handleVideoUpload = (file: File) => {
    console.log('Video uploaded:', file.name)
    // You can add additional logic here to handle the uploaded video
  }

  return (
    <section id={id} className="scroll-mt-24">
      <div className="space-y-12">
        {/* Section Header */}
        <div className="space-y-4">
          <h2 className="text-4xl md:text-5xl font-semibold tracking-tight text-balance">{title}</h2>
          <p className="text-lg text-muted-foreground max-w-2xl text-balance leading-relaxed">{description}</p>
        </div>

        {/* Video Upload - Only show for mock interview section */}
        {id === "mock-interview" && (
          <VideoUpload
            onVideoUpload={handleVideoUpload}
            maxSizeMB={150}
            acceptedFormats={['mp4', 'mov', 'avi', 'webm', 'mkv']}
          />
        )}

        {/* Evidence Card */}
        <Card className="p-8 md:p-12 space-y-6 border-border/50 shadow-sm">
          <div className="space-y-2">
            <Badge variant="secondary" className="mb-2">
              Evidence
            </Badge>
            <h3 className="text-2xl font-semibold">{evidence.title}</h3>
            <p className="text-muted-foreground leading-relaxed">{evidence.description}</p>
          </div>

          <div className="space-y-3 pt-4">
            <h4 className="text-sm font-medium text-muted-foreground uppercase tracking-wide">Key Highlights</h4>
            <ul className="space-y-2">
              {evidence.highlights.map((highlight, index) => (
                <li key={index} className="flex items-start gap-3">
                  <span className="text-accent mt-1.5">•</span>
                  <span className="text-foreground leading-relaxed">{highlight}</span>
                </li>
              ))}
            </ul>
          </div>
        </Card>

        {/* Reflection Card - STAR Technique */}
        <Card className="p-8 md:p-12 space-y-8 border-border/50 shadow-sm">
          <div className="space-y-2">
            <Badge variant="secondary" className="mb-2">
              Reflection: STAR Technique
            </Badge>
            <h3 className="text-2xl font-semibold">Learning Reflection</h3>
          </div>

          <div className="grid gap-8">
            <div className="space-y-3">
              <div className="flex items-center gap-3">
                <div className="flex items-center justify-center w-10 h-10 rounded-full bg-accent/10 text-accent font-semibold">
                  S
                </div>
                <h4 className="text-lg font-semibold">Situation</h4>
              </div>
              <p className="text-muted-foreground leading-relaxed pl-13">{reflection.situation}</p>
            </div>

            <div className="space-y-3">
              <div className="flex items-center gap-3">
                <div className="flex items-center justify-center w-10 h-10 rounded-full bg-accent/10 text-accent font-semibold">
                  T
                </div>
                <h4 className="text-lg font-semibold">Task</h4>
              </div>
              <p className="text-muted-foreground leading-relaxed pl-13">{reflection.task}</p>
            </div>

            <div className="space-y-3">
              <div className="flex items-center gap-3">
                <div className="flex items-center justify-center w-10 h-10 rounded-full bg-accent/10 text-accent font-semibold">
                  A
                </div>
                <h4 className="text-lg font-semibold">Action</h4>
              </div>
              <p className="text-muted-foreground leading-relaxed pl-13">{reflection.action}</p>
            </div>

            <div className="space-y-3">
              <div className="flex items-center gap-3">
                <div className="flex items-center justify-center w-10 h-10 rounded-full bg-accent/10 text-accent font-semibold">
                  R
                </div>
                <h4 className="text-lg font-semibold">Result</h4>
              </div>
              <p className="text-muted-foreground leading-relaxed pl-13">{reflection.result}</p>
            </div>
          </div>
        </Card>
      </div>
    </section>
  )
}
