import React, { useRef, useEffect, useCallback } from 'react';

// AudioPlayer component for poetry book website

const AudioPlayer = ({ audioSrc, fadeInDuration = 800, fadeOutDuration = 1500 }) => {
  const audioRef = useRef(null);
  const fadeAnimationRef = useRef(null);
  const isFadingRef = useRef(false);
  const touchActiveRef = useRef(false);
  const firstInteractionRef = useRef(false);

  console.log('AudioPlayer v13.0.0 initializing - Debug mode enabled');

  // Detect if user is on a mobile device
  const isMobile = /iPhone|iPad|iPod|Android/i.test(navigator.userAgent);
  
  // Function to check if an element is in the sidebar
  const isInSidebar = useCallback((element) => {
    if (!element) return false;
    let current = element;
    while (current !== document && current !== null) {
      if (current.classList && current.classList.contains('sidebar')) {
        return true;
      }
      current = current.parentNode;
    }
    return false;
  }, []);
  
  // Fade in function with easing
  const fadeIn = useCallback(() => {
    // Safety check - don't proceed if audio reference is missing
    if (!audioRef.current || isFadingRef.current) return;
    
    isFadingRef.current = true;
    
    try {
      const startVolume = audioRef.current ? audioRef.current.volume || 0 : 0;
      const targetVolume = 0.3; // Max volume
      const startTime = performance.now();
      
      const step = (currentTime) => {
        try {
          // Safety check in each animation frame
          if (!audioRef.current) {
            console.log('Audio reference lost during fade in');
            isFadingRef.current = false;
            return;
          }
          
          const elapsed = currentTime - startTime;
          const progress = Math.min(elapsed / fadeInDuration, 1);
          // const easedProgress = 1 - Math.pow(1 - progress, 2); // Ease out quad
          
          audioRef.current.volume = startVolume + (targetVolume - startVolume) * progress;
          
          if (progress < 1) {
            fadeAnimationRef.current = requestAnimationFrame(step);
          } else {
            isFadingRef.current = false;
          }
        } catch (err) {
          console.error('Error in fade in step:', err);
          isFadingRef.current = false;
        }
      };
      
      cancelAnimationFrame(fadeAnimationRef.current);
      fadeAnimationRef.current = requestAnimationFrame(step);
    } catch (err) {
      console.error('Error starting fade in:', err);
      isFadingRef.current = false;
    }
  }, [fadeInDuration]);
  
  // Fade out function with easing
  const fadeOut = useCallback(() => {
    // Safety check - don't proceed if audio reference is missing
    if (!audioRef.current || isFadingRef.current) return;
    
    isFadingRef.current = true;
    
    try {
      const startVolume = audioRef.current ? audioRef.current.volume || 0 : 0;
      const startTime = performance.now();
      
      const step = (currentTime) => {
        try {
          // Safety check in each animation frame
          if (!audioRef.current) {
            console.log('Audio reference lost during fade out');
            isFadingRef.current = false;
            return;
          }
          
          const elapsed = currentTime - startTime;
          const progress = Math.min(elapsed / fadeOutDuration, 1);
          // const easedProgress = 1 - Math.pow(1 - progress, 2); // Ease out quad
          
          audioRef.current.volume = startVolume * (1 - progress);
          
          if (progress < 1) {
            fadeAnimationRef.current = requestAnimationFrame(step);
          } else {
            isFadingRef.current = false;
          }
        } catch (err) {
          console.error('Error in fade out step:', err);
          isFadingRef.current = false;
        }
      };
      
      cancelAnimationFrame(fadeAnimationRef.current);
      fadeAnimationRef.current = requestAnimationFrame(step);
    } catch (err) {
      console.error('Error starting fade out:', err);
      isFadingRef.current = false;
    }
  }, [fadeOutDuration]);
  
  // Handle interaction start (mouse down or touch start)
  const handleInteractionStart = useCallback((event) => {
    try {
      // Skip if event is null or target is missing
      if (!event || !event.target) {
        console.log('Invalid event in handleInteractionStart');
        return;
      }
      
      // Skip if interaction is in the sidebar
      if (isInSidebar(event.target)) {
        console.log('Interaction in sidebar, ignoring');
        return;
      }
      
      console.log('Interaction start detected');
      touchActiveRef.current = true;
      
      // Play audio if not already playing
      if (audioRef.current) {
        console.log('Attempting to play audio, current state:', audioRef.current.paused ? 'paused' : 'playing');
        audioRef.current.play().then(() => {
          console.log('Audio playback started successfully');
          fadeIn();
        }).catch(err => {
          console.error('Audio play failed:', err);
        });
      } else {
        console.error('Audio reference is null');
      }
    } catch (err) {
      console.error('Error in handleInteractionStart:', err);
    }
  }, [isInSidebar, fadeIn]);
  
  // Handle interaction end (mouse up, mouse leave, or touch end)
  const handleInteractionEnd = useCallback(() => {
    try {
      touchActiveRef.current = false;
      
      // Only call fadeOut if we have a valid audio reference
      if (audioRef.current) {
        fadeOut();
      }
    } catch (err) {
      console.error('Error in handleInteractionEnd:', err);
    }
  }, [fadeOut]);
  
  // Handle first touch to attempt playing audio (mobile browsers require user interaction)
  const handleFirstTouch = useCallback((event) => {
    try {
      console.log('First touch detected');
      if (!firstInteractionRef.current) {
        firstInteractionRef.current = true;
        console.log('First interaction registered');
        
        // Try to play audio on first interaction
        if (audioRef.current) {
          // Just try to play with minimal volume to unlock audio
          audioRef.current.volume = 0.01;
          audioRef.current.play().then(() => {
            console.log('Initial audio play successful');
            // Set volume back to 0
            if (audioRef.current) {
              audioRef.current.volume = 0;
            }
          }).catch((err) => {
            console.error('Initial mobile play blocked:', err);
          });
        }
        
        // Remove this event listener after first touch
        document.removeEventListener('touchstart', handleFirstTouch, { passive: true });
      }
    } catch (err) {
      console.error('Error in handleFirstTouch:', err);
      // Still try to remove the event listener to prevent further errors
      try {
        document.removeEventListener('touchstart', handleFirstTouch, { passive: true });
      } catch (e) {}
    }
  }, []);
  
  // Handle mouse/touch movement
  const handleMove = useCallback((event) => {
    try {
      // Skip if event is null or target is missing
      if (!event || !event.target) {
        return;
      }
      
      // Skip if interaction is in the sidebar
      if (isInSidebar(event.target)) {
        return;
      }
      
      // If audio reference is missing, don't proceed
      if (!audioRef.current) {
        console.log('Audio reference missing during movement');
        return;
      }
      
      // If audio is paused, try to play it
      if (audioRef.current.paused) {
        console.log('Movement detected, trying to play audio');
        audioRef.current.play().then(() => {
          console.log('Audio started on movement');
          fadeIn();
        }).catch(err => {
          console.error('Could not play audio on movement:', err);
        });
      } else if (!isFadingRef.current) {
        // If already playing but volume is low, fade in
        if (audioRef.current.volume < 0.1) {
          fadeIn();
        }
      }
    } catch (err) {
      console.error('Error in handleMove:', err);
    }
  }, [isInSidebar, fadeIn]);

  useEffect(() => {
    console.log('AudioPlayer effect running with audioSrc:', audioSrc);
    
    // Create audio element
    const audio = new Audio(audioSrc);
    audio.loop = true;
    audio.volume = 0;
    audioRef.current = audio;
    
    // Add event listeners based on device type
    if (isMobile) {
      console.log('Setting up mobile event listeners');
      // Mobile: Use touch events
      document.addEventListener('touchstart', handleFirstTouch, { passive: true });
      document.addEventListener('touchstart', handleInteractionStart, { passive: true });
      document.addEventListener('touchmove', handleMove, { passive: true });
      document.addEventListener('touchend', handleInteractionEnd, { passive: true });
      document.addEventListener('touchcancel', handleInteractionEnd, { passive: true });
    } else {
      console.log('Setting up desktop event listeners');
      // Desktop: Use mouse events
      document.addEventListener('mousedown', handleInteractionStart);
      document.addEventListener('mousemove', handleMove);
      document.addEventListener('mouseup', handleInteractionEnd);
      document.addEventListener('mouseleave', handleInteractionEnd);
    }

    // Try to play audio immediately (will be blocked on most browsers until user interaction)
    console.log('Attempting initial audio play');
    audio.play().catch(() => {
      console.log('Audio autoplay blocked as expected, waiting for user interaction');
    });

    // Cleanup function
    return () => {
      console.log('AudioPlayer cleanup running');
      if (audioRef.current) {
        audioRef.current.pause();
        audioRef.current = null;
      }
      
      cancelAnimationFrame(fadeAnimationRef.current);
      
      // Remove event listeners
      if (isMobile) {
        document.removeEventListener('touchstart', handleFirstTouch, { passive: true });
        document.removeEventListener('touchstart', handleInteractionStart, { passive: true });
        document.removeEventListener('touchmove', handleMove, { passive: true });
        document.removeEventListener('touchend', handleInteractionEnd, { passive: true });
        document.removeEventListener('touchcancel', handleInteractionEnd, { passive: true });
      } else {
        document.removeEventListener('mousedown', handleInteractionStart);
        document.removeEventListener('mousemove', handleMove);
        document.removeEventListener('mouseup', handleInteractionEnd);
        document.removeEventListener('mouseleave', handleInteractionEnd);
      }
    };
  }, [audioSrc, isMobile, handleFirstTouch, handleInteractionStart, handleMove, handleInteractionEnd]);

  // Create transparent overlay that excludes the sidebar area
  return (
    <>
      {/* Main overlay to capture all interactions except sidebar */}
      <div 
        style={{
          position: 'fixed',
          top: 0,
          left: '80px', // Start after sidebar width
          width: 'calc(100% - 80px)', // Full width minus sidebar
          height: '100%',
          pointerEvents: 'auto', // Capture all events
          zIndex: 99, // Lower than sidebar (which is 100)
          opacity: 0, // Completely transparent
          cursor: 'default' // Don't change cursor appearance
        }}
        onMouseMove={handleMove}
        onTouchMove={handleMove}
        onMouseDown={handleInteractionStart}
        onTouchStart={handleInteractionStart}
        onMouseUp={handleInteractionEnd}
        onTouchEnd={handleInteractionEnd}
        onTouchCancel={handleInteractionEnd}
      />
      
      {/* Audio indicator removed */}
    </>
  );
};

export default AudioPlayer;
