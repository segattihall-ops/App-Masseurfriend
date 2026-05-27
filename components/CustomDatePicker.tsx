  import React, { useState, useRef, useEffect, useLayoutEffect } from 'react';
  import { createPortal } from 'react-dom';
  import { Calendar as CalendarIcon, ChevronLeft, ChevronRight, X } from 'lucide-react';

interface CustomDatePickerProps {
  value: string;
  onChange: (value: string) => void;
  label?: string;
  placeholder?: string;
  className?: string;
  icon?: React.ReactNode;
  inputClassName?: string;
  align?: 'left' | 'right';
  hasError?: boolean;
}

// Helper to parse YYYY-MM-DD as a local date
const parseLocalDate = (dateStr: string) => {
  if (!dateStr) return null;
  const [year, month, day] = dateStr.split('-').map(Number);
  if (isNaN(year) || isNaN(month) || isNaN(day)) return null;
  return new Date(year, month - 1, day);
};

// Helper to format Date as YYYY-MM-DD
const formatLocalDate = (date: Date) => {
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, '0');
  const day = String(date.getDate()).padStart(2, '0');
  return `${year}-${month}-${day}`;
};

export const CustomDatePicker: React.FC<CustomDatePickerProps> = ({
  value,
  onChange,
  label,
  placeholder = 'Select date',
  className = '',
  icon,
  inputClassName = '',
  align = 'left',
  hasError = false,
}) => {
  const [isOpen, setIsOpen] = useState(false);
  const [viewDate, setViewDate] = useState(() => {
    const d = parseLocalDate(value);
    return d || new Date();
  });
  const [dropdownPos, setDropdownPos] = useState({ top: 0, left: 0, width: 0 });
  const containerRef = useRef<HTMLDivElement>(null);
  const portalRef = useRef<HTMLDivElement>(null);

  const today = new Date();
  today.setHours(0, 0, 0, 0);

  const selectedDate = parseLocalDate(value);
  if (selectedDate) {
    selectedDate.setHours(0, 0, 0, 0);
  }

  useEffect(() => {
    const d = parseLocalDate(value);
    if (d) {
      setViewDate(d);
    }
  }, [value]);

  useLayoutEffect(() => {
    const updatePosition = () => {
      if (containerRef.current && isOpen) {
        const rect = containerRef.current.getBoundingClientRect();
        setDropdownPos({
          top: rect.bottom + window.scrollY,
          left: rect.left + window.scrollX,
          width: rect.width
        });
      }
    };

    const handleClickOutside = (event: MouseEvent) => {
      if (containerRef.current && !containerRef.current.contains(event.target as Node)) {
        // Check if click was inside the portal
        if (portalRef.current && portalRef.current.contains(event.target as Node)) return;
        setIsOpen(false);
      }
    };

    if (isOpen) {
      updatePosition();
      window.addEventListener('scroll', updatePosition, true);
      window.addEventListener('resize', updatePosition);
      document.addEventListener('mousedown', handleClickOutside);
      
      if (window.innerWidth < 768) {
        document.body.style.overflow = 'hidden';
      }
    }

    return () => {
      window.removeEventListener('scroll', updatePosition, true);
      window.removeEventListener('resize', updatePosition);
      document.removeEventListener('mousedown', handleClickOutside);
      document.body.style.overflow = '';
    };
  }, [isOpen]);

  const daysInMonth = (year: number, month: number) => new Date(year, month + 1, 0).getDate();

  const handlePrevMonth = (e: React.MouseEvent) => {
    e.stopPropagation();
    setViewDate(new Date(viewDate.getFullYear(), viewDate.getMonth() - 1, 1));
  };

  const handleNextMonth = (e: React.MouseEvent) => {
    e.stopPropagation();
    setViewDate(new Date(viewDate.getFullYear(), viewDate.getMonth() + 1, 1));
  };

  const handleDateSelect = (day: number) => {
    const newDate = new Date(viewDate.getFullYear(), viewDate.getMonth(), day);
    onChange(formatLocalDate(newDate));
    setIsOpen(false);
  };

  const renderCalendar = () => {
    const year = viewDate.getFullYear();
    const month = viewDate.getMonth();
    const totalDays = daysInMonth(year, month);
    const firstDay = new Date(year, month, 1).getDay();
    const monthName = viewDate.toLocaleString('default', { month: 'long' });

    const days = [];
    for (let i = 0; i < firstDay; i++) {
      days.push(<div key={`empty-${i}`} className="h-10 w-10 md:h-8 md:w-8" />);
    }

    for (let day = 1; day <= totalDays; day++) {
      const date = new Date(year, month, day);
      date.setHours(0, 0, 0, 0);
      
      const isToday = date.getTime() === today.getTime();
      const isSelected = selectedDate && date.getTime() === selectedDate.getTime();

      days.push(
        <button
          key={day}
          type="button"
          onClick={(e) => { e.stopPropagation(); handleDateSelect(day); }}
          className={`h-10 w-10 md:h-8 md:w-8 rounded-full flex items-center justify-center text-sm md:text-xs font-bold transition-all
            ${isSelected 
              ? 'bg-[#FF385C] text-white shadow-md scale-110' 
              : isToday 
                ? 'bg-gray-100 text-[#FF385C] border border-[#FF385C]/30' 
                : 'hover:bg-gray-100 text-gray-700'
            }`}
        >
          {day}
        </button>
      );
    }

    return (
      <div 
        ref={portalRef}
        className={`p-4 w-full md:w-64 bg-white rounded-t-3xl md:rounded-2xl shadow-2xl border border-gray-100 animate-in slide-in-from-bottom md:slide-in-from-top-2 fade-in zoom-in-95 duration-200`}
        style={window.innerWidth >= 768 ? {
          position: 'absolute',
          top: dropdownPos.top,
          left: align === 'right' ? dropdownPos.left + dropdownPos.width - 256 : dropdownPos.left,
          zIndex: 9999
        } : {}}
      >
        <div className="flex items-center justify-between mb-4">
          <button type="button" onClick={handlePrevMonth} className="p-2 md:p-1 hover:bg-gray-100 rounded-full transition-colors">
            <ChevronLeft className="w-5 h-5 md:w-4 md:h-4 text-gray-500" />
          </button>
          <span className="text-base md:text-sm font-bold text-gray-800">
            {monthName} {year}
          </span>
          <button type="button" onClick={handleNextMonth} className="p-2 md:p-1 hover:bg-gray-100 rounded-full transition-colors">
            <ChevronRight className="w-5 h-5 md:w-4 md:h-4 text-gray-500" />
          </button>
        </div>
        <div className="grid grid-cols-7 gap-1 mb-2">
          {['Su', 'Mo', 'Tu', 'We', 'Th', 'Fr', 'Sa'].map(d => (
            <div key={d} className="h-10 w-10 md:h-8 md:w-8 flex items-center justify-center text-[10px] font-bold text-gray-400 uppercase">
              {d}
            </div>
          ))}
          {days}
        </div>
        <div className="flex gap-2 mt-4">
          {value && (
            <button 
              type="button"
              onClick={(e) => { e.stopPropagation(); onChange(''); setIsOpen(false); }}
              className="flex-1 py-3 md:py-1.5 text-[10px] font-bold text-gray-400 hover:text-gray-600 transition-colors uppercase tracking-wider border border-gray-100 rounded-lg"
            >
              Clear
            </button>
          )}
          <button 
            type="button"
            onClick={(e) => { e.stopPropagation(); setIsOpen(false); }}
            className="md:hidden flex-1 py-3 bg-gray-900 text-white rounded-lg text-xs font-bold uppercase tracking-wider"
          >
            Close
          </button>
        </div>
      </div>
    );
  };

  const displayDate = parseLocalDate(value);
  const formattedDisplayDate = displayDate ? displayDate.toLocaleDateString('en-US', { 
    month: 'short', 
    day: 'numeric', 
    year: 'numeric' 
  }) : '';

  return (
    <div className={`relative ${className}`} ref={containerRef}>
      {label && <label className="text-[10px] font-bold uppercase tracking-wider text-gray-500 block mb-1">{label}</label>}
      <div 
        onClick={() => setIsOpen(!isOpen)}
        className={`flex items-center gap-2 cursor-pointer group min-h-[44px] ${inputClassName}`}
      >
        {icon || <CalendarIcon className={`w-4 h-4 transition-colors ${hasError ? 'text-red-400' : value ? 'text-[#FF385C]' : 'text-gray-400 group-hover:text-gray-600'}`} />}
        <span className={`transition-colors ${hasError ? 'text-red-900 placeholder-red-300' : value ? 'text-gray-900' : 'text-gray-400 group-hover:text-gray-500'}`}>
          {formattedDisplayDate || placeholder}
        </span>
      </div>

      {isOpen && createPortal(
        <>
          {/* Mobile Backdrop */}
          <div className="fixed inset-0 bg-black/40 z-[90] md:hidden animate-in fade-in duration-200" onClick={() => setIsOpen(false)} />
          
          {/* Calendar Container */}
          <div className={window.innerWidth >= 768 ? "" : "fixed bottom-0 left-0 right-0 z-[100]"}>
            {renderCalendar()}
          </div>
        </>,
        document.body
      )}
    </div>
  );
};
