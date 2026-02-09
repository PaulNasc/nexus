import React, { useState, useEffect, useRef } from 'react';
import { X, Lightbulb } from 'lucide-react';

interface ProductivitySuggestion {
  id: string;
  title: string;
  body: string;
  severity: 'info' | 'success' | 'warning';
}

interface Props {
  suggestions: ProductivitySuggestion[];
  settings: {
    fontSizePx: number;
    cardOpacity: number;
    reduceAnimations: boolean;
    interfaceDensity: 'compact' | 'normal' | 'comfortable';
    widgetButtonOpacity: number;
    widgetButtonSize: number;
  };
}

const ProactiveSuggestionsWidget: React.FC<Props> = ({ suggestions, settings }) => {
  const MARGIN = 8;

  const clampToViewport = (
    left: number,
    top: number,
    width: number,
    height: number
  ) => {
    const maxLeft = Math.max(MARGIN, window.innerWidth - width - MARGIN);
    const maxTop = Math.max(MARGIN, window.innerHeight - height - MARGIN);
    return {
      left: Math.max(MARGIN, Math.min(left, maxLeft)),
      top: Math.max(MARGIN, Math.min(top, maxTop))
    };
  };

  const [isExpanded, setIsExpanded] = useState(() => {
    const stored = localStorage.getItem('proactiveSuggestionsExpanded');
    return stored === 'true';
  });

  const [position, setPosition] = useState(() => {
    const stored = localStorage.getItem('proactiveSuggestionsPosition');
    if (stored) {
      return JSON.parse(stored);
    }
    return {
      left: window.innerWidth - 76,
      top: window.innerHeight - 76
    };
  });

  const [isDragging, setIsDragging] = useState(false);
  const [dragOffset, setDragOffset] = useState({ x: 0, y: 0 });
  const [hasMoved, setHasMoved] = useState(false);
  const [dragStartPos, setDragStartPos] = useState({ x: 0, y: 0 });

  const positionRef = useRef(position);

  useEffect(() => {
    positionRef.current = position;
  }, [position]);

  const [viewedSuggestions, setViewedSuggestions] = useState<Set<string>>(() => {
    const stored = localStorage.getItem('viewedProactiveSuggestions');
    return stored ? new Set(JSON.parse(stored)) : new Set();
  });

  const getDensityValues = () => {
    switch (settings.interfaceDensity) {
      case 'compact':
        return { padding: '8px', buttonSize: 48, cardWidth: 280 };
      case 'comfortable':
        return { padding: '16px', buttonSize: 64, cardWidth: 360 };
      default:
        return { padding: '12px', buttonSize: 56, cardWidth: 320 };
    }
  };

  useEffect(() => {
    localStorage.setItem('proactiveSuggestionsExpanded', String(isExpanded));
  }, [isExpanded]);

  useEffect(() => {
    const clampAnchor = () => {
      const clamped = clampToViewport(
        positionRef.current.left,
        positionRef.current.top,
        settings.widgetButtonSize,
        settings.widgetButtonSize
      );

      if (
        clamped.left !== positionRef.current.left ||
        clamped.top !== positionRef.current.top
      ) {
        positionRef.current = clamped;
        setPosition(clamped);
        localStorage.setItem('proactiveSuggestionsPosition', JSON.stringify(clamped));
      }
    };

    clampAnchor();
    window.addEventListener('resize', clampAnchor);
    return () => {
      window.removeEventListener('resize', clampAnchor);
    };
  }, [settings.widgetButtonSize]);

  useEffect(() => {
    if (isDragging) {
      const handleMouseMove = (e: MouseEvent) => {
        // Detectar se houve movimento significativo
        const deltaX = Math.abs(e.clientX - dragStartPos.x);
        const deltaY = Math.abs(e.clientY - dragStartPos.y);
        
        if (deltaX > 5 || deltaY > 5) {
          setHasMoved(true);
        }
        
        const newLeft = e.clientX - dragOffset.x;
        const newTop = e.clientY - dragOffset.y;
        
        const density = getDensityValues();
        const widgetWidth = isExpanded ? density.cardWidth : settings.widgetButtonSize;
        const widgetHeight = isExpanded ? 400 : settings.widgetButtonSize;

        const maxLeft = Math.max(MARGIN, window.innerWidth - widgetWidth - MARGIN);
        const maxTop = Math.max(MARGIN, window.innerHeight - widgetHeight - MARGIN);

        const next = {
          left: Math.max(MARGIN, Math.min(newLeft, maxLeft)),
          top: Math.max(MARGIN, Math.min(newTop, maxTop))
        };

        positionRef.current = next;
        setPosition(next);
      };

      const handleMouseUp = () => {
        setIsDragging(false);
        localStorage.setItem('proactiveSuggestionsPosition', JSON.stringify(positionRef.current));
        
        // Só expandir se não houve movimento (foi um clique)
        if (!hasMoved && !isExpanded) {
          handleExpand();
        }
      };

      window.addEventListener('mousemove', handleMouseMove);
      window.addEventListener('mouseup', handleMouseUp);
      
      return () => {
        window.removeEventListener('mousemove', handleMouseMove);
        window.removeEventListener('mouseup', handleMouseUp);
      };
    }
  }, [isDragging, dragOffset, settings.widgetButtonSize, isExpanded, settings.interfaceDensity, dragStartPos, hasMoved]);

  if (suggestions.length === 0) {
    return null;
  }

  const density = getDensityValues();
  const baseFontSize = settings.fontSizePx;
  const opacity = settings.cardOpacity / 100;
  const buttonOpacity = settings.widgetButtonOpacity / 100;
  const transitions = settings.reduceAnimations ? 'none' : 'all 0.3s ease';

  const unviewedCount = suggestions.filter(s => !viewedSuggestions.has(s.id)).length;

  const handleExpand = () => {
    setIsExpanded(true);
    
    // Marcar sugestões como vistas
    const newViewed = new Set([...viewedSuggestions, ...suggestions.map(s => s.id)]);
    setViewedSuggestions(newViewed);
    localStorage.setItem('viewedProactiveSuggestions', JSON.stringify([...newViewed]));
  };

  const handleMouseDown = (e: React.MouseEvent) => {
    e.preventDefault();
    setIsDragging(true);
    setHasMoved(false);
    setDragStartPos({ x: e.clientX, y: e.clientY });

    const currentLeft = positionRef.current.left;
    const currentTop = positionRef.current.top;

    if (isExpanded) {
      const density = getDensityValues();
      const visual = clampToViewport(currentLeft, currentTop, density.cardWidth, 400);
      setDragOffset({
        x: e.clientX - visual.left,
        y: e.clientY - visual.top
      });
      return;
    }

    setDragOffset({
      x: e.clientX - currentLeft,
      y: e.clientY - currentTop
    });
  };

  const getSeverityColor = (severity: 'info' | 'success' | 'warning'): string => {
    switch (severity) {
      case 'info':
        return '#1E3A8A';
      case 'success':
        return '#065F46';
      case 'warning':
        return '#92400E';
      default:
        return '#1E3A8A';
    }
  };

  const expandedVisualPos = clampToViewport(position.left, position.top, density.cardWidth, 400);
  const expandedDx = expandedVisualPos.left - position.left;
  const expandedDy = expandedVisualPos.top - position.top;

  return (
    <div
      style={{
        position: 'fixed',
        left: `${position.left}px`,
        top: `${position.top}px`,
        zIndex: 10000,
        transition: transitions,
      }}
    >
      {!isExpanded ? (
        <button
          onMouseDown={handleMouseDown}
          style={{
            width: `${settings.widgetButtonSize}px`,
            height: `${settings.widgetButtonSize}px`,
            borderRadius: '50%',
            backgroundColor: 'var(--color-primary-teal)',
            border: 'none',
            cursor: isDragging ? 'grabbing' : 'grab',
            boxShadow: '0 4px 12px rgba(0,0,0,0.3)',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            position: 'relative',
            transition: transitions,
            opacity: buttonOpacity,
          }}
          onMouseEnter={(e) => {
            if (!settings.reduceAnimations) {
              e.currentTarget.style.transform = 'scale(1.05)';
            }
          }}
          onMouseLeave={(e) => {
            if (!settings.reduceAnimations) {
              e.currentTarget.style.transform = 'scale(1)';
            }
          }}
          title="Sugestões Proativas (Arraste para mover)"
        >
          <Lightbulb size={24} color="#FFFFFF" />
          {unviewedCount > 0 && (
            <span
              style={{
                position: 'absolute',
                top: '-4px',
                right: '-4px',
                backgroundColor: '#EF4444',
                color: '#FFFFFF',
                borderRadius: '50%',
                width: '20px',
                height: '20px',
                fontSize: '11px',
                fontWeight: 'bold',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
              }}
            >
              {unviewedCount}
            </span>
          )}
        </button>
      ) : (
        <div
          onMouseDown={handleMouseDown}
          style={{
            width: `${density.cardWidth}px`,
            maxHeight: '400px',
            backgroundColor: 'var(--color-bg-card)',
            border: '1px solid var(--color-border-primary)',
            borderRadius: '12px',
            boxShadow: '0 8px 24px rgba(0,0,0,0.4)',
            overflow: 'hidden',
            display: 'flex',
            flexDirection: 'column',
            opacity: opacity,
            transition: transitions,
            cursor: isDragging ? 'grabbing' : 'grab',
            transform: expandedDx !== 0 || expandedDy !== 0 ? `translate(${expandedDx}px, ${expandedDy}px)` : undefined,
          }}
        >
          <div
            style={{
              padding: density.padding,
              borderBottom: '1px solid var(--color-border-primary)',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'space-between',
              backgroundColor: 'var(--color-bg-secondary)',
            }}
          >
            <div
              style={{
                display: 'flex',
                alignItems: 'center',
                gap: '8px',
              }}
            >
              <Lightbulb size={16} color="var(--color-primary-teal)" />
              <span
                style={{
                  fontSize: `${baseFontSize}px`,
                  fontWeight: 600,
                  color: 'var(--color-text-primary)',
                }}
              >
                Sugestões Proativas
              </span>
            </div>
            <button
              onMouseDown={(e) => {
                e.stopPropagation();
              }}
              onClick={(e) => {
                e.stopPropagation();
                setIsExpanded(false);
              }}
              style={{
                background: 'none',
                border: 'none',
                cursor: 'pointer',
                padding: '4px',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                borderRadius: '4px',
                transition: settings.reduceAnimations ? 'none' : 'background-color 0.2s ease',
              }}
              onMouseEnter={(e) => {
                if (!settings.reduceAnimations) {
                  e.currentTarget.style.backgroundColor = 'rgba(255,255,255,0.1)';
                }
              }}
              onMouseLeave={(e) => {
                if (!settings.reduceAnimations) {
                  e.currentTarget.style.backgroundColor = 'transparent';
                }
              }}
              title="Fechar"
            >
              <X size={18} color="var(--color-text-secondary)" />
            </button>
          </div>

          <div
            style={{
              padding: density.padding,
              overflowY: 'auto',
              display: 'flex',
              flexDirection: 'column',
              gap: '10px',
            }}
          >
            {suggestions.map((suggestion) => (
              <div
                key={suggestion.id}
                style={{
                  padding: density.padding,
                  borderRadius: '8px',
                  backgroundColor: getSeverityColor(suggestion.severity),
                  border: '1px solid rgba(255,255,255,0.1)',
                }}
              >
                <div
                  style={{
                    fontSize: `${baseFontSize + 1}px`,
                    fontWeight: 600,
                    color: '#FFFFFF',
                    marginBottom: '4px',
                  }}
                >
                  {suggestion.title}
                </div>
                <div
                  style={{
                    fontSize: `${baseFontSize - 1}px`,
                    color: '#E5E5E5',
                    lineHeight: 1.5,
                  }}
                >
                  {suggestion.body}
                </div>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
};

export default ProactiveSuggestionsWidget;
