/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState } from 'react';
import { CAMPUSES } from '../data';
import { Campus } from '../types';
import { MapPin, CheckCircle2, ChevronDown, GraduationCap, Sparkles } from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';

interface CampusSelectorProps {
  selectedCampus: Campus;
  onCampusChange: (campus: Campus) => void;
  campuses: Campus[];
}

export default function CampusSelector({ selectedCampus, onCampusChange, campuses }: CampusSelectorProps) {
  const [isOpen, setIsOpen] = useState(false);

  const activeCampuses = campuses.filter(c => c.active);
  const comingSoonCampuses = campuses.filter(c => !c.active);

  return (
    <div className="relative z-50">
      {/* Selector Trigger Button */}
      <button
        id="campus-selector-trigger"
        onClick={() => setIsOpen(!isOpen)}
        className="flex items-center gap-2 px-4 py-2 bg-pink-50 dark:bg-pink-500/10 hover:bg-pink-100 text-pink-700 font-semibold rounded-2xl border border-pink-100 shadow-sm dark:shadow-none transition-all duration-300 group text-sm"
      >
        <span className="p-1 bg-pink-500 rounded-lg text-white group-hover:scale-110 transition-transform duration-300">
          <GraduationCap className="w-3.5 h-3.5" />
        </span>
        <div className="text-left hidden sm:block">
          <p className="text-[10px] uppercase tracking-wider text-pink-400 font-bold leading-none">Your Campus</p>
          <span className="font-bold flex items-center gap-1 text-gray-800 dark:text-[#fafafa]">
            {selectedCampus.name}
          </span>
        </div>
        <span className="sm:hidden font-bold text-gray-800 dark:text-[#fafafa] text-xs truncate max-w-[120px]">
          {selectedCampus.name.split(' ')[0]}
        </span>
        <ChevronDown className={`w-4 h-4 text-pink-600 dark:text-pink-400 transition-transform duration-300 ${isOpen ? 'rotate-180' : ''}`} />
      </button>

      {/* Dropdown menu */}
      <AnimatePresence>
        {isOpen && (
          <>
            {/* Backdrop cover for closing */}
            <div 
              className="fixed inset-0 z-40" 
              onClick={() => setIsOpen(false)}
            />
            
            <motion.div
              id="campus-selector-dropdown"
              initial={{ opacity: 0, y: 15, scale: 0.95 }}
              animate={{ opacity: 1, y: 0, scale: 1 }}
              exit={{ opacity: 0, y: 15, scale: 0.95 }}
              transition={{ duration: 0.2 }}
              className="absolute right-0 mt-3 w-80 bg-white dark:bg-[#120709] rounded-3xl shadow-2xl border border-pink-50/80 p-5 z-50 focus:outline-none"
            >
              <div className="flex items-center justify-between mb-4 pb-2 border-b border-gray-100 dark:border-[#291316]">
                <h3 className="font-bold text-gray-800 dark:text-[#fafafa] flex items-center gap-1.5 text-sm">
                  <MapPin className="w-4 h-4 text-pink-600 dark:text-pink-400" /> Choose University
                </h3>
                <span className="text-[11px] font-bold text-pink-600 dark:text-pink-400 bg-pink-100 px-2 py-0.5 rounded-full flex items-center gap-0.5 animate-pulse">
                  <Sparkles className="w-2.5 h-2.5" /> Live Delivery
                </span>
              </div>

              {/* Active Campus Options */}
              <div className="space-y-2 mb-4">
                <p className="text-[10px] font-black text-gray-400 uppercase tracking-widest pl-1">Active Hubs</p>
                {activeCampuses.map((campus) => {
                  const isSelected = campus.id === selectedCampus.id;
                  return (
                    <button
                      key={campus.id}
                      onClick={() => {
                        onCampusChange(campus);
                        setIsOpen(false);
                      }}
                      className={`w-full flex items-start gap-3 p-3 rounded-2xl text-left transition-all duration-300 relative overflow-hidden group ${
                        isSelected 
                          ? 'bg-pink-50 dark:bg-pink-500/10 border border-pink-200' 
                          : 'bg-gray-50 dark:bg-[#1a0d0f]/80 hover:bg-gray-50 hover:dark:bg-[#1a0d0f]/80 border border-transparent'
                      }`}
                    >
                      <div className={`p-2 rounded-xl transition-all ${
                        isSelected ? 'bg-pink-600 text-white' : 'bg-white dark:bg-[#120709] text-gray-400 border border-gray-200 dark:border-[#3c1a1e] group-hover:scale-105'
                      }`}>
                        <GraduationCap className="w-4 h-4" />
                      </div>
                      
                      <div className="flex-1 min-w-0">
                        <p className={`font-bold text-xs truncate ${isSelected ? 'text-pink-900' : 'text-gray-700 dark:text-[#e4e4e7]'}`}>
                          {campus.name}
                        </p>
                        <p className="text-[10px] text-gray-500 dark:text-[#a1a1aa] flex items-center gap-0.5 mt-0.5">
                          <MapPin className="w-3 h-3 text-pink-400 flex-shrink-0" /> {campus.location}
                        </p>
                      </div>

                      {isSelected && (
                        <CheckCircle2 className="w-4 h-4 text-pink-600 dark:text-pink-400 self-center" />
                      )}
                    </button>
                  );
                })}
              </div>

              {/* Upcoming expansion network */}
              <div className="space-y-2">
                <div className="flex items-center justify-between pl-1">
                  <p className="text-[10px] font-black text-gray-400 uppercase tracking-widest">Expansion Voting</p>
                  <span className="text-[9px] font-bold text-purple-600 bg-purple-50 dark:bg-purple-500/10 px-1.5 py-0.5 rounded-md">Coming Soon</span>
                </div>
                
                {comingSoonCampuses.map((campus) => (
                  <div
                    key={campus.id}
                    className="w-full flex items-center justify-between p-2.5 rounded-xl bg-purple-50 dark:bg-purple-500/10/30 border border-purple-100/50 text-left cursor-not-allowed opacity-80"
                  >
                    <div className="flex items-center gap-2">
                      <div className="p-1.5 bg-white dark:bg-[#120709] rounded-lg text-purple-400 border border-purple-100">
                        <GraduationCap className="w-3.5 h-3.5" />
                      </div>
                      <div>
                        <p className="font-bold text-[11px] text-purple-900">
                          {campus.name}
                        </p>
                        <p className="text-[9px] text-purple-500">
                          {campus.location}
                        </p>
                      </div>
                    </div>
                    <button 
                      onClick={(e) => {
                        e.stopPropagation();
                        alert(`Thanks for voting for ${campus.name}! We will expand here very soon once 100+ students sign up.`);
                      }}
                      className="px-2 py-1 bg-white dark:bg-[#120709] hover:bg-purple-600 hover:text-white border border-purple-200 text-purple-600 font-extrabold text-[9px] rounded-lg transition-all"
                    >
                      Vote
                    </button>
                  </div>
                ))}
              </div>
            </motion.div>
          </>
        )}
      </AnimatePresence>
    </div>
  );
}
