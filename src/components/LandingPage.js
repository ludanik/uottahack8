import React, { useState, useRef, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import './LandingPage.css';

function LandingPage({ onStartRecording, onNavigateToDashboard, isVoiceActive = false }) {
  const [clickCount, setClickCount] = useState(0);
  const [centerOffset, setCenterOffset] = useState(0);
  const logoRef = useRef(null);
  const hasCalculatedOffset = useRef(false);
  const lockedOffsetRef = useRef(null); // Lock the offset once calculated

  const handleLogoClick = () => {
    if (clickCount === 0) {
      // Calculate offset ONCE based on actual position
      // This needs to account for where the logo is now vs where it should be (center)
      if (logoRef.current && !hasCalculatedOffset.current) {
        const rect = logoRef.current.getBoundingClientRect();
        const viewportCenter = window.innerWidth /  2;
        const logoCenter = rect.left + rect.width / 2;
        // Calculate offset to center
        // When text disappears, logo will shift left, so we need to compensate
        // Estimate text is ~400px wide, so add ~200px to move it right to center
        const estimatedTextHalfWidth = 200;
        const currentOffset = viewportCenter - logoCenter;
        //const finalOffset = currentOffset + estimatedTextHalfWidth;
        const finalOffset = currentOffset;

        // Lock it immediately - set both ref and state
        lockedOffsetRef.current = finalOffset;
        setCenterOffset(finalOffset);
        hasCalculatedOffset.current = true;
      }
      // First click: fade text, center and expand logo
      setClickCount(1);
    } else if (clickCount === 1) {
      // Second click: start recording
      onStartRecording();
    }
  };

  // If voice is active, automatically center the logo (simulate second click state)
  useEffect(() => {
    if (isVoiceActive && clickCount === 0) {
      // Calculate and set offset if not already done
      if (logoRef.current && !hasCalculatedOffset.current) {
        const rect = logoRef.current.getBoundingClientRect();
        const viewportCenter = window.innerWidth / 2;
        const logoCenter = rect.left + rect.width / 2;
        const currentOffset = viewportCenter - logoCenter;
        lockedOffsetRef.current = currentOffset;
        setCenterOffset(currentOffset);
        hasCalculatedOffset.current = true;
      }
      // Set clickCount to 1 to center the logo
      setClickCount(1);
    }
  }, [isVoiceActive]);

  // Reset when going back to initial state
  useEffect(() => {
    if (clickCount === 0) {
      setCenterOffset(0);
      hasCalculatedOffset.current = false;
      lockedOffsetRef.current = null;
    }
    // DO NOT do anything when clickCount === 1
    // The offset is already locked and should never change
  }, [clickCount]);

  const isCentered = clickCount > 0;

  return (
    <div className="landing-page">
      {onNavigateToDashboard && (
        <motion.button
          className="dashboard-button"
          onClick={onNavigateToDashboard}
          initial={{ opacity: 0, y: -20 }}
          animate={{ 
            opacity: isCentered ? 0 : 1,
            y: isCentered ? -20 : 0
          }}
          transition={{ 
            delay: isCentered ? 0 : 0.5,
            duration: 0.5,
            ease: "easeOut"
          }}
          whileHover={{ scale: isCentered ? 1 : 1.05 }}
          whileTap={{ scale: isCentered ? 1 : 0.95 }}
          style={{ pointerEvents: isCentered ? 'none' : 'auto' }}
        >
          <span className="dashboard-icon">📊</span>
          <span className="dashboard-text">View Reviews</span>
        </motion.button>
      )}
      <div className={`logo-container ${isCentered ? 'centered' : ''}`}>
        <motion.div 
          ref={logoRef}
          className="logo-icon" 
          onClick={handleLogoClick}
          initial={{ opacity: 0 }}
          animate={{
            opacity: 1,
            x: centerOffset,
            y: isCentered ? 100 : 0,
            scale: isCentered ? 1.3 : 1
          }}
          transition={{
            opacity: {
              duration: 1.2,
              ease: "easeOut"
            },
            x: {
              type: "spring",
              stiffness: 30,
              damping: 25,
              restDelta: 0.01,
              restSpeed: 0.01
            },
            y: {
              type: "spring",
              stiffness: 30,
              damping: 25
            },
            scale: {
              type: "spring",
              stiffness: 30,
              damping: 25
            }
          }}
          whileHover={{ 
            scale: isCentered ? 1.35 : 1.05
          }}
          whileTap={{ 
            scale: isCentered ? 1.3 : 0.98
          }}
        >
        <div id="logotext">
          <img 
              src="/righthand.png" 
              alt="RightHand Icon" 
              className="logo-image"
              style={{ marginBottom: '-300px', marginTop: '180px'  }}
          />
          <motion.img 
                src="/righthand text.png" 
                alt="RightHand Text" 
                className="logo-text-image"
                initial={{ opacity: 0 }}
                animate={{ opacity: isCentered ? 0 : 1 }}
                transition={{ 
                  opacity: { duration: 1.2, ease: "easeOut" },
                  default: { duration: 0.5 }
                }}
          />
        </div>
        
        </motion.div>
        {/* <AnimatePresence>
          {!isCentered && (
            <motion.div 
              className="logo-text"
              initial={{ opacity: 1, x: 0, scale: 1 }}
              exit={{ 
                opacity: 0, 
                y: 0, 
                scale: 0.7 
              }}
              transition={{
                type: "spring",
                stiffness: 50,
                damping: 20,
                duration: 0.8
              }}
            >
              
             </motion.div> 
          )}
        </AnimatePresence> */}
      </div>
    </div>
  );
}

export default LandingPage;