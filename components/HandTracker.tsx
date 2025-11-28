import React, { useEffect, useRef } from 'react';
import { FilesetResolver, HandLandmarker } from '@mediapipe/tasks-vision';

interface HandTrackerProps {
  onInteractionUpdate: (factor: number) => void;
  setIsTracking: (isTracking: boolean) => void;
}

const HandTracker: React.FC<HandTrackerProps> = ({ onInteractionUpdate, setIsTracking }) => {
  const videoRef = useRef<HTMLVideoElement>(null);
  const requestRef = useRef<number>(0);
  const handLandmarkerRef = useRef<HandLandmarker | null>(null);

  useEffect(() => {
    let active = true;

    const setupMediaPipe = async () => {
      try {
        const vision = await FilesetResolver.forVisionTasks(
          "https://cdn.jsdelivr.net/npm/@mediapipe/tasks-vision@0.10.0/wasm"
        );
        
        if (!active) return;

        handLandmarkerRef.current = await HandLandmarker.createFromOptions(vision, {
          baseOptions: {
            modelAssetPath: `https://storage.googleapis.com/mediapipe-models/hand_landmarker/hand_landmarker/float16/1/hand_landmarker.task`,
            delegate: "GPU"
          },
          runningMode: "VIDEO",
          numHands: 2
        });

        startWebcam();
      } catch (error) {
        console.error("Error initializing MediaPipe:", error);
      }
    };

    setupMediaPipe();

    return () => {
      active = false;
      if (handLandmarkerRef.current) {
        handLandmarkerRef.current.close();
      }
      if (requestRef.current) {
        cancelAnimationFrame(requestRef.current);
      }
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const startWebcam = async () => {
    if (navigator.mediaDevices && navigator.mediaDevices.getUserMedia) {
      try {
        const stream = await navigator.mediaDevices.getUserMedia({
          video: { width: 640, height: 480 }
        });
        
        if (videoRef.current) {
          videoRef.current.srcObject = stream;
          videoRef.current.addEventListener('loadeddata', predictWebcam);
          setIsTracking(true);
        }
      } catch (err) {
        console.error("Webcam error:", err);
      }
    }
  };

  const predictWebcam = () => {
    const video = videoRef.current;
    const landmarker = handLandmarkerRef.current;

    if (!video || !landmarker) return;

    if (video.currentTime > 0 && !video.paused && !video.ended) {
      const startTimeMs = performance.now();
      const result = landmarker.detectForVideo(video, startTimeMs);

      let interactionFactor = 1.0; // Default scale

      if (result.landmarks && result.landmarks.length > 0) {
        // Logic: 
        // If 2 hands: Distance between wrist(0) of hand 1 and wrist(0) of hand 2
        // If 1 hand: Distance between Index Tip(8) and Thumb Tip(4) (Pinch to shrink/expand)
        
        if (result.landmarks.length === 2) {
            // Two hands mode: Expansion
            const hand1 = result.landmarks[0][0]; // Wrist
            const hand2 = result.landmarks[1][0]; // Wrist
            
            // Calculate Euclidean distance (normalized coords 0-1)
            const dist = Math.sqrt(
                Math.pow(hand1.x - hand2.x, 2) + 
                Math.pow(hand1.y - hand2.y, 2)
            );
            
            // Reduced sensitivity:
            // Map distance 0.1->0.8 to scale 0.8->1.8 (instead of 0.5->2.5)
            // This provides a more stable, less jittery range
            const clampedDist = Math.max(0.1, Math.min(dist, 0.8));
            // (clampedDist - 0.1) ranges from 0 to 0.7
            // / 0.7 makes it 0 to 1
            // * 1.0 makes it 0 to 1.0
            // + 0.8 makes it 0.8 to 1.8
            interactionFactor = 0.8 + ((clampedDist - 0.1) / 0.7) * 1.0;

        } else if (result.landmarks.length === 1) {
            // One hand pinch mode
            const thumb = result.landmarks[0][4];
            const index = result.landmarks[0][8];
            const dist = Math.sqrt(
                Math.pow(thumb.x - index.x, 2) + 
                Math.pow(thumb.y - index.y, 2)
            );
            // Less sensitive mapping for pinch
            const clampedDist = Math.max(0.02, Math.min(dist, 0.2));
            interactionFactor = 0.8 + ((clampedDist - 0.02) / 0.18) * 0.7;
        }
      }

      onInteractionUpdate(interactionFactor);
    }

    requestRef.current = requestAnimationFrame(predictWebcam);
  };

  return (
    // Moved to bottom-right, made visible with border and higher opacity
    <div className="absolute bottom-4 right-4 w-48 h-36 z-50 rounded-xl overflow-hidden border-2 border-white/20 shadow-2xl bg-black/80">
      <video
        ref={videoRef}
        autoPlay
        playsInline
        muted
        className="w-full h-full object-cover transform scale-x-[-1] opacity-90"
      />
      <div className="absolute bottom-0 left-0 right-0 bg-black/60 text-white text-[10px] text-center py-1">
        摄像头预览
      </div>
    </div>
  );
};

export default HandTracker;