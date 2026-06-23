import React, { useState, useEffect } from 'react';
import { 
  Sparkles, ChevronLeft, ChevronRight, Check, Copy, Tag, Percent
} from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';
import { Coupon, UserProfile } from '../types';
import brandLogo from '../assets/images/brand_logo_1781589358418.jpg';

interface OffersInstagramCarouselProps {
  coupons: Coupon[];
  user: UserProfile;
  onApplyCoupon: (code: string) => void;
  onShowToast: (title: string, desc: string) => void;
}

export default function OffersInstagramCarousel({ 
  coupons, 
  user,
  onApplyCoupon, 
  onShowToast 
}: OffersInstagramCarouselProps) {
  // Only show active and unexhausted coupons
  const activeCoupons = coupons.filter(c => c.isActive && c.usersUsed.length < c.usageLimit);
  const [currentIndex, setCurrentIndex] = useState(0);

  // Auto-play interval
  useEffect(() => {
    if (activeCoupons.length <= 1) return;
    const interval = setInterval(() => {
      setCurrentIndex((prev) => (prev + 1) % activeCoupons.length);
    }, 5000);
    return () => clearInterval(interval);
  }, [activeCoupons.length]);

  if (activeCoupons.length === 0) {
    return null; // Don't show anything if there are no coupons
  }

  const currentCoupon = activeCoupons[currentIndex];

  // Helper to calculate pricing showcase dynamically to mirror the screenshot layout
  const getPricingShowcase = (coupon: Coupon) => {
    const baseOriginalPrice = 1250; // standard premium celebration cake price
    let discountedPrice = baseOriginalPrice;
    
    if (coupon.discountType === 'percentage') {
      discountedPrice = Math.round(baseOriginalPrice * (1 - coupon.discountValue / 100));
    } else {
      discountedPrice = baseOriginalPrice - coupon.discountValue;
    }

    return {
      original: baseOriginalPrice,
      discounted: Math.max(0, discountedPrice)
    };
  };

  const handleApply = (code: string) => {
    onApplyCoupon(code);
  };

  const handleCopy = (code: string, e: React.MouseEvent) => {
    e.stopPropagation();
    navigator.clipboard.writeText(code);
    onShowToast('Promo Code Copied!', `"${code}" is ready. Paste at checkout for premium savings!`);
  };

  const priceDetails = getPricingShowcase(currentCoupon);

  return (
    <div className="w-full space-y-3 my-4">
      {/* Dynamic Promo Banner exactly resembling the image */}
      <div className="relative overflow-hidden w-full rounded-2xl md:rounded-3xl bg-gradient-to-r from-zinc-950 via-[#0d1527] to-[#120716] border border-gray-100/10 dark:border-rose-500/10 shadow-[0_4px_30px_rgba(0,0,0,0.4)]">
        
        {/* Absolute Background Glowing Gradients */}
        <div className="absolute inset-0 bg-[radial-gradient(circle_at_30%_30%,rgba(30,58,138,0.25),transparent_60%)] pointer-events-none" />
        <div className="absolute inset-x-0 bottom-0 h-1/2 bg-[radial-gradient(circle_at_center,rgba(225,29,72,0.1),transparent_70%)] pointer-events-none" />
        
        {/* Floating Decorative Particle Elements */}
        <div className="absolute top-2 left-1/4 w-12 h-12 bg-blue-500/10 rounded-full blur-xl animate-pulse pointer-events-none" />
        <div className="absolute bottom-2 right-1/4 w-16 h-16 bg-rose-500/10 rounded-full blur-xl animate-pulse pointer-events-none" />

        <div className="relative z-10 grid grid-cols-1 md:grid-cols-12 items-center text-white px-6 py-5 md:py-6 gap-5 md:gap-4 select-none">
          
          {/* LEFT PANEL: Logo & Slogan (Analogous to the "JEE 2027 KI RACE SHURU HO CHUKI HAI" left side) */}
          <div className="md:col-span-5 flex flex-col md:border-r md:border-white/10 pr-2 space-y-2">
            <div className="flex items-center gap-2.5">
              <motion.div 
                className="w-10 h-10 rounded-full bg-gradient-to-tr from-[#D4AF37] via-rose-500 to-[#D4AF37] p-[1.5px] shadow-[0_0_15px_rgba(212,175,55,0.4)] shrink-0 overflow-hidden"
                animate={{
                  boxShadow: [
                    "0 0 10px rgba(212,175,55,0.3)",
                    "0 0 20px rgba(212,175,55,0.7)",
                    "0 0 10px rgba(212,175,55,0.3)"
                  ],
                  scale: [1, 1.05, 1],
                  rotate: [0, 360]
                }}
                transition={{
                  boxShadow: {
                    duration: 4,
                    repeat: Infinity,
                    ease: "easeInOut"
                  },
                  scale: {
                    duration: 4,
                    repeat: Infinity,
                    ease: "easeInOut"
                  },
                  rotate: {
                    duration: 20,
                    repeat: Infinity,
                    ease: "linear"
                  }
                }}
              >
                <div className="w-full h-full rounded-full bg-black overflow-hidden flex items-center justify-center">
                  <img 
                    src={brandLogo} 
                    className="w-full h-full object-cover rounded-full" 
                    alt="Campus Cakes Logo" 
                  />
                </div>
              </motion.div>
              <span className="text-[10px] uppercase font-black tracking-[0.2em] text-[#D4AF37]">Campus Cakes Exclusive Offer</span>
            </div>
            
            <div className="space-y-1">
              <h4 className="text-lg md:text-xl font-black font-display tracking-tight leading-tight uppercase bg-clip-text text-transparent bg-gradient-to-r from-[#FEFAF6] via-[#FCECEF] to-[#ffd0d9]">
                {currentCoupon.occasion}
              </h4>
              <p className="text-[10px] md:text-[11px] font-bold text-[#D4AF37] uppercase tracking-wide">
                CELEBRATION DEALS START NOW • ENJOY EXTRA SAVINGS
              </p>
            </div>
          </div>

          {/* MIDDLE PANEL: Main Package details & pricing (Analogous to the center "Lakshya JEE 2.0" + crossed pricing) */}
          <div className="md:col-span-4 flex flex-col justify-center space-y-1.5 pl-0 md:pl-2">
            <div className="inline-flex items-center gap-1.5 bg-rose-500/15 border border-rose-500/30 text-rose-300 px-3 py-1 rounded-xl w-fit">
              <Tag className="w-3.5 h-3.5" />
              <span className="text-[11px] font-black tracking-wide uppercase">
                CODE: {currentCoupon.code}
              </span>
            </div>

            <div className="flex items-baseline gap-3">
              {/* Crossed Price */}
              <span className="text-zinc-400 line-through text-xs md:text-sm font-semibold">
                ₹{priceDetails.original}
              </span>
              
              {/* Discounted Promotional Price */}
              <span className="text-xl md:text-2xl font-black text-rose-400 font-mono tracking-tight flex items-center">
                ₹{priceDetails.discounted}/-
              </span>
              
              <span className="text-[9px] font-extrabold uppercase text-[#D4AF37]">
                ({currentCoupon.discountType === 'percentage' ? `${currentCoupon.discountValue}% Off` : `₹${currentCoupon.discountValue} Off`})
              </span>
            </div>
          </div>

          {/* RIGHT PANEL: Claim CTA & Actions (Analogous to the right side "Enroll Now" orange pill) */}
          <div className="md:col-span-3 flex flex-row md:flex-col items-center justify-between md:justify-center gap-3 w-full">
            {/* Direct copy shortcut option */}
            <button
              onClick={(e) => handleCopy(currentCoupon.code, e)}
              className="text-[10px] font-black uppercase tracking-wider text-zinc-300 hover:text-white bg-zinc-800/60 hover:bg-zinc-800 border border-zinc-700/50 px-3 py-2 rounded-xl transition-all cursor-pointer inline-flex items-center gap-1.5"
            >
              <Copy className="w-3.5 h-3.5" />
              Copy Code
            </button>

            {/* Direct primary action enrollment/claim button */}
            <button
              onClick={() => handleApply(currentCoupon.code)}
              className="px-5 py-2.5 bg-gradient-to-r from-amber-500 to-rose-600 hover:from-amber-600 hover:to-rose-700 text-white font-extrabold text-xs uppercase tracking-widest rounded-full shadow-lg shadow-rose-600/20 hover:shadow-rose-600/35 transition-all duration-300 active:scale-95 cursor-pointer flex items-center gap-1.5"
            >
              Apply Deal &gt;
            </button>
          </div>

        </div>

        {/* Carousel Side Arrows */}
        {activeCoupons.length > 1 && (
          <>
            <button 
              onClick={() => setCurrentIndex((prev) => (prev - 1 + activeCoupons.length) % activeCoupons.length)}
              className="absolute left-2 top-1/2 -translate-y-1/2 w-8 h-8 bg-black/40 hover:bg-black/60 text-white rounded-full flex items-center justify-center transition-all cursor-pointer z-20 border border-white/5"
            >
              <ChevronLeft className="w-4 h-4" />
            </button>
            <button 
              onClick={() => setCurrentIndex((prev) => (prev + 1) % activeCoupons.length)}
              className="absolute right-2 top-1/2 -translate-y-1/2 w-8 h-8 bg-black/40 hover:bg-black/60 text-white rounded-full flex items-center justify-center transition-all cursor-pointer z-20 border border-white/5"
            >
              <ChevronRight className="w-4 h-4" />
            </button>
          </>
        )}
      </div>

      {/* Indicator Dots exactly mirroring the screenshot */}
      {activeCoupons.length > 1 && (
        <div className="flex items-center justify-center gap-1.5 py-1">
          {activeCoupons.map((_, idx) => (
            <button
              key={idx}
              onClick={() => setCurrentIndex(idx)}
              className={`h-2 rounded-full transition-all duration-300 ${idx === currentIndex ? 'w-4 bg-rose-500' : 'w-2 bg-gray-300 dark:bg-zinc-800'}`}
              aria-label={`Go to slide ${idx + 1}`}
            />
          ))}
        </div>
      )}
    </div>
  );
}
