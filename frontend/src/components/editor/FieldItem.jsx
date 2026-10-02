import React from 'react';

const HANDLES = ['nw', 'n', 'ne', 'e', 'se', 's', 'sw', 'w'];

export function FieldItem({
  field,
  isSelected,
  stageScale = 1,
  onMouseDown,
  onResizeHandleMouseDown,
  onRotateHandleMouseDown,
}) {
  const scaledFontSize = Math.max(7, Math.round(field.fontSizePx * stageScale));

  return (
    <div
      className={`field-overlay ${isSelected ? 'selected ring-2 ring-accent ring-offset-1 bg-accent/5' : 'hover:border-accent/60'}`}
      style={{
        left: `${field.x * 100}%`,
        top: `${field.y * 100}%`,
        width: `${field.width * 100}%`,
        height: `${field.height * 100}%`,
        transform: `rotate(${field.rotation || 0}deg)`,
        transformOrigin: 'center center',
      }}
      onMouseDown={(e) => onMouseDown(e, field.id)}
    >
      {/* Field text content */}
      <div
        className="w-full h-full flex overflow-hidden pointer-events-none select-none px-1"
        style={{
          fontFamily: field.fontFamily || 'Inter',
          fontWeight: field.fontWeight || 'normal',
          fontStyle: field.fontStyle || 'normal',
          color: field.color || '#171717',
          textAlign: field.align || 'center',
          letterSpacing: `${field.letterSpacing || 0}px`,
          lineHeight: field.lineHeight || 1.2,
          fontSize: `${scaledFontSize}px`,
          alignItems: 'center',
          justifyContent:
            field.align === 'left'
              ? 'flex-start'
              : field.align === 'right'
              ? 'flex-end'
              : 'center',
        }}
      >
        <span className="truncate w-full block">
          {field.placeholder || field.label}
        </span>
      </div>

      {/* Field label badge on top-left */}
      <div
        className={`absolute -top-5 left-0 px-1.5 py-0.5 rounded text-[10px] font-medium leading-none pointer-events-none whitespace-nowrap shadow-sm transition-opacity ${
          isSelected
            ? 'bg-accent text-white opacity-100'
            : 'bg-primary/80 text-white opacity-0 group-hover:opacity-100'
        }`}
      >
        {field.label}
      </div>

      {/* Handles (visible only when selected) */}
      {isSelected && (
        <>
          {/* Rotate Handle */}
          <div
            className="rotate-handle"
            title="Drag to rotate (Hold Shift for 15° steps)"
            onMouseDown={(e) => onRotateHandleMouseDown(e, field.id)}
          />

          {/* 8 Resize Handles */}
          {HANDLES.map((handle) => (
            <div
              key={handle}
              className={`resize-handle ${handle}`}
              onMouseDown={(e) => onResizeHandleMouseDown(e, field.id, handle)}
            />
          ))}
        </>
      )}
    </div>
  );
}
