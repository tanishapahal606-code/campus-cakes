/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState, useEffect } from 'react';
import { CakeItem, OrderItemCustomization, CartItem } from '../types';
import { X, Calendar, MessageSquare, Plus, AlertCircle, ShoppingCart, Sparkles, Image, Check } from 'lucide-react';
import { motion } from 'motion/react';

interface CustomOrderModalProps {
  cake: CakeItem;
  onClose: () => void;
  onAddToCart: (cartItem: CartItem) => void;
}

export default function CustomOrderModal({ cake, onClose, onAddToCart }: CustomOrderModalProps) {
  // Setup default state based on cake properties
  const [selectedFlavor, setSelectedFlavor] = useState(cake.flavors[0]);
  const [selectedWeight, setSelectedWeight] = useState(cake.weights[0]);
  const [message, setMessage] = useState('');
  const [photoUrl, setPhotoUrl] = useState('');
  const [isUploadingPhoto, setIsUploadingPhoto] = useState(false);
  const [addCandles, setAddCandles] = useState(false);
  const [addKnife, setAddKnife] = useState(false);
  
  // Date time configuration. Default is tomorrow (24h later)
  const [deliveryDate, setDeliveryDate] = useState(() => {
    const tomorrow = new Date();
    tomorrow.setDate(tomorrow.getDate() + 1);
    return tomorrow.toISOString().split('T')[0];
  });
  const [deliveryTime, setDeliveryTime] = useState('17:00');
  const [specialInstructions, setSpecialInstructions] = useState('');
  
  // Validation feedback
  const [timeWarning, setTimeWarning] = useState<string | null>(null);
  const [calculatedPrice, setCalculatedPrice] = useState(cake.price);

  // Recalculate price when weight scales
  useEffect(() => {
    if (cake.weightPrices && cake.weightPrices[selectedWeight] !== undefined) {
      setCalculatedPrice(cake.weightPrices[selectedWeight]);
      return;
    }

    // Fallback standard weight factor: 0.5kg is baseline. 1.0kg is 1.8x baseline. 1.5kg is 2.5x baseline, etc.
    let factor = 1.0;
    if (selectedWeight === 1.0) factor = 1.8;
    else if (selectedWeight === 1.5) factor = 2.5;
    else if (selectedWeight === 2.0) factor = 3.2;
    else if (selectedWeight === 3.0) factor = 4.5;
    else if (selectedWeight === 0.3) factor = 0.85; // bento sizes
    
    setCalculatedPrice(cake.price * factor);
  }, [selectedWeight, cake.price, cake.weightPrices]);

  // SMART ORDER RULES CHECKER
  useEffect(() => {
    if (!deliveryDate) return;

    // Current fixed date injected: 2026-05-20T15:51:53Z
    const currentAnchor = new Date('2026-05-20T15:51:53Z');
    
    // Construct selection date/time object
    const selectedDateTimeStr = `${deliveryDate}T${deliveryTime}`;
    const selectedDateTime = new Date(selectedDateTimeStr);

    const diffMs = selectedDateTime.getTime() - currentAnchor.getTime();
    const diffHours = diffMs / (1000 * 60 * 60);

    if (diffHours < 24) {
      setTimeWarning(
        `🚨 Smart Rule Triggered: Custom orders require at least 24-hours advance prep. Please schedule after May 21st, 15:50 PM. Only instant pickup cakes are available for today.`
      );
    } else {
      setTimeWarning(null);
    }
  }, [deliveryDate, deliveryTime]);

  const handlePhotoSimulation = () => {
    setIsUploadingPhoto(true);
    setTimeout(() => {
      // Simulate successful image upload overlay
      setPhotoUrl('https://images.unsplash.com/photo-1511285560929-80b456fea0bc?w=200&auto=format&fit=crop&q=80');
      setIsUploadingPhoto(false);
    }, 1200);
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (timeWarning) {
      alert("Rule Error: Please adjust your scheduled date/time to at least 24 hours in the future, or close this and reserve from the 'Need Cake Today?' Kiosk section.");
      return;
    }

    const customization: OrderItemCustomization = {
      flavor: selectedFlavor,
      weight: selectedWeight,
      messageOnCake: message,
      photoUrl: photoUrl || undefined,
      addCandles,
      addKnife,
      pickupTime: `${deliveryDate} @ ${deliveryTime}`,
      specialInstructions,
    };

    const cartId = `${cake.id}-${selectedFlavor}-${selectedWeight}-${message.replace(/\s+/g, '')}`;

    const cartItem: CartItem = {
      id: cartId,
      cakeId: cake.id,
      name: cake.name,
      basePrice: cake.price,
      price: calculatedPrice,
      image: cake.image,
      quantity: 1,
      customization,
      isInstantKiosk: false,
    };

    onAddToCart(cartItem);
    onClose();
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
      {/* Black backdrop layer */}
      <div className="fixed inset-0 bg-gray-950/70 backdrop-blur-md" onClick={onClose}></div>

      {/* Main interactive panel */}
      <motion.div
        initial={{ opacity: 0, scale: 0.95, y: 20 }}
        animate={{ opacity: 1, scale: 1, y: 0 }}
        exit={{ opacity: 0, scale: 0.95, y: 20 }}
        className="relative bg-white dark:bg-[#120709] w-full max-w-lg md:max-w-2xl rounded-3xl overflow-hidden shadow-2xl border border-gray-100 dark:border-[#291316] max-h-[92vh] flex flex-col z-50"
      >
        {/* Header visual banner */}
        <div className="bg-pink-600 text-white p-5 flex justify-between items-center relative flex-shrink-0">
          <div className="flex items-center gap-2">
            <span className="p-2 bg-pink-500 rounded-xl">
              <Sparkles className="w-5 h-5 text-yellow-300 animate-spin" style={{ animationDuration: '6s' }} />
            </span>
            <div>
              <p className="text-[10px] bg-pink-500 inline-block px-2.5 py-0.5 rounded-full uppercase font-black tracking-wider text-pink-100">
                Artisan Customizer
              </p>
              <h2 className="text-base md:text-lg font-black tracking-tight">{cake.name}</h2>
            </div>
          </div>
          <button 
            onClick={onClose}
            className="p-1.5 bg-pink-700/50 hover:bg-black/20 rounded-full text-white transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Scrollable customizing forms */}
        <form onSubmit={handleSubmit} className="flex-1 overflow-y-auto p-5 md:p-6 space-y-6">
          
          {/* Sizing/Weight options section */}
          <div>
            <label className="block text-xs font-black text-gray-800 dark:text-[#fafafa] uppercase tracking-widest mb-2.5">
              1. Customize Cake Weight (Kg)
            </label>
            <div className="grid grid-cols-4 gap-2">
              {cake.weights.map((w) => {
                const active = selectedWeight === w;
                return (
                  <button
                    key={w}
                    type="button"
                    onClick={() => setSelectedWeight(w)}
                    className={`p-2 rounded-2xl font-bold text-xs border text-center transition-all flex flex-col items-center justify-center gap-0.5 ${
                      active
                        ? 'bg-pink-600 border-pink-600 text-white'
                        : 'bg-gray-50 dark:bg-[#1a0d0f]/80 border-gray-100 dark:border-[#291316] text-gray-700 dark:text-[#e4e4e7] hover:bg-gray-50 hover:dark:bg-[#1a0d0f]/80'
                    }`}
                  >
                    <span>{w} kg</span>
                    <span className={`text-[9px] font-medium ${active ? 'text-pink-100' : 'text-gray-500 dark:text-[#a1a1aa]'}`}>
                      ₹{cake.weightPrices && cake.weightPrices[w] !== undefined ? cake.weightPrices[w] : Math.round(cake.price * (w === 1.0 ? 1.8 : w === 1.5 ? 2.5 : w === 2.0 ? 3.2 : w === 3.0 ? 4.5 : w === 0.3 ? 0.85 : 1.0))}
                    </span>
                  </button>
                );
              })}
            </div>
          </div>

          {/* Frosting text with live UI indicator preview */}
          <div>
            <div className="flex justify-between items-center mb-1.5">
              <label className="block text-xs font-black text-gray-800 dark:text-[#fafafa] uppercase tracking-widest">
                2. Custom Text On Buttercream (Max 24 letters)
              </label>
              <span className={`text-[10px] font-bold ${message.length > 20 ? 'text-red-600 animate-pulse' : 'text-gray-400'}`}>
                {message.length}/24 chars
              </span>
            </div>
            <div className="relative">
              <span className="absolute left-3.5 top-3.5 text-gray-400">
                <MessageSquare className="w-4 h-4" />
              </span>
              <input
                type="text"
                maxLength={24}
                value={message}
                onChange={(e) => setMessage(e.target.value)}
                placeholder="e.g. Happy Birthday Kriti! 🎓"
                className="w-full pl-10 pr-4 py-3 bg-gray-50 dark:bg-[#1a0d0f]/80 border border-gray-200 dark:border-[#3c1a1e] rounded-2xl text-xs font-medium focus:outline-none focus:ring-2 focus:ring-pink-500/20 focus:border-pink-500"
              />
            </div>
          </div>

          {/* Photo upload toggle if Category is Photo cakes */}
          {cake.category === 'Photo Cakes' && (
            <div className="p-4 bg-gray-50 dark:bg-[#1a0d0f]/80 rounded-3xl border border-gray-200 dark:border-[#3c1a1e]/50">
              <div className="flex justify-between items-start mb-2">
                <div>
                  <label className="block text-xs font-black text-gray-800 dark:text-[#fafafa] uppercase tracking-widest">
                    📸 Edible Photo Grid Upload
                  </label>
                  <p className="text-[10px] text-gray-500 dark:text-[#a1a1aa]">Add an Instax snapshot memory directly printed on sugar shell.</p>
                </div>
                {photoUrl && (
                  <span className="text-[9px] font-bold text-green-600 bg-green-100 px-2 py-0.5 rounded-full flex items-center gap-0.5">
                    <Check className="w-3.5 h-3.5" /> Uploaded
                  </span>
                )}
              </div>

              <div className="flex items-center gap-4 mt-1">
                {photoUrl ? (
                  <div className="relative w-14 h-14 rounded-lg overflow-hidden border">
                    <img src={photoUrl} className="w-full h-full object-cover" referrerPolicy="no-referrer" />
                    <button 
                      type="button" 
                      onClick={() => setPhotoUrl('')}
                      className="absolute top-0 right-0 bg-red-600 text-white p-0.5 rounded-bl"
                    >
                      <X className="w-2.5 h-2.5" />
                    </button>
                  </div>
                ) : (
                  <button
                    type="button"
                    onClick={handlePhotoSimulation}
                    disabled={isUploadingPhoto}
                    className="flex-shrink-0 w-14 h-14 rounded-xl border-2 border-dashed dark:border-[#3c1a1e] border-pink-300 hover:border-pink-500 bg-pink-50 dark:bg-pink-500/10/30 flex flex-col items-center justify-center p-1 text-pink-600 dark:text-pink-400 hover:bg-pink-50 hover:dark:bg-pink-500/10 transition-colors"
                  >
                    <Image className="w-5 h-5 text-pink-500" />
                    <span className="text-[8px] font-extrabold mt-0.5">Choose</span>
                  </button>
                )}
                
                <div className="flex-1">
                  <input
                    type="text"
                    value={photoUrl}
                    onChange={(e) => setPhotoUrl(e.target.value)}
                    placeholder="Or paste external selfie image URL..."
                    className="w-full px-3 py-2 bg-white dark:bg-[#120709] border border-gray-200 dark:border-[#3c1a1e] rounded-xl text-[11px] focus:outline-none focus:ring-1 focus:ring-pink-500"
                  />
                  <p className="text-[9px] text-gray-400 mt-1">Accepts standard PNG, JPG templates. Max 4MB size.</p>
                </div>
              </div>
            </div>
          )}

          {/* Addons section */}
          <div>
            <label className="block text-xs font-black text-gray-800 dark:text-[#fafafa] uppercase tracking-widest mb-2">
              3. Event Conveniences (Free Add-ons!)
            </label>
            <div className="grid grid-cols-2 gap-3">
              <button
                type="button"
                onClick={() => setAddCandles(!addCandles)}
                className={`p-3 rounded-2xl border flex items-center gap-3 transition-all ${
                  addCandles
                    ? 'bg-pink-50 dark:bg-pink-500/10/60 border-pink-400 text-pink-800'
                    : 'bg-gray-50 dark:bg-[#1a0d0f]/80 border-gray-100 dark:border-[#291316] text-gray-700 dark:text-[#e4e4e7] hover:bg-gray-50 hover:dark:bg-[#1a0d0f]/80'
                }`}
              >
                <div className={`w-4 h-4 rounded-md border flex items-center justify-center ${addCandles ? 'bg-pink-600 border-pink-600 text-white' : 'bg-white dark:bg-[#120709] border-gray-300 dark:border-slate-600'}`}>
                  {addCandles && <Check className="w-3 h-3 stroke-[3]" />}
                </div>
                <div className="text-left">
                  <p className="font-bold text-xs">Aromatherapy Candles</p>
                  <p className="text-[9px] text-pink-600 dark:text-pink-400">Free set of 5</p>
                </div>
              </button>

              <button
                type="button"
                onClick={() => setAddKnife(!addKnife)}
                className={`p-3 rounded-2xl border flex items-center gap-3 transition-all ${
                  addKnife
                    ? 'bg-pink-50 dark:bg-pink-500/10/60 border-pink-400 text-pink-800'
                    : 'bg-gray-50 dark:bg-[#1a0d0f]/80 border-gray-100 dark:border-[#291316] text-gray-700 dark:text-[#e4e4e7] hover:bg-gray-50 hover:dark:bg-[#1a0d0f]/80'
                }`}
              >
                <div className={`w-4 h-4 rounded-md border flex items-center justify-center ${addKnife ? 'bg-pink-600 border-pink-600 text-white' : 'bg-white dark:bg-[#120709] border-gray-300 dark:border-slate-600'}`}>
                  {addKnife && <Check className="w-3 h-3 stroke-[3]" />}
                </div>
                <div className="text-left">
                  <p className="font-bold text-xs">Recyclable Cake Knife</p>
                  <p className="text-[9px] text-pink-600 dark:text-pink-400">Free wooden knife</p>
                </div>
              </button>
            </div>
          </div>

          {/* Schedulers & SMART ORDER RULES BANNER */}
          <div className="border-t border-dashed dark:border-[#3c1a1e] border-gray-200 dark:border-[#3c1a1e] pt-5 space-y-4">
            <div className="flex justify-between items-center">
              <label className="block text-xs font-black text-gray-800 dark:text-[#fafafa] uppercase tracking-widest flex items-center gap-1">
                <Calendar className="w-3.5 h-3.5 text-pink-600 dark:text-pink-400" /> 4. Select Campus Delivery Slot
              </label>
              <span className="text-[10px] font-bold text-pink-600 dark:text-pink-400 uppercase">24h rule active</span>
            </div>

            <div className="grid grid-cols-2 gap-3">
              <div className="space-y-1">
                <span className="text-[10px] font-bold text-gray-400 uppercase">Date</span>
                <input
                  type="date"
                  value={deliveryDate}
                  onChange={(e) => setDeliveryDate(e.target.value)}
                  className="w-full px-3 py-2.5 bg-gray-50 dark:bg-[#1a0d0f]/80 border border-gray-200 dark:border-[#3c1a1e] rounded-xl text-xs font-bold focus:outline-none focus:ring-1 focus:ring-pink-500"
                />
              </div>
              <div className="space-y-1">
                <span className="text-[10px] font-bold text-gray-400 uppercase">Aprox. Hour</span>
                <select
                  value={deliveryTime}
                  onChange={(e) => setDeliveryTime(e.target.value)}
                  className="w-full px-3 py-2.5 bg-gray-50 dark:bg-[#1a0d0f]/80 border border-gray-200 dark:border-[#3c1a1e] rounded-xl text-xs font-bold focus:outline-none focus:ring-1 focus:ring-pink-500"
                >
                  <option value="11:00">11:00 AM</option>
                  <option value="13:00">01:00 PM</option>
                  <option value="15:00">03:00 PM</option>
                  <option value="17:00">05:00 PM</option>
                  <option value="19:00">07:00 PM (Late Rush)</option>
                  <option value="21:30">09:30 PM (Pre-curfew)</option>
                </select>
              </div>
            </div>

            {/* Smart Order Rules Alert Container */}
            {timeWarning ? (
              <div className="p-4 bg-red-50 dark:bg-red-500/10 rounded-2xl border border-red-200 flex items-start gap-2.5 text-red-800">
                <AlertCircle className="w-5 h-5 text-red-600 flex-shrink-0 mt-0.5" />
                <div className="text-xs">
                  <p className="font-extrabold uppercase tracking-wide">ONLY INSTANT PICKUP CAKES AVAILABLE</p>
                  <p className="mt-1 leading-normal font-medium">{timeWarning}</p>
                  <p className="mt-2 text-[10px] font-bold text-red-600 uppercase">👉 Action: Schedulers should choose tomorrow or reserve a ready-to-go Kiosk cake instead!</p>
                </div>
              </div>
            ) : (
              <div className="p-3 bg-green-50 rounded-2xl border border-green-100 flex items-start gap-2.5 text-green-800">
                <AlertCircle className="w-4 h-4 text-green-600 flex-shrink-0 mt-0.5" />
                <div className="text-[10px] leading-relaxed">
                  <p className="font-bold">✓ Smart Order validation approved</p>
                  <p className="text-gray-500 dark:text-[#a1a1aa] font-medium">Your scheduled checkout is more than 24 hours out. Fresh, on-time baking is fully guaranteed.</p>
                </div>
              </div>
            )}
          </div>

          {/* Special instructions box */}
          <div className="space-y-1">
            <span className="text-[10px] font-bold text-gray-400 uppercase">Special culinary/hostel gate notes</span>
            <textarea
              placeholder="e.g. Please leave with hostel security guard, ring when you reach Block B entrance, etc."
              value={specialInstructions}
              onChange={(e) => setSpecialInstructions(e.target.value)}
              className="w-full px-3 py-2 bg-gray-50 dark:bg-[#1a0d0f]/80 border border-gray-200 dark:border-[#3c1a1e] rounded-xl text-xs focus:outline-none"
              rows={2}
            />
          </div>
        </form>

        {/* Footer actions panel (Sticky price) */}
        <div className="bg-gray-50 dark:bg-[#1a0d0f]/80 border-t border-gray-100 dark:border-[#291316] p-4 md:p-5 flex items-center justify-between flex-shrink-0">
          <div>
            <p className="text-[10px] font-bold text-gray-400 uppercase leading-none">Net Total Value</p>
            <p className="text-xl font-black text-gray-900 dark:text-white mt-0.5">₹{Math.round(calculatedPrice)}</p>
          </div>

          <div className="flex gap-2">
            <button
              type="button"
              onClick={onClose}
              className="px-4 py-2.5 bg-white dark:bg-[#120709] border border-gray-200 dark:border-[#3c1a1e] hover:bg-gray-50 hover:dark:bg-[#1a0d0f]/80 text-gray-700 dark:text-[#e4e4e7] font-extrabold rounded-xl text-xs transition-colors"
            >
              Cancel
            </button>
            <button
              onClick={handleSubmit}
              disabled={!!timeWarning}
              className={`px-6 py-2.5 rounded-xl font-black text-xs flex items-center gap-1.5 transition-all ${
                timeWarning
                  ? 'bg-gray-200 dark:bg-[#1a0d0f] text-gray-400 cursor-not-allowed'
                  : 'bg-pink-600 hover:bg-pink-700 text-white shadow-xl shadow-pink-600/20 hover:scale-105 active:scale-95'
              }`}
            >
              <ShoppingCart className="w-4 h-4" /> Add to Campus Cart
            </button>
          </div>
        </div>
      </motion.div>
    </div>
  );
}
