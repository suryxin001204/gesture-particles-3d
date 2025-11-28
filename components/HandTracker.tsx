import React, { useEffect, useRef } from 'react';
import { FilesetResolver, HandLandmarker } from '@mediapipe/tasks-vision';
import { InteractionData } from '../App';

interface HandTrackerProps {
  onInteractionUpdate: (data: InteractionData) => void;
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

      let scale = 1.0;
      let posX = 0;
      let posY = 0;

      if (result.landmarks && result.landmarks.length > 0) {
        // --- 1. Scale Logic (Distance) ---
        if (result.landmarks.length === 2) {
            // Two hands
            const hand1 = result.landmarks[0][0];
            const hand2 = result.landmarks[1][0];
            
            const dist = Math.sqrt(
                Math.pow(hand1.x - hand2.x, 2) + 
                Math.pow(hand1.y - hand2.y, 2)
            );
            
            // Increased Range: Map 0.1->0.8 distance to 0.5->2.5 scale
            const clampedDist = Math.max(0.1, Math.min(dist, 0.8));
            scale = 0.5 + ((clampedDist - 0.1) / 0.7) * 2.0;

            // --- 2. Position Logic (Center point) ---
            // Average of two wrists
            const avgX = (hand1.x + hand2.x) / 2;
            const avgY = (hand1.y + hand2.y) / 2;
            
            // Map 0..1 to -4..4 range
            // Note: MediaPipe X is 0(left)..1(right) of the VIDEO source.
            // Since we flip video with CSS (scale-x-[-1]), visual left is video right.
            // To make particles follow visual hand: 
            // If I move hand to visual right -> video sees hand at x=0 (left) -> mapped X should be positive.
            // (0.5 - x) flips the direction.
            posX = (0.5 - avgX) * 8; 
            posY = -(avgY - 0.5) * 6; // Invert Y (Screen Y down is positive, 3D Y up is positive)

        } else if (result.landmarks.length === 1) {
            // One hand
            const thumb = result.landmarks[0][4];
            const index = result.landmarks[0][8];
            const wrist = result.landmarks[0][0];

            // Pinch distance
            const dist = Math.sqrt(
                Math.pow(thumb.x - index.x, 2) + 
                Math.pow(thumb.y - index.y, 2)
            );
            const clampedDist = Math.max(0.02, Math.min(dist, 0.2));
            scale = 0.5 + ((clampedDist - 0.02) / 0.18) * 1.5;

            // Position based on Wrist
            posX = (0.5 - wrist.x) * 8;
            posY = -(wrist.y - 0.5) * 6;
        }
      }

      onInteractionUpdate({ scale, position: { x: posX, y: posY } });
    }

    requestRef.current = requestAnimationFrame(predictWebcam);
  };

  return (
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