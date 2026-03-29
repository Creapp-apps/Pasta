import { login, signup } from './actions'
import { ChefHat, ArrowLeft } from 'lucide-react'
import Link from 'next/link'

export default function LoginPage() {
  return (
    <div className="flex min-h-screen flex-col items-center justify-center bg-slate-50 py-12 px-4 sm:px-6 lg:px-8 relative">
      <Link href="/" className="absolute top-8 left-8 flex items-center gap-2 text-slate-500 hover:text-orange-500 transition font-medium">
        <ArrowLeft size={20} />
        Volver
      </Link>

      <div className="w-full max-w-md space-y-8 bg-white p-8 rounded-2xl shadow-sm border border-slate-200">
        <div className="flex flex-col items-center">
          <div className="bg-orange-500 p-3 rounded-xl text-white mb-4">
            <ChefHat size={32} />
          </div>
          <h2 className="mt-2 text-center text-3xl font-bold tracking-tight text-slate-900">
            Ingreso al Panel
          </h2>
          <p className="mt-2 text-center text-sm text-slate-600">
            Fábrica de Pastas Multi-tenant
          </p>
        </div>
        
        <form className="mt-8 space-y-6">
          <div className="space-y-4 rounded-md shadow-sm">
            <div>
              <label htmlFor="email" className="sr-only">Correo electrónico</label>
              <input
                id="email"
                name="email"
                type="email"
                autoComplete="email"
                required
                className="relative block w-full rounded-lg border-0 py-2.5 px-3 text-slate-900 ring-1 ring-inset ring-slate-300 placeholder:text-slate-400 focus:z-10 focus:ring-2 focus:ring-inset focus:ring-orange-500 sm:text-sm sm:leading-6"
                placeholder="correo@fabrica.com"
              />
            </div>
            <div>
              <label htmlFor="password" className="sr-only">Contraseña</label>
              <input
                id="password"
                name="password"
                type="password"
                autoComplete="current-password"
                required
                className="relative block w-full rounded-lg border-0 py-2.5 px-3 text-slate-900 ring-1 ring-inset ring-slate-300 placeholder:text-slate-400 focus:z-10 focus:ring-2 focus:ring-inset focus:ring-orange-500 sm:text-sm sm:leading-6"
                placeholder="Contraseña"
              />
            </div>
          </div>

          <div className="flex flex-col gap-3">
            <button
              formAction={login}
              className="flex w-full justify-center rounded-xl bg-orange-500 px-3 py-3 text-sm font-semibold text-white shadow-sm hover:bg-orange-600 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-orange-500 transition cursor-pointer"
            >
              Iniciar sesión
            </button>
            <button
              formAction={signup}
              className="flex w-full justify-center rounded-xl bg-slate-100 hover:bg-slate-200 px-3 py-3 text-sm font-semibold text-slate-900 transition cursor-pointer"
            >
              Crear cuenta (Solo SuperAdmin)
            </button>
          </div>
        </form>
      </div>
    </div>
  )
}
