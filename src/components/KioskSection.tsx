/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState, useEffect } from 'react';
import { KioskCake, Campus } from '../types';
import { KIOSK_INVENTORY } from '../data';
import { Flame, Clock, Zap, ShoppingBag, ShieldCheck, HelpCircle } from 'lucide-react';
import { motion } from 'motion/react';

interface KioskSectionProps {
  selectedCampus: Campus;
  onReserveCake: (kioskCake: KioskCake) => void;
  inventory: KioskCake[];
}

export default function KioskSection({ selectedCampus, onReserveCake, inventory }: KioskSectionProps) {
  // We can simulate slight real-time fluctuations to give that "live kiosk blinking stock" feel
  const [liveInventory, setLiveInventory] = useState<KioskCake[]>(inventory);

  useEffect(() => {
    setLiveInventory(inventory);
  }, [inventory]);

  return (
    <div id="quick-pick-section" className="relative overflow-hidden bg-gradient-to-br from-amber-500/10 via-pink-500/5 to-transparent rounded-3xl p-6 md:p-8 border border-amber-500/15 mb-14">
      {/* Decorative badges */}
      <div className="absolute top-4 right-4 flex items-center gap-2">
        <span className="flex items-center gap-1 text-[11px] font-bold text-amber-700 bg-amber-100 px-3 py-1 rounded-full border border-amber-200 shadow-sm dark:shadow-none">
          <Zap className="w-3 h-3 text-amber-600 animate-bounce" /> Hot Kiosk Live
        </span>
      </div>

      <div className="max-w-2xl mb-8">
        <div className="flex items-center gap-1.5 text-amber-600 font-bold uppercase tracking-wider text-xs mb-2">
          <Flame className="w-4 h-4 text-amber-500" /> Instant Gratification
        </div>
        <h2 className="text-2xl md:text-3xl font-black text-gray-900 dark:text-white tracking-tight">
          Need Cake Today? <span className="text-amber-500">Pick Up in 10 Mins!</span>
        </h2>
        <p className="text-gray-600 dark:text-[#d4d4d8] mt-2 text-sm md:text-base">
          Forgot an milestone or celebrating post-exam cramming? No pre-order needed. Pick one of our 
          ready-baked popular flavors in real-time at the <strong>{selectedCampus.location}</strong>. Stock updates live!
        </p>
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-5">
        {liveInventory.length === 0 ? (
          Array.from({ length: 4 }).map((_, idx) => (
            <div key={idx} className="bg-white dark:bg-[#120709] rounded-xl p-4 border border-gray-100 dark:border-[#291316] flex flex-col justify-between animate-pulse space-y-3">
              <div className="rounded-xl bg-gray-25 dark:bg-zinc-800 h-32 w-full" />
              <div className="space-y-2 pb-2">
                <div className="h-4 bg-gray-300 dark:bg-zinc-700 rounded w-2/3" />
                <div className="h-3 bg-gray-300 dark:bg-zinc-700 rounded w-1/2" />
              </div>
              <div className="h-9 bg-gray-300 dark:bg-zinc-700 rounded-xl w-full" />
            </div>
          ))
        ) : (
          liveInventory.map((item) => {
            const isOut = item.remainingStock === 0;
            const isLow = item.remainingStock > 0 && item.remainingStock <= 2;
            const percentageLeft = (item.remainingStock / item.totalStock) * 100;
  
            return (
              <motion.div
                key={item.id}
                whileHover={{ y: -6 }}
                transition={{ duration: 0.3 }}
                className={`bg-white dark:bg-[#120709] rounded-2xl p-4 border flex flex-col justify-between transition-all duration-300 relative ${
                  isOut 
                    ? 'border-gray-200 dark:border-[#3c1a1e]/60 opacity-70 filter grayscale-[40%]' 
                    : 'border-amber-100 shadow-md dark:shadow-none shadow-amber-500/5 hover:shadow-xl hover:shadow-pink-500/5'
                }`}
              >
              {/* Image and relative tags */}
              <div className="relative rounded-xl overflow-hidden h-32 mb-3 bg-gray-50 dark:bg-[#1a0d0f]/80">
                <img
                  src={item.image}
                  alt={item.name}
                  className="w-full h-full object-cover"
                  referrerPolicy="no-referrer"
                />
                
                {/* Instant Pickup tag */}
                <span className="absolute top-2 left-2 text-[9px] font-black uppercase text-white bg-black/80 px-2 py-0.5 rounded-md flex items-center gap-0.5">
                  <Clock className="w-2.5 h-2.5 text-amber-400" /> 10-MIN PICKUP
                </span>

                {isOut ? (
                  <div className="absolute inset-0 bg-black/60 flex items-center justify-center backdrop-blur-[1px]">
                    <span className="text-white font-extrabold text-xs px-3 py-1 bg-red-600 rounded-full shadow-lg flex items-center gap-0.5">
                      SOLD OUT TODAY
                    </span>
                  </div>
                ) : isLow ? (
                  <span className="absolute bottom-2 right-2 text-[9px] font-extrabold uppercase text-white bg-amber-600 px-2.5 py-0.5 rounded-full animate-pulse">
                    ONLY {item.remainingStock} LEFT!
                  </span>
                ) : null}
              </div>

              {/* Text metadata */}
              <div className="mb-3">
                <h3 className="font-bold text-gray-900 dark:text-white text-sm leading-tight truncate">
                  {item.name}
                </h3>
                <p className="text-[11px] text-gray-500 dark:text-[#a1a1aa] mt-0.5 mt-1 flex items-center gap-1">
                  <span className="w-1.5 h-1.5 rounded-full bg-pink-500"></span>
                  {item.flavor}
                </p>
                <div className="text-xs font-bold text-pink-600 dark:text-pink-400 mt-1">
                  ₹{item.price}
                </div>
              </div>

              {/* Progress bar state visualization */}
              <div className="space-y-1 mb-4">
                <div className="flex justify-between items-center text-[10px]">
                  <span className="text-gray-500 dark:text-[#a1a1aa] font-medium">Kiosk Stock Level</span>
                  <span className={`font-bold ${isOut ? 'text-red-600' : isLow ? 'text-amber-600' : 'text-green-600'}`}>
                    {item.remainingStock}/{item.totalStock} left
                  </span>
                </div>
                <div className="w-full h-1.5 bg-gray-100 dark:bg-[#1a0d0f] rounded-full overflow-hidden">
                  <div 
                    className={`h-full rounded-full transition-all duration-500 ${
                      isOut ? 'bg-gray-300' : isLow ? 'bg-amber-500' : 'bg-green-500'
                    }`} 
                    style={{ width: `${percentageLeft}%` }}
                  />
                </div>
              </div>

              {/* CTA button */}
              <button
                disabled={isOut}
                onClick={() => onReserveCake(item)}
                className={`w-full py-2.5 rounded-xl font-bold text-xs flex items-center justify-center gap-1.5 transition-all duration-300 ${
                  isOut
                    ? 'bg-gray-100 dark:bg-[#1a0d0f] text-gray-400 cursor-not-allowed'
                    : 'bg-amber-500 hover:bg-amber-600 text-white shadow-lg shadow-amber-500/20 active:scale-95'
                }`}
              >
                <ShoppingBag className="w-3.5 h-3.5" />
                {isOut ? 'Back Tomorrow' : 'Reserve to Pick Up'}
              </button>
            </motion.div>
          );
        }))}
      </div>

      {/* Trust guarantees badge footer */}
      <div className="mt-6 pt-5 border-t border-dashed dark:border-[#3c1a1e] border-gray-200 dark:border-[#3c1a1e]/80 flex flex-wrap gap-4 items-center justify-between text-xs text-gray-600 dark:text-[#d4d4d8] font-medium">
        <div className="flex items-center gap-1.5">
          <ShieldCheck className="w-4 h-4 text-green-600" />
          <span>Reserved items held for <strong>90 minutes</strong> under active deep refrigeration.</span>
        </div>
        <div className="flex items-center gap-1">
          <HelpCircle className="w-3.5 h-3.5 text-gray-400" />
          <span>Location: Look for the orange logo stall in campus canteen</span>
        </div>
      </div>
    </div>
  );
}
