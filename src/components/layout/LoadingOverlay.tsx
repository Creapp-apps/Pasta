'use client'

import { useEffect, useState } from 'react'

export default function LoadingOverlay({ message = 'Cocinando...' }: { message?: string }) {
   const [show, setShow] = useState(false)

   useEffect(() => {
      // Avoid flash of loading state for extremely quick actions
      const timer = setTimeout(() => setShow(true), 150)
      return () => clearTimeout(timer)
   }, [])

   if (!show) return null

   return (
      <div className="fixed inset-0 z-[150] flex flex-col items-center justify-center bg-slate-950/70 backdrop-blur-md text-white animate-in fade-in duration-300">
         <style>{`
            @keyframes steam {
               0% { transform: translateY(5px); opacity: 0; }
               30% { opacity: 0.7; }
               100% { transform: translateY(-18px); opacity: 0; }
            }
            @keyframes bounce-slow {
               0%, 100% { transform: translateY(0); }
               50% { transform: translateY(-6px); }
            }
            .steam-line {
               animation: steam 2s infinite ease-in-out;
            }
            .steam-line-1 { animation-delay: 0s; }
            .steam-line-2 { animation-delay: 0.6s; }
            .steam-line-3 { animation-delay: 1.2s; }
         `}</style>
         
         <div className="relative flex flex-col items-center">
            {/* Steaming Pasta Bowl SVG */}
            <svg 
               width="140" 
               height="140" 
               viewBox="0 0 100 100" 
               className="animate-[bounce-slow_3s_infinite_ease-in-out]"
            >
               {/* Steam Lines */}
               <path d="M35,32 Q38,22 35,12" fill="none" stroke="#f97316" strokeWidth="2.5" strokeLinecap="round" className="steam-line steam-line-1" />
               <path d="M50,32 Q53,17 50,10" fill="none" stroke="#ea580c" strokeWidth="2.5" strokeLinecap="round" className="steam-line steam-line-2" />
               <path d="M65,32 Q68,22 65,12" fill="none" stroke="#f97316" strokeWidth="2.5" strokeLinecap="round" className="steam-line steam-line-3" />
               
               {/* Noodles/Pasta in Bowl */}
               <path d="M30,44 C30,32 45,37 45,44 C45,32 60,37 60,44 C60,32 70,37 70,44" fill="none" stroke="#f59e0b" strokeWidth="3.5" strokeLinecap="round" />
               <path d="M35,48 C35,40 48,41 48,48 C48,40 58,41 58,48 C58,40 65,41 65,48" fill="none" stroke="#d97706" strokeWidth="3.5" strokeLinecap="round" />
               
               {/* Fork lifting noodles */}
               <g transform="translate(42, 10)">
                  <path d="M5,0 L5,25" fill="none" stroke="#94a3b8" strokeWidth="2.5" strokeLinecap="round" />
                  <path d="M2,20 L8,20" fill="none" stroke="#94a3b8" strokeWidth="2" strokeLinecap="round" />
                  <path d="M2,20 L2,27 C2,29 8,29 8,27 L8,20" fill="none" stroke="#94a3b8" strokeWidth="2" />
                  <path d="M5,20 L5,27" fill="none" stroke="#94a3b8" strokeWidth="2" />
                  {/* Noodles on fork */}
                  <path d="M-2,26 Q5,23 12,26 Q5,29 -2,26" fill="none" stroke="#fbbf24" strokeWidth="3" strokeLinecap="round" />
               </g>
               
               {/* Bowl */}
               <path d="M20,47 L80,47 C80,47 80,77 50,77 C20,77 20,47 20,47 Z" fill="#1e293b" />
               <path d="M25,47 L75,47" fill="none" stroke="#f97316" strokeWidth="3" strokeLinecap="round" />
               <path d="M32,77 L68,77 C68,77 64,82 50,82 C36,82 32,77 32,77 Z" fill="#475569" />
            </svg>
         </div>
         
         <div className="text-center mt-5 px-6 max-w-sm">
            <h4 className="font-extrabold text-white text-lg tracking-widest uppercase">{message}</h4>
            <p className="text-sm text-orange-400 font-bold mt-1">Preparando pastas frescas e inventario</p>
         </div>
      </div>
   )
}
