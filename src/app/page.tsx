import Link from "next/link";
import { ArrowRight, ChefHat, Factory, LayoutDashboard } from "lucide-react";

export default function Home() {
  return (
    <div className="min-h-screen bg-slate-50 text-slate-900 flex flex-col">
      {/* Header Público / Super Admin */}
      <header className="w-full py-6 px-4 border-b border-slate-200 bg-white">
        <div className="max-w-7xl mx-auto flex items-center justify-between">
          <div className="flex items-center gap-2">
            <div className="bg-orange-500 p-2 rounded-lg text-white">
              <Factory size={24} />
            </div>
            <h1 className="text-xl font-bold tracking-tight text-slate-800">
              Pasta<span className="text-orange-500">SaaS</span>
            </h1>
          </div>
          <nav className="hidden md:flex gap-6 text-sm font-medium text-slate-600">
            <Link href="#features" className="hover:text-orange-500 transition">Características</Link>
            <Link href="#pricing" className="hover:text-orange-500 transition">Planes</Link>
            <Link href="/login" className="hover:text-orange-500 transition">Ingresar</Link>
          </nav>
        </div>
      </header>

      {/* Hero Section */}
      <main className="flex-1 w-full max-w-7xl mx-auto px-4 py-16 flex flex-col items-center justify-center text-center">
        <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-orange-100 text-orange-700 text-sm font-semibold mb-6">
          <ChefHat size={16} />
          Plataforma Multi-fábrica
        </div>
        
        <h2 className="text-4xl md:text-6xl font-extrabold text-slate-900 tracking-tight max-w-3xl mb-6">
          Llevá tu fábrica de pastas al <span className="text-transparent bg-clip-text bg-gradient-to-r from-orange-500 to-red-500">siguiente nivel</span>
        </h2>
        
        <p className="text-lg md:text-xl text-slate-600 max-w-2xl mb-10">
          Controlá tu stock en tiempo real, gestioná las recetas, motivá a tus operarios y vendé online con nuestro sistema All-In-One. Todo desde el celular.
        </p>
        
        <div className="flex flex-col sm:flex-row gap-4">
          <Link href="/login" className="px-8 py-3 bg-orange-500 hover:bg-orange-600 text-white font-medium rounded-xl flex items-center justify-center gap-2 transition shadow-lg shadow-orange-500/20">
            <LayoutDashboard size={20} />
            Ir a mi Panel
          </Link>
          <Link href="/demofabrica" className="px-8 py-3 bg-white border border-slate-200 hover:border-orange-500 hover:text-orange-500 text-slate-700 font-medium rounded-xl flex items-center justify-center gap-2 transition">
            Ver Micro-Ecommerce Demo
            <ArrowRight size={20} />
          </Link>
        </div>
      </main>
    </div>
  );
}
