import { fetchClients } from '@/app/actions/clientActions'
import ClientsPanel from '@/components/clients/ClientsPanel'

export default async function ClientesPage() {
   const { data: clients, error } = await fetchClients()

   if (error) {
      return (
         <div className="p-8 text-center bg-red-50 text-red-600 rounded-2xl border border-red-200">
            <h2 className="font-bold text-xl mb-2">Error cargando clientes</h2>
            <p>{error}</p>
         </div>
      )
   }

   return (
      <div className="w-full">
         <ClientsPanel initialClients={clients || []} />
      </div>
   )
}
