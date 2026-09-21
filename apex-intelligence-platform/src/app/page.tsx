import Link from 'next/link'

export default function Home() {
  return (
    <main className="min-h-screen bg-gradient-to-br from-slate-900 via-purple-900 to-slate-900">
      {/* Hero Section */}
      <section className="relative h-screen flex items-center justify-center overflow-hidden">
        {/* 3D Background Elements */}
        <div className="absolute inset-0 opacity-20">
          <div className="absolute w-96 h-96 bg-apex-primary rounded-full blur-3xl animate-float" />
          <div className="absolute top-1/4 right-1/4 w-72 h-72 bg-apex-secondary rounded-full blur-3xl animate-float" style={{ animationDelay: '2s' }} />
          <div className="absolute bottom-1/4 left-1/4 w-80 h-80 bg-apex-accent rounded-full blur-3xl animate-float" style={{ animationDelay: '4s' }} />
        </div>

        <div className="relative z-10 text-center px-4">
          <h1 className="text-6xl md:text-8xl font-bold mb-6 bg-gradient-to-r from-apex-primary via-apex-secondary to-apex-accent bg-clip-text text-transparent">
            Apex Intelligence
          </h1>
          <p className="text-xl md:text-2xl text-slate-300 mb-8 max-w-2xl mx-auto">
            Team management reimagined with 3D gamification
          </p>
          <Link href="/dashboard" className="inline-block px-8 py-4 bg-gradient-to-r from-apex-primary to-apex-secondary rounded-full text-white font-semibold text-lg hover:scale-105 transition-transform duration-300 shadow-lg shadow-apex-primary/50">
            Get Started
          </Link>
        </div>
      </section>
    </main>
  )
}
