import { forwardRef, useState, useEffect, useRef } from 'react';
import { FieldItem } from './FieldItem.jsx';

export const Stage = forwardRef(function Stage(
  {
    template,
    fields,
    selectedFieldId,
    zoom = 1,
    onFieldBodyMouseDown,
    onResizeHandleMouseDown,
    onRotateHandleMouseDown,
    onDeselect,
  },
  ref
) {
  const [stageDimensions, setStageDimensions] = useState({ width: 0, height: 0 });
  const internalRef = useRef(null);
  const actualRef = ref || internalRef;

  // Track rendered pixel width to compute font size scale relative to template original resolution
  useEffect(() => {
    const updateSize = () => {
      if (actualRef.current) {
        const rect = actualRef.current.getBoundingClientRect();
        setStageDimensions({ width: rect.width, height: rect.height });
      }
    };
    updateSize();
    window.addEventListener('resize', updateSize);
    return () => window.removeEventListener('resize', updateSize);
  }, [actualRef, zoom, template]);

  const templateOrigWidth = template?.width || 1920;
  const stageScale = stageDimensions.width > 0 ? stageDimensions.width / templateOrigWidth : 0.5;

  return (
    <div
      className="flex-1 overflow-auto p-4 md:p-8 flex items-center justify-center bg-[#EDECE9]/60 select-none"
      onClick={onDeselect}
    >
      <div
        style={{
          transform: `scale(${zoom})`,
          transformOrigin: 'center center',
          transition: 'transform 0.15s ease-out',
        }}
        className="max-w-full"
      >
        <div
          ref={actualRef}
          className="cert-stage relative bg-white select-none shadow-2xl transition-shadow"
          style={{
            aspectRatio: `${template.aspectRatio || (template.width && template.height ? template.width / template.height : 1.414)}`,
            maxWidth: '85vw',
            maxHeight: '75vh',
            width: '850px',
          }}
          onClick={(e) => e.stopPropagation()}
        >
          {/* Certificate Background Template */}
          {template?.src ? (
            <img
              src={template.src}
              alt="Certificate template"
              className="w-full h-full object-contain pointer-events-none block select-none"
              draggable={false}
              onLoad={() => {
                if (actualRef.current) {
                  const rect = actualRef.current.getBoundingClientRect();
                  setStageDimensions({ width: rect.width, height: rect.height });
                }
              }}
            />
          ) : (
            <div className="w-full h-full flex items-center justify-center text-muted bg-white border border-border">
              No template loaded
            </div>
          )}

          {/* Draggable/Resizable Field Overlays */}
          {fields.map((field) => (
            <FieldItem
              key={field.id}
              field={field}
              isSelected={field.id === selectedFieldId}
              stageScale={stageScale}
              onMouseDown={onFieldBodyMouseDown}
              onResizeHandleMouseDown={onResizeHandleMouseDown}
              onRotateHandleMouseDown={onRotateHandleMouseDown}
            />
          ))}
        </div>
      </div>
    </div>
  );
});
