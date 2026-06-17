'use client'

import { useEffect, useState, useTransition } from 'react'
import { usePathname, useRouter } from 'next/navigation'
import LoadingOverlay from '@/components/layout/LoadingOverlay'

export default function NavigationLoader() {
   const pathname = usePathname()
   const router = useRouter()
   const [isPending, startTransition] = useTransition()
   const [, setActivePath] = useState(pathname)

   useEffect(() => {
      // Clear loading state when route finishes changing
      setActivePath(pathname)
   }, [pathname])

   useEffect(() => {
      const handleAnchorClick = (e: MouseEvent) => {
         const target = e.target as HTMLElement
         // Find nearest parent anchor tag
         const anchor = target.closest('a')
         
         if (anchor) {
            const href = anchor.getAttribute('href')
            const targetAttr = anchor.getAttribute('target')
            
            // If it's a local path link (e.g. starts with '/'), isn't a hash/scroll link,
            // and opens in the same tab/window.
            if (
               href &&
               href.startsWith('/') &&
               !href.startsWith('/#') &&
               !href.includes('#') &&
               (!targetAttr || targetAttr === '_self') &&
               e.button === 0 && // Left-click only
               !e.metaKey && // Not Cmd/Ctrl+Click
               !e.ctrlKey &&
               !e.shiftKey &&
               !e.altKey
            ) {
               // Ignore if navigating to the current path
               if (href === pathname) return

               e.preventDefault()
               startTransition(() => {
                  router.push(href)
               })
            }
         }
      }

      document.addEventListener('click', handleAnchorClick)
      return () => {
         document.removeEventListener('click', handleAnchorClick)
      }
   }, [pathname, router])

   return isPending ? <LoadingOverlay message="Preparando sección..." /> : null
}
