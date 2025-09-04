"use client";

import React, { useState, useEffect, useRef, useCallback } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { X, PlusCircle } from 'lucide-react';
import { useDebounce } from '@/hooks/useDebounce';

interface SmartSelectInputProps {
  name: string;
  label: string;
  icon?: React.ElementType;
  multiple?: boolean;
  value: string[];
  onChange: (newItems: string[]) => void;
  fetchSuggestions: (query: string) => Promise<string[]>;
  onCreateNew?: (value: string) => Promise<void>;
  formatNewItem?: (value: string) => string;
  placeholder?: string;
  className?: string;
  rightText?: string;
}

export const SmartSelectInput: React.FC<SmartSelectInputProps> = ({
  name,
  label,
  icon: Icon,
  multiple = false,
  value,
  onChange,
  fetchSuggestions,
  onCreateNew,
  formatNewItem,
  placeholder,
  className,
  rightText,
}) => {
  const [inputValue, setInputValue] = useState('');
  const [suggestions, setSuggestions] = useState<string[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [isDropdownVisible, setDropdownVisible] = useState(false);
  const [activeIndex, setActiveIndex] = useState(-1);

  const debouncedSearchTerm = useDebounce(inputValue, 300);
  const containerRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    const fetchAndSetSuggestions = async () => {
      if (!debouncedSearchTerm) {
        setSuggestions([]);
        return;
      }
      setIsLoading(true);
      try {
        const fetched = await fetchSuggestions(debouncedSearchTerm);
        const filtered = fetched.filter(s => !value.includes(s));
        setSuggestions(filtered);
      } catch (error) {
        console.error('Failed to fetch suggestions:', error);
        setSuggestions([]);
      } finally {
        setIsLoading(false);
      }
    };

    if (isDropdownVisible) {
      fetchAndSetSuggestions();
    }
  }, [debouncedSearchTerm, fetchSuggestions, value, isDropdownVisible]);

  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (containerRef.current && !containerRef.current.contains(event.target as Node)) {
        setDropdownVisible(false);
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  const handleSelect = useCallback((item: string) => {
    if (!item || value.includes(item)) return;

    const newValues = multiple ? [...value, item] : [item];
    onChange(newValues);
    setInputValue('');
    setSuggestions([]);
    if (!multiple) {
      setDropdownVisible(false);
    }
    inputRef.current?.focus();
  }, [multiple, value, onChange]);

  const handleCreateNew = async () => {
    if (!inputValue.trim() || !onCreateNew) return;
    const valueToCreate = formatNewItem ? formatNewItem(inputValue.trim()) : inputValue.trim();
    await onCreateNew(valueToCreate);
    handleSelect(valueToCreate);
  };

  const handleRemove = (itemToRemove: string) => {
    onChange(value.filter(item => item !== itemToRemove));
  };

  const handleKeyDown = (e: React.KeyboardEvent<HTMLInputElement>) => {
    switch (e.key) {
      case 'Backspace':
        if (!inputValue && multiple && value.length > 0) {
          handleRemove(value[value.length - 1]);
        }
        break;
      case 'ArrowDown':
        e.preventDefault();
        setDropdownVisible(true);
        setActiveIndex(prev => {
          const numItems = wouldCreateNew ? suggestions.length + 1 : suggestions.length;
          return Math.min(prev + 1, numItems - 1);
        });
        break;
      case 'ArrowUp':
        e.preventDefault();
        setDropdownVisible(true);
        setActiveIndex(prev => Math.max(prev - 1, -1));
        break;
      case 'Enter':
        e.preventDefault();
        if (activeIndex > -1) {
          if (activeIndex < suggestions.length) {
            handleSelect(suggestions[activeIndex]);
          } else if (wouldCreateNew) {
            handleCreateNew();
          }
        } else if (inputValue.trim()) {
          const exactMatch = suggestions.find(s => s.toLowerCase() === inputValue.toLowerCase());
          if (exactMatch) {
            handleSelect(exactMatch);
          } else if (wouldCreateNew) {
            handleCreateNew();
          }
        }
        setActiveIndex(-1);
        break;
      case 'Escape':
        setDropdownVisible(false);
        setActiveIndex(-1);
        break;
      default:
        setActiveIndex(-1);
        break;
    }
  };

  const wouldCreateNew = onCreateNew && inputValue && !suggestions.some(s => s.toLowerCase() === inputValue.toLowerCase());

  const renderSuggestionHighlight = (suggestion: string) => {
    const index = suggestion.toLowerCase().indexOf(inputValue.toLowerCase());
    if (index === -1) return <span>{suggestion}</span>;

    const start = suggestion.substring(0, index);
    const match = suggestion.substring(index, index + inputValue.length);
    const end = suggestion.substring(index + inputValue.length);

    return (
      <>
        {start}
        <span className="font-bold text-blue-600">{match}</span>
        {end}
      </>
    );
  };

  return (
    <div ref={containerRef} className={`relative ${className || ''}`}>
      <div
        className="flex items-center w-full rounded-[10px] transition-all duration-300 border border-[#D3D3D3] bg-[#f8f8f8] focus-within:border-black focus-within:shadow-[inset_0px_0px_0px_1px_#000]"
        onClick={() => inputRef.current?.focus()}
      >
        <div className="flex items-center w-full p-4 gap-2 flex-wrap">
          {Icon && <Icon className="size-4 mr-1 shrink-0 text-[#707070]" />}
          {value.map(item => (
            <span key={item} className="flex items-center gap-1.5 bg-[#e9e9e9] text-gray-800 text-sm font-medium px-2 py-1 rounded-md">
              {item}
              {multiple && (
                <button type="button" onClick={() => handleRemove(item)} className="text-gray-500 hover:text-gray-800">
                  <X size={14} />
                </button>
              )}
            </span>
          ))}
          <input
            ref={inputRef}
            id={name}
            type="text"
            value={inputValue}
            onChange={e => {
              setInputValue(e.target.value)
              setDropdownVisible(true)
            }}
            onFocus={() => setDropdownVisible(true)}
            onKeyDown={handleKeyDown}
            className="flex-grow bg-transparent outline-none text-black placeholder:text-gray-500 min-w-[120px]"
            placeholder={value.length === 0 ? placeholder : ''}
            autoComplete="off"
            aria-label={label}
          />
        </div>
        {rightText && (
          <div className="flex items-center pr-3">
            <span className="text-gray-400 whitespace-nowrap">{rightText}</span>
          </div>
        )}
      </div>
      <AnimatePresence>
        {isDropdownVisible && (suggestions.length > 0 || wouldCreateNew) && (
          <motion.div
            initial={{ opacity: 0, y: -10 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -10 }}
            className="absolute top-full left-0 right-0 mt-1 bg-white border border-[#D3D3D3] rounded-lg shadow-md z-20 max-h-60 overflow-y-auto"
          >
            {isLoading && <div className="px-3 py-2 text-sm text-gray-500">Loading...</div>}
            {!isLoading && suggestions.map((s, i) => (
              <button
                key={s}
                type="button"
                onClick={() => handleSelect(s)}
                className={`w-full text-left px-3 py-2 text-sm ${activeIndex === i ? 'bg-gray-100 text-gray-900' : 'text-gray-900 hover:bg-gray-50'}`}
              >
                {renderSuggestionHighlight(s)}
              </button>
            ))}
            {!isLoading && wouldCreateNew && (
              <button
                type="button"
                onClick={handleCreateNew}
                className={`w-full text-left px-3 py-2 text-sm flex items-center gap-2 ${activeIndex === suggestions.length ? 'bg-gray-100 text-gray-900' : 'text-gray-700 hover:bg-gray-50'}`}
              >
                <PlusCircle size={16} />
                <span>Add '<b>{inputValue}</b>'</span>
              </button>
            )}
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}
;
