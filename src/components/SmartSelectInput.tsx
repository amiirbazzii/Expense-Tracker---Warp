"use client";

import React, { useState, useEffect, useRef, useCallback } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { X, PlusCircle } from 'lucide-react';
import { useDebounce } from '@/hooks/useDebounce';

interface SmartSelectInputProps {
  name: string;
  label: string;
  multiple?: boolean;
  value: string[];
  onChange: (newItems: string[]) => void;
  fetchSuggestions: (query: string) => Promise<string[]>;
  onCreateNew?: (value: string) => Promise<void>;
  formatNewItem?: (value: string) => string;
  placeholder?: string;
  className?: string;
}

export const SmartSelectInput: React.FC<SmartSelectInputProps> = ({
  name,
  label,
  multiple = false,
  value,
  onChange,
  fetchSuggestions,
  onCreateNew,
  formatNewItem,
  placeholder,
  className,
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
      <label htmlFor={name} className="block text-sm font-medium text-gray-700 mb-1">
        {label}
      </label>
      <div 
        className="relative w-full flex items-center flex-wrap gap-1.5 p-2 border border-gray-300 rounded-md bg-white focus-within:ring-2 focus-within:ring-blue-500 focus-within:border-blue-500 min-h-[44px]"
        onClick={() => inputRef.current?.focus()}
      >
        {value.map(item => (
          <span key={item} className="flex items-center gap-1.5 bg-gray-200 text-gray-800 text-sm font-medium px-2 py-1 rounded-md">
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
          className="flex-grow bg-transparent outline-none text-gray-900 placeholder-gray-500 min-w-[100px]"
          placeholder={value.length === 0 ? placeholder : ''}
          autoComplete="off"
        />
      </div>
      <AnimatePresence>
        {isDropdownVisible && (suggestions.length > 0 || wouldCreateNew) && (
          <motion.div
            initial={{ opacity: 0, y: -10 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -10 }}
            className="absolute top-full left-0 right-0 mt-1 bg-white border border-gray-300 rounded-md shadow-lg z-20 max-h-60 overflow-y-auto"
          >
            {isLoading && <div className="px-3 py-2 text-sm text-gray-500">Loading...</div>}
            {!isLoading && suggestions.map((s, i) => (
              <button
                key={s}
                type="button"
                onClick={() => handleSelect(s)}
                className={`w-full text-left px-3 py-2 text-sm ${activeIndex === i ? 'bg-blue-100 text-blue-800' : 'text-gray-900 hover:bg-gray-100'}`}
              >
                {renderSuggestionHighlight(s)}
              </button>
            ))}
            {!isLoading && wouldCreateNew && (
              <button
                type="button"
                onClick={handleCreateNew}
                className={`w-full text-left px-3 py-2 text-sm flex items-center gap-2 ${activeIndex === suggestions.length ? 'bg-blue-100 text-blue-800' : 'text-gray-700 hover:bg-gray-100'}`}
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
};
