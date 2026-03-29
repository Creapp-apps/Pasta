'use server'

import { createClient } from '@/utils/supabase/server'
import { revalidatePath } from 'next/cache'

export async function addInsumo(formData: FormData) {
   try {
      const supabase = await createClient()
      const { data: { user } } = await supabase.auth.getUser()
      if (!user) throw new Error("No autenticado")

      const { data: userData } = await supabase.from('users').select('tenant_id').eq('id', user.id).single()
      if (!userData?.tenant_id) throw new Error("Sin fábrica asignada")

      const name = formData.get('name') as string
      const unit = formData.get('unit') as string
      const stock = parseFloat(formData.get('stock') as string) || 0
      const minStock = parseFloat(formData.get('minStock') as string) || 0

      if (!name || !unit) throw new Error("Nombre y unidad son obligatorios")

      const { error } = await supabase.from('products').insert({
         tenant_id: userData.tenant_id,
         type: 'raw_material',
         name,
         unit_of_measure: unit,
         current_stock: stock,
         min_stock_alert: minStock,
         price: 0
      })

      if (error) throw new Error(error.message)

      revalidatePath('/dashboard/insumos')
      return { success: true }
   } catch (err: any) {
      return { error: err.message }
   }
}

export async function updateInsumoStock(productId: string, newStock: number) {
   try {
      const supabase = await createClient()
      const { data: { user } } = await supabase.auth.getUser()
      if (!user) throw new Error("No autenticado")

      const { data: userData } = await supabase.from('users').select('tenant_id').eq('id', user.id).single()

      // Registrar el movimiento de stock
      const { data: currentProduct } = await supabase.from('products').select('current_stock').eq('id', productId).single()
      const diff = newStock - Number(currentProduct?.current_stock || 0)
      
      await supabase.from('stock_movements').insert({
         tenant_id: userData?.tenant_id,
         product_id: productId,
         movement_type: 'adjustment',
         quantity: diff,
         operator_id: user.id
      })

      await supabase.from('products').update({ current_stock: newStock }).eq('id', productId)

      revalidatePath('/dashboard/insumos')
      return { success: true }
   } catch (err: any) {
      return { error: err.message }
   }
}

export async function deleteInsumo(productId: string) {
   try {
      const supabase = await createClient()
      await supabase.from('products').delete().eq('id', productId)
      revalidatePath('/dashboard/insumos')
      return { success: true }
   } catch (err: any) {
      return { error: err.message }
   }
}
