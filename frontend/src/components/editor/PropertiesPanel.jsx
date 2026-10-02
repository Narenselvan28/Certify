import { useState, useRef, useEffect } from 'react';
import { FONTS } from '../../constants/fonts.js';

export function PropertiesPanel({ field, onUpdateField, onDeleteField }) {
  const [fontSearch, setFontSearch] = useState('');
  const [isFontPickerOpen, setIsFontPickerOpen] = useState(false);
  const fontDropdownRef = useRef(null);

  // Close font dropdown on click outside
  useEffect(() => {
    const handleClickOutside = (e) => {
      if (fontDropdownRef.current && !fontDropdownRef.current.contains(e.target)) {
        setIsFontPickerOpen(false);
      }
    };
    if (isFontPickerOpen) {
      document.addEventListener('mousedown', handleClickOutside);
    }
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, [isFontPickerOpen]);

  if (!field) return null;

  const filteredFonts = FONTS.filter((f) =>
    f.name.toLowerCase().includes(fontSearch.toLowerCase()) ||
    f.category.toLowerCase().includes(fontSearch.toLowerCase())
  );

  const handleFontSizeChange = (delta) => {
    const current = Number(field.fontSizePx) || 24;
    const next = Math.max(8, Math.min(200, current + delta));
    onUpdateField({ fontSizePx: next });
  };

  return (
    <div className="bg-surface border-b border-border px-4 py-2 flex flex-wrap items-center gap-2 text-xs shadow-sm z-10 shrink-0">
      {/* Selected Field Label */}
      <div className="flex items-center space-x-1.5 mr-1 pr-2 border-r border-border">
        <span className="font-semibold text-primary">{field.label}</span>
      </div>

      {/* Font Family Dropdown */}
      <div className="relative" ref={fontDropdownRef}>
        <button
          type="button"
          onClick={() => setIsFontPickerOpen(!isFontPickerOpen)}
          className="flex items-center space-x-1.5 px-2.5 py-1 border border-border rounded hover:bg-bg text-primary text-xs min-w-[110px] justify-between transition-colors bg-surface"
        >
          <span className="truncate max-w-[90px]">{field.fontFamily || 'Inter'}</span>
          <svg className="w-3 h-3 text-muted shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M19 9l-7 7-7-7" />
          </svg>
        </button>

        {isFontPickerOpen && (
          <div className="absolute top-full left-0 mt-1 w-64 bg-surface border border-border rounded-lg shadow-xl z-50 p-2 text-left">
            <input
              type="text"
              placeholder="Search fonts..."
              value={fontSearch}
              onChange={(e) => setFontSearch(e.target.value)}
              className="w-full px-2.5 py-1.5 text-xs border border-border rounded mb-2 focus:outline-none focus:border-accent text-primary bg-bg"
              autoFocus
            />
            <div className="max-h-56 overflow-y-auto space-y-0.5 text-xs">
              {filteredFonts.map((font) => (
                <button
                  key={font.name}
                  type="button"
                  onClick={() => {
                    onUpdateField({ fontFamily: font.name });
                    setIsFontPickerOpen(false);
                  }}
                  className={`w-full text-left px-2 py-1.5 rounded flex items-center justify-between hover:bg-bg transition-colors ${
                    field.fontFamily === font.name ? 'bg-accent/10 text-accent font-medium' : 'text-primary'
                  }`}
                  style={{ fontFamily: font.name }}
                >
                  <span className="truncate">{font.name}</span>
                  <span className="text-[10px] text-muted ml-2 font-sans">{font.category}</span>
                </button>
              ))}
            </div>
          </div>
        )}
      </div>

      {/* Font Size Stepper */}
      <div className="flex items-center border border-border rounded overflow-hidden bg-surface">
        <button
          type="button"
          onClick={() => handleFontSizeChange(-2)}
          className="px-2 py-1 hover:bg-bg text-primary transition-colors font-mono"
          title="Decrease font size"
        >
          -
        </button>
        <input
          type="number"
          min="8"
          max="200"
          value={field.fontSizePx || 24}
          onChange={(e) => {
            const val = parseInt(e.target.value, 10);
            if (!isNaN(val)) onUpdateField({ fontSizePx: Math.max(8, Math.min(200, val)) });
          }}
          className="w-10 text-center text-xs py-1 border-x border-border focus:outline-none text-primary"
        />
        <button
          type="button"
          onClick={() => handleFontSizeChange(2)}
          className="px-2 py-1 hover:bg-bg text-primary transition-colors font-mono"
          title="Increase font size"
        >
          +
        </button>
      </div>

      {/* Bold & Italic Toggles */}
      <div className="flex items-center border border-border rounded overflow-hidden bg-surface">
        <button
          type="button"
          onClick={() =>
            onUpdateField({
              fontWeight: field.fontWeight === 'bold' ? 'normal' : 'bold',
            })
          }
          className={`px-2.5 py-1 font-bold transition-colors ${
            field.fontWeight === 'bold' ? 'bg-accent text-white' : 'text-primary hover:bg-bg'
          }`}
          title="Bold"
        >
          B
        </button>
        <button
          type="button"
          onClick={() =>
            onUpdateField({
              fontStyle: field.fontStyle === 'italic' ? 'normal' : 'italic',
            })
          }
          className={`px-2.5 py-1 italic font-serif border-l border-border transition-colors ${
            field.fontStyle === 'italic' ? 'bg-accent text-white' : 'text-primary hover:bg-bg'
          }`}
          title="Italic"
        >
          I
        </button>
      </div>

      {/* Text Alignment */}
      <div className="flex items-center border border-border rounded overflow-hidden bg-surface">
        <button
          type="button"
          onClick={() => onUpdateField({ align: 'left' })}
          className={`p-1.5 transition-colors ${
            field.align === 'left' ? 'bg-accent text-white' : 'text-primary hover:bg-bg'
          }`}
          title="Align Left"
        >
          <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M4 6h16M4 12h10M4 18h14" />
          </svg>
        </button>
        <button
          type="button"
          onClick={() => onUpdateField({ align: 'center' })}
          className={`p-1.5 border-l border-border transition-colors ${
            field.align === 'center' ? 'bg-accent text-white' : 'text-primary hover:bg-bg'
          }`}
          title="Align Center"
        >
          <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M4 6h16M7 12h10M5 18h14" />
          </svg>
        </button>
        <button
          type="button"
          onClick={() => onUpdateField({ align: 'right' })}
          className={`p-1.5 border-l border-border transition-colors ${
            field.align === 'right' ? 'bg-accent text-white' : 'text-primary hover:bg-bg'
          }`}
          title="Align Right"
        >
          <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M4 6h16M10 12h10M6 18h14" />
          </svg>
        </button>
      </div>

      {/* Text Color Picker */}
      <div className="flex items-center space-x-1 border border-border rounded px-1.5 py-1 bg-surface" title="Text Color">
        <input
          type="color"
          value={field.color || '#171717'}
          onChange={(e) => onUpdateField({ color: e.target.value })}
          className="w-5 h-5 rounded cursor-pointer border-0 p-0 bg-transparent"
        />
        <span className="text-[11px] font-mono text-muted uppercase">
          {field.color || '#171717'}
        </span>
      </div>

      {/* Auto Fit Toggle */}
      <button
        type="button"
        onClick={() => onUpdateField({ autoFit: !field.autoFit })}
        className={`flex items-center space-x-1 px-2 py-1 rounded border transition-colors ${
          field.autoFit
            ? 'border-accent bg-accent/10 text-accent font-medium'
            : 'border-border text-muted hover:bg-bg'
        }`}
        title="Auto Fit: Automatically scale font to fit bounding box"
      >
        <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M4 8V4m0 0h4M4 4l5 5m11-1V4m0 0h-4m4 0l-5 5M4 16v4m0 0h4m-4 0l5-5m11 5l-5-5m5 5v-4m0 4h-4" />
        </svg>
        <span>Auto Fit</span>
      </button>

      {/* Center Horizontally Shortcut */}
      <button
        type="button"
        onClick={() => onUpdateField({ x: Math.max(0, (1 - field.width) / 2) })}
        className="px-2 py-1 rounded border border-border hover:bg-bg text-muted hover:text-primary transition-colors text-[11px]"
        title="Center field horizontally on certificate"
      >
        Center Horiz
      </button>

      {/* Rotation Control */}
      <div className="flex items-center space-x-1 text-muted border border-border rounded px-1.5 py-1 bg-surface">
        <span className="text-[10px]">∠</span>
        <input
          type="number"
          min="-180"
          max="180"
          value={field.rotation || 0}
          onChange={(e) => {
            const val = parseFloat(e.target.value);
            if (!isNaN(val)) onUpdateField({ rotation: val });
          }}
          className="w-8 text-center text-xs border-0 focus:outline-none text-primary bg-transparent"
          title="Rotation in degrees"
        />
        <span className="text-[10px]">°</span>
      </div>

      <div className="h-4 border-r border-border mx-1"></div>

      {/* Delete Field Button */}
      <button
        type="button"
        onClick={onDeleteField}
        className="flex items-center space-x-1 px-2.5 py-1 text-error hover:bg-red-50 rounded border border-red-200 transition-colors"
        title="Delete Field (Backspace / Delete)"
      >
        <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
        </svg>
        <span>Delete</span>
      </button>
    </div>
  );
}
