import React from 'react';

export interface WordPreviewContainerProps {
  children: React.ReactNode;
  zoom: number;
  showMargins: boolean;
  className?: string;
}

export const WordPreviewContainer: React.FC<WordPreviewContainerProps> = ({
  children,
  zoom,
  showMargins,
  className = ''
}) => {
  return (
    <div className={`word-preview-container ${className}`}>
      <div className="word-preview-content">
        <div
          className="word-preview-page"
          style={{
            transform: `scale(${zoom / 100})`,
            transformOrigin: 'top center',
            transition: 'transform 0.2s ease',
            position: 'relative'
          }}
        >
          {/* Margin Rulers */}
          {showMargins && (
            <>
              {/* Top margin ruler */}
              <div
                className="margin-ruler-horizontal"
                style={{ top: '12.7mm' }}
              >
                <span className="margin-label" style={{ left: '2mm', top: '-16px' }}>
                  12.7mm
                </span>
              </div>

              {/* Bottom margin ruler */}
              <div
                className="margin-ruler-horizontal"
                style={{ bottom: '12.7mm' }}
              >
                <span className="margin-label" style={{ left: '2mm', bottom: '-16px' }}>
                  12.7mm
                </span>
              </div>

              {/* Left margin ruler */}
              <div
                className="margin-ruler-vertical"
                style={{ left: '12.7mm' }}
              >
                <span className="margin-label" style={{ left: '-40px', top: '2mm' }}>
                  12.7mm
                </span>
              </div>

              {/* Right margin ruler */}
              <div
                className="margin-ruler-vertical"
                style={{ right: '12.7mm' }}
              >
                <span className="margin-label" style={{ right: '-40px', top: '2mm' }}>
                  12.7mm
                </span>
              </div>

              {/* Corner L-markers */}
              <div style={{
                position: 'absolute',
                top: '12.7mm',
                left: '12.7mm',
                width: '8px',
                height: '8px',
                borderTop: '2px solid #9CA3AF',
                borderLeft: '2px solid #9CA3AF',
                pointerEvents: 'none'
              }} />
              <div style={{
                position: 'absolute',
                top: '12.7mm',
                right: '12.7mm',
                width: '8px',
                height: '8px',
                borderTop: '2px solid #9CA3AF',
                borderRight: '2px solid #9CA3AF',
                pointerEvents: 'none'
              }} />
              <div style={{
                position: 'absolute',
                bottom: '12.7mm',
                left: '12.7mm',
                width: '8px',
                height: '8px',
                borderBottom: '2px solid #9CA3AF',
                borderLeft: '2px solid #9CA3AF',
                pointerEvents: 'none'
              }} />
              <div style={{
                position: 'absolute',
                bottom: '12.7mm',
                right: '12.7mm',
                width: '8px',
                height: '8px',
                borderBottom: '2px solid #9CA3AF',
                borderRight: '2px solid #9CA3AF',
                pointerEvents: 'none'
              }} />
            </>
          )}

          {/* Content */}
          {children}
        </div>
      </div>
    </div>
  );
};
