import { Navigation } from "@/components/navigation"
import { Hero } from "@/components/hero"
import { PortfolioSection } from "@/components/portfolio-section"
import { Footer } from "@/components/footer"

export default function Home() {
  return (
    <main className="min-h-screen">
      <Navigation />
      <Hero />

      <div className="max-w-6xl mx-auto px-6 py-20 space-y-32">
        <PortfolioSection
          id="business-communication"
          title="Business Communication"
          description="Developing professional communication skills for the modern workplace"
          evidence={{
            title: "Communication Excellence",
            description:
              "Completed comprehensive training in professional business communication, including written correspondence, presentations, and interpersonal communication strategies.",
            highlights: [
              "Professional email writing and etiquette",
              "Effective presentation delivery",
              "Active listening and feedback techniques",
              "Cross-cultural communication awareness",
            ],
          }}
          reflection={{
            situation:
              "During the business communication module, I was tasked with preparing and delivering a professional presentation to stakeholders.",
            task: "My responsibility was to communicate complex technical information in a clear, accessible manner while maintaining professional standards.",
            action:
              "I researched audience needs, structured content logically, created visual aids, and practiced delivery multiple times. I incorporated feedback from peers and refined my approach.",
            result:
              "The presentation was well-received, with stakeholders praising the clarity and professionalism. I gained confidence in public speaking and learned the importance of audience-centered communication.",
          }}
        />

        <PortfolioSection
          id="interview-skills"
          title="Interview Skills"
          description="Mastering the art of professional interviews and self-presentation"
          evidence={{
            title: "Interview Preparation & Techniques",
            description:
              "Comprehensive training in interview preparation, question handling, and professional self-presentation for various interview formats.",
            highlights: [
              "Research and preparation strategies",
              "STAR method for behavioral questions",
              "Body language and non-verbal communication",
              "Follow-up and professional etiquette",
            ],
          }}
          reflection={{
            situation:
              "I participated in interview skills workshops to prepare for entering the professional workforce.",
            task: "I needed to develop strategies for effectively presenting my skills, experience, and value to potential employers.",
            action:
              "I practiced answering common interview questions using the STAR technique, researched companies thoroughly, and participated in mock interviews to refine my approach.",
            result:
              "My interview performance improved significantly. I became more confident in articulating my strengths and learned to handle challenging questions with composure.",
          }}
        />

        <PortfolioSection
          id="mock-interview"
          title="Mock Interview"
          description="Real-world interview simulation and performance evaluation"
          evidence={{
            title: "Mock Interview Experience",
            description:
              "Participated in realistic interview simulations with industry professionals, receiving detailed feedback on performance and areas for improvement.",
            highlights: [
              "Technical and behavioral question practice",
              "Real-time feedback from professionals",
              "Video recording and self-assessment",
              "Improvement plan development",
            ],
          }}
          reflection={{
            situation:
              "I participated in a mock interview session designed to simulate real-world job interviews in the ICT industry.",
            task: "My goal was to demonstrate my technical knowledge, soft skills, and professional demeanor under interview conditions.",
            action:
              "I prepared thoroughly by researching the company, reviewing my resume, and practicing responses. During the interview, I maintained eye contact, spoke clearly, and used specific examples to support my answers.",
            result:
              "I received constructive feedback highlighting my strengths in technical communication and areas to improve, such as being more concise. This experience significantly boosted my interview readiness.",
          }}
        />

        <PortfolioSection
          id="professional-networking"
          title="Professional Networking"
          description="Building meaningful professional relationships and expanding career opportunities"
          evidence={{
            title: "Networking Strategies & Practice",
            description:
              "Training in professional networking techniques, both in-person and online, including LinkedIn optimization and industry event participation.",
            highlights: [
              "LinkedIn profile optimization",
              "Elevator pitch development",
              "Industry event participation",
              "Professional relationship maintenance",
            ],
          }}
          reflection={{
            situation:
              "I attended networking workshops and industry events to build professional connections in the ICT field.",
            task: "I needed to develop authentic networking skills and create a professional online presence to expand career opportunities.",
            action:
              "I optimized my LinkedIn profile, prepared a concise elevator pitch, and actively engaged with professionals at events. I followed up with connections and maintained relationships through meaningful interactions.",
            result:
              "I expanded my professional network significantly, gained insights into industry trends, and created opportunities for mentorship and potential employment.",
          }}
        />

        <PortfolioSection
          id="workplace-etiquette"
          title="Workplace Etiquette"
          description="Understanding professional standards and workplace culture"
          evidence={{
            title: "Professional Conduct & Standards",
            description:
              "Comprehensive training in workplace professionalism, including dress code, time management, teamwork, and ethical conduct.",
            highlights: [
              "Professional appearance and dress code",
              "Time management and punctuality",
              "Teamwork and collaboration",
              "Ethical decision-making and integrity",
            ],
          }}
          reflection={{
            situation:
              "Through workplace etiquette training, I learned the importance of professional conduct in organizational settings.",
            task: "I needed to understand and demonstrate appropriate workplace behavior, from punctuality to professional communication.",
            action:
              "I studied workplace norms, observed professional role models, and consciously applied etiquette principles in all interactions. I sought feedback and adjusted my behavior accordingly.",
            result:
              "I developed a strong professional presence and understanding of workplace culture. This foundation prepared me to integrate smoothly into professional environments and build positive working relationships.",
          }}
        />
      </div>

      <Footer />
    </main>
  )
}
