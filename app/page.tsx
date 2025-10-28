import { Navigation } from "@/components/navigation"
import { Hero } from "@/components/hero"
import { PortfolioSection } from "@/components/portfolio-section"
import { Footer } from "@/components/footer"
import { StorageDebug } from "@/components/storage-debug"
import { StorageTest } from "@/components/storage-test"
import { StorageDiagnostics } from "@/components/storage-diagnostics"

export default function Home() {
  return (
    <main className="min-h-screen">
      <Navigation />
      <Hero />

      <div className="max-w-6xl mx-auto px-6 py-20 space-y-32">
        <PortfolioSection
          id="business-communication"
          title="Business Communication"
          description="Learning professional communication in a real software development environment"
          evidence={{
            title: "Real-World Technical Communication",
            description:
              "Developed professional communication skills during placement at Plum Systems, working on Issue #459 - a high-priority bug affecting mobile app and web portal synchronization.",
            highlights: [
              "Clear technical documentation with evidence and screenshots",
              "Effective use of issue tracking systems and team communication tools",
              "Professional status updates and progress reporting",
              "Collaborative problem-solving with cross-functional team members",
              "Escalation protocols and conflict resolution in technical environments",
            ],
          }}
          reflection={{
            situation:
              "During my placement at Plum Systems, I got involved in fixing a serious bug (Issue #459) where information people entered on the mobile app wasn't showing up properly on the web portal. It was marked as high priority because it was affecting actual users, and I had to figure out how to communicate with a whole team of people—developers like Hlumelo Madlingozi, testers like Tristan Sampson, Nontando Zondi, and Thaakirah Watson, plus my supervisor Luyolo Skoma. The issue tracking system felt overwhelming, and everyone seemed to communicate so quickly and efficiently. Things got more complicated when we discovered SDK version compatibility problems, and I realized that clear communication was just as important as technical skills.",
            task: "I needed to learn how to actually communicate in a real software development environment. That meant figuring out how to document problems clearly, give useful status updates, know when to tag someone versus when to stay quiet, understand when to escalate issues, and keep things professional even when stuff wasn't working. I also had to pick up on the unwritten rules—like when an '@' mention was urgent versus just informational, how much technical detail different people needed, and how to report blockers without sounding like I was making excuses.",
            action:
              "I started by watching how the team communicated and taking notes on what seemed to work. I noticed that good updates were specific—not vague things like 'still working on it.' People attached screenshots and documents as proof. They used '@' mentions to make sure the right person saw the message. When Nontando ran into the SDK problem, she didn't just say 'it's broken'—she explained exactly what was happening: 'the project is using Expo SDK 53, which is not compatible with the version of Expo Go installed on my iOS device (SDK 54.0.0).' I started practicing writing my own updates and asked Luyolo to check them before I posted anything important. I learned to always attach evidence—screenshots, error messages, whatever—instead of expecting people to just trust what I was saying.",
            result:
              "My writing got so much better during that placement. Luyolo actually told me my updates were 'clear and professional—exactly what we need on the team.' I realized that good business communication in tech isn't about writing long formal emails or using fancy words. It's about being clear, backing up what you say with evidence, and not wasting people's time. By the end of my time there, I was writing my own issue reports, giving testing feedback, and actually contributing to team discussions without second-guessing every word. The biggest thing I learned? Good communication moves work forward. Clear communication prevents confusion, cuts down on unnecessary meetings, and makes you look professional and reliable.",
          }}
        />

        <PortfolioSection
          id="interview-skills"
          title="Interview Skills"
          description="Transforming interview anxiety into confidence through structured practice and preparation"
          evidence={{
            title: "Interview Mastery Through SHL Platform Training",
            description:
              "Overcame severe interview anxiety through intensive practice using the SHL online platform, mock interviews with industry professionals, and systematic skill development using the STAR technique.",
            highlights: [
              "SHL video interview platform mastery with 30-45 second prep time",
              "STAR technique implementation across 12 prepared scenarios",
              "Company research methodology for 15+ target organizations",
              "Technical communication skills for non-technical audiences",
              "Professional video presence and body language improvement",
              "Callback rate improvement from 10% to 60%",
            ],
          }}
          reflection={{
            situation:
              "I used to absolutely dread interviews. During my work readiness program, my first few mock interviews were honestly terrible. I'd freeze up when asked behavioral questions, ramble through my answers without any structure, and barely make eye contact because I was so nervous. I knew I had good skills and real experiences to talk about, but I just couldn't get the words out in a way that sounded confident or impressive. The idea of sitting in front of actual recruiters made my stomach drop.",
            task: "I had to completely transform how I approached interviews. I needed to learn the STAR technique everyone kept talking about, get comfortable on camera (since most interviews were happening online), fix my body language and eye contact issues, and somehow turn my anxiety into actual confidence. It wasn't just about memorizing good answers—I needed to genuinely feel prepared and capable when facing interviewers.",
            action:
              "The real game-changer was the SHL online platform. It simulates real interviews where you get a question on screen and have maybe 30-45 seconds to think before the camera starts recording your answer. The first time I watched myself back, I wanted to hide under my desk. I said 'um' like every third word and looked away from the camera constantly. So I started practicing the same questions over and over, each time focusing on fixing one specific thing. I built a collection of 12 stories from my life using the STAR format—covering teamwork, problem-solving, conflicts I'd dealt with, technical challenges, everything. I researched about 15 companies I was interested in, learning about what they actually did and what they valued. I did 8 mock interviews with real professionals and actually listened to their feedback instead of just defending myself.",
            result:
              "My confidence went from like a 3 out of 10 to maybe an 8 out of 10. The SHL platform made the biggest difference because I practiced so many times that being on camera started to feel normal instead of terrifying. When I had my first real panel interview—three people, 90 minutes, for a junior developer role—I was nervous but not panicking. They actually complimented my communication and preparation. The lead developer specifically mentioned that I explained a complex project clearly and asked really good questions about their team. My callback rate jumped from about 10% to 60%, which was huge. Real confidence doesn't come from memorizing perfect answers—it comes from preparing thoroughly, knowing your own story, and being okay with being human.",
          }}
        />

        <PortfolioSection
          id="mock-interview"
          title="Mock Interview"
          description="Intensive mock interview experience with Microsoft recruiter providing real-world assessment"
          evidence={{
            title: "Professional Mock Interview Assessment",
            description:
              "Completed a comprehensive 50-minute mock interview with Sarah Chen, a senior IT recruiter with 12 years at Microsoft and other tech companies, including behavioral and technical assessments with video recording.",
            highlights: [
              "30-minute behavioral interview using STAR methodology",
              "20-minute technical whiteboard assessment for Systems Analyst role",
              "Professional video recording and detailed feedback session",
              "Database design problem-solving under pressure",
              "Self-correction and adaptability demonstration",
              "Business-focused questioning and engagement",
            ],
          }}
          reflection={{
            situation:
              "I participated in this intense mock interview that was designed to feel exactly like a real job interview in the ICT field. The interviewer was Sarah Chen, who'd worked as a senior IT recruiter at Microsoft and other tech companies for 12 years, so she knew exactly what she was looking for. It was a 30-minute behavioral interview followed by a 20-minute technical assessment, and they recorded the whole thing on video. When I walked in and saw all the camera equipment, I felt my anxiety spike immediately.",
            task: "I had to demonstrate that I could handle both behavioral questions using the STAR method and solve technical problems on a whiteboard while explaining my thinking. Plus, I had to manage my very visible nervousness and make a strong enough impression that Sarah would theoretically move me forward to the next round. Basically, I had to prove I could actually do this in real life.",
            action:
              "I spent three solid days preparing. I reviewed typical systems analyst responsibilities, went back through my coursework on database management and systems design, and practiced 15 common behavioral questions with my study partner. During the interview, I tried really hard to actually listen to each question instead of just waiting for my turn to talk. When Sarah asked me to describe a time I solved a technical problem under pressure, I used STAR to explain how I debugged a database connectivity issue in a group project. For the technical part, she gave me a scenario about designing a database for a library system. I talked through my approach on the whiteboard step by step, asking questions about what they actually needed. Here's the thing—I made a mistake in my initial database design. But I caught it myself, said 'Actually, wait, that's not going to work because...' and fixed it right there instead of trying to pretend it was correct.",
            result:
              "The feedback session was really eye-opening. Sarah said my technical communication was strong—she liked that I explained my thinking process, and even my mistake showed good problem-solving because I caught and corrected it myself. She gave my STAR responses an 8 out of 10, saying my examples were specific and focused on actual results. But she also pointed out things I needed to work on. I tended to over-explain technical stuff when simpler would be better. Watching the video recording was uncomfortable as hell, but also super valuable. I counted 23 times I said 'so' as a filler word. This mock interview changed everything for me. When I had my first real interview three weeks later, I felt prepared instead of terrified. I actually got a callback. The biggest lesson? Perfection isn't the goal. Real employers want to see genuine competence, self-awareness, and the ability to recover when things don't go perfectly.",
          }}
        />

        <PortfolioSection
          id="professional-networking"
          title="Professional Networking"
          description="Overcoming networking anxiety to build authentic professional relationships and career opportunities"
          evidence={{
            title: "Cape Town ICT Career Expo Success",
            description:
              "Transformed from networking anxiety to confident relationship building at the Cape Town ICT Career Expo, resulting in meaningful connections and direct job opportunities through strategic LinkedIn optimization and authentic engagement.",
            highlights: [
              "LinkedIn transformation from 12 to 67 connections in two months",
              "Strategic company research for 8 target organizations at expo",
              "Authentic conversation techniques focusing on learning over selling",
              "Professional follow-up methodology with personalized connection requests",
              "Direct job referral resulting in internship opportunity",
              "Profile view increase from 2 to 25+ per week",
            ],
          }}
          reflection={{
            situation:
              "I went to my first professional networking event—the Cape Town ICT Career Expo at the Century City Conference Centre—and I felt completely out of place. I've always been more introverted, and the whole idea of walking up to strangers to 'sell myself' felt fake and terrifying. My LinkedIn profile was basically empty except for my education and a boring headline. I had zero professional connections outside of classmates. I stood by the snack table for probably 20 minutes, pretending to be busy on my phone while watching confident people exchange business cards and have these animated conversations.",
            task: "I needed to get over my networking anxiety and figure out how to build real professional relationships, not just collect business cards. I wanted to make at least 5 genuine connections at the expo, get some actual career advice, and fix my LinkedIn profile so it would actually help me instead of making me look like I just graduated high school.",
            action:
              "I decided to prepare like crazy before the event. I looked up all 30+ companies that were attending and picked 8 that actually matched my interests in web development and IT support. I completely rewrote my LinkedIn with help from a career counselor—got a decent headshot from a friend who does photography, changed my headline to 'Aspiring Full-Stack Developer | Problem-Solver | Lifelong Learner,' and added real descriptions of my academic projects with actual results. At the expo, I made myself a deal—approach one person every 15 minutes. Instead of immediately asking about jobs, I asked about their technology and company culture. I met this DevOps engineer named James, and when I asked about their CI/CD pipeline, he seemed genuinely impressed that I even knew what that was. After the event, I sent personalized LinkedIn connection requests within 24 hours, mentioning something specific we talked about.",
            result:
              "My LinkedIn connections went from 12 (mostly family and classmates) to 67 within two months. That included 8 industry professionals, 3 recruiters, and a bunch of peers who became study partners and actual friends. My profile views jumped from like 2 per week to 25+. But here's the best part: three months later, James remembered me when a junior DevOps internship opened at his company. He messaged me directly with the opportunity and offered to refer me internally, which basically put my application at the top of the pile. I got an interview and ended up getting the internship offer. I realized that networking isn't manipulation or being fake—it's just building genuine relationships with people who share your interests. My anxiety went way down when I stopped thinking 'what can I get from this person?' and started thinking 'what can I learn from them?' Authenticity and curiosity are way more powerful than any polished elevator pitch.",
          }}
        />

        <PortfolioSection
          id="workplace-etiquette"
          title="Workplace Etiquette"
          description="10 months of professional development at Plum Systems - from rookie mistakes to trusted team member"
          evidence={{
            title: "Professional Transformation at Plum Systems",
            description:
              "Demonstrated significant professional growth over 10 months at Plum Systems, evolving from early workplace mistakes to becoming a trusted team member through consistent application of professional standards and communication protocols.",
            highlights: [
              "Mastery of Odoo time tracking and work management system",
              "Professional GitLab communication and status reporting",
              "Consistent punctuality and accountability practices",
              "Cross-functional collaboration with developers and testers",
              "Regular feedback integration and continuous improvement",
              "Recognition as 'reliable team member' by senior developers",
            ],
          }}
          reflection={{
            situation:
              "I've been working at Plum Systems for 10 months now, and in the beginning, I honestly struggled with workplace professionalism. On my third day, I arrived about 7 minutes late because I underestimated Cape Town traffic. I was wearing jeans and a casual hoodie because I thought 'tech company' meant everyone dressed super casual. I also forgot to clock in using Odoo (our time tracking and work management system), and then I interrupted a senior developer mid-conversation to ask about lunch break timing. My supervisor, Luyolo Skoma, pulled me aside and had a gentle but firm conversation about all of this.",
            task: "I needed to understand and demonstrate consistent professional behavior across multiple areas: punctuality and proper time tracking in Odoo, appropriate workplace dress, respectful communication through our systems (Odoo for emails, GitLab for project updates), regular status updates on bugs I was fixing, and proper workplace etiquette. Basically, I had to shift from a student mindset to a professional mindset and prove I could be reliable and accountable in a real work environment.",
            action:
              "I took Luyolo's feedback seriously and made real changes. For punctuality, I started leaving home 30 minutes earlier than needed, building in buffer time for traffic or train delays. I set a phone reminder to clock in on Odoo as soon as I arrived. I learned to use the company's systems properly: Odoo for internal communication and work emails, and GitLab for all software development work. The regular updates were tough at first. When I was working on a bug, I had to discipline myself to post progress updates on GitLab throughout the day, not just when I finished. Even if I was stuck, I'd update the issue with 'Currently investigating X, tested Y and Z approaches, still troubleshooting.' I studied how people communicated by observing. I noticed they asked 'Is now a good time?' before interrupting someone who looked focused. I started asking Luyolo weekly 'What's one thing I could improve?' and then actually working on whatever he said.",
            result:
              "Over these 10 months, the transformation has been huge. After the first few weeks, Luyolo commented that I'd 'completely turned around' and showed real professional maturity. The team started trusting me with more responsibility—including me in client meetings and assigning me more complex bugs to fix. One developer, Thabo, specifically requests me to help on his projects because I'm 'reliable and keep people updated.' My GitLab updates have become second nature now. Luyolo has mentioned that my consistency and communication make me a valuable team member. The most important thing I've learned over these 10 months? Workplace etiquette isn't just random rules meant to make work boring. It's a framework of mutual respect and accountability that helps teams function smoothly. These habits have become part of who I am professionally now. Every interaction either builds or diminishes your professional reputation, and after 10 months at Plum Systems, I've learned that reputation is built through consistent, daily professionalism.",
          }}
        />
      </div>

      <Footer />
      <StorageDebug />
      <StorageTest />
      <StorageDiagnostics />
    </main>
  )
}
