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
      let rotX = 0;
      let rotY = 0;
      let rotZ = 0;

      if (result.landmarks && result.landmarks.length > 0) {
        // --- TWO HANDS LOGIC ---
        if (result.landmarks.length === 2) {
            const hand1 = result.landmarks[0][0]; // Wrist
            const hand2 = result.landmarks[1][0]; // Wrist
            
            // 1. Scale (Distance)
            const dist = Math.sqrt(
                Math.pow(hand1.x - hand2.x, 2) + 
                Math.pow(hand1.y - hand2.y, 2)
            );
            const clampedDist = Math.max(0.1, Math.min(dist, 0.8));
            scale = 0.5 + ((clampedDist - 0.1) / 0.7) * 2.0;

            // 2. Position (Center point)
            const avgX = (hand1.x + hand2.x) / 2;
            const avgY = (hand1.y + hand2.y) / 2;
            
            posX = (0.5 - avgX) * 8; 
            posY = -(avgY - 0.5) * 6;

            // 3. Rotation (Flip/Tilt)
            
            // Z-Axis (Roll): Calculate angle between hands
            // If hand1 is left and hand2 is right, dy=0 is 0 rads.
            // We use atan2(dy, dx)
            const dx = hand2.x - hand1.x;
            const dy = hand2.y - hand1.y;
            rotZ = -Math.atan2(dy, dx); // Negative because screen Y is inverted vs 3D

            // X/Y Axis (Tilt): Based on how far hands are from center
            // Looking up/down/left/right creates a perspective tilt
            rotY = (0.5 - avgX) * 2.0; // Left/Right tilt
            rotX = (avgY - 0.5) * 2.0; // Up/Down tilt

        } else if (result.landmarks.length === 1) {
            // --- ONE HAND LOGIC ---
            const thumb = result.landmarks[0][4];
            const index = result.landmarks[0][8];
            const wrist = result.landmarks[0][0];

            // Scale (Pinch)
            const dist = Math.sqrt(
                Math.pow(thumb.x - index.x, 2) + 
                Math.pow(thumb.y - index.y, 2)
            );
            const clampedDist = Math.max(0.02, Math.min(dist, 0.2));
            scale = 0.5 + ((clampedDist - 0.02) / 0.18) * 1.5;

            // Position
            posX = (0.5 - wrist.x) * 8;
            posY = -(wrist.y - 0.5) * 6;

            // Rotation (Tilt based on position)
            // Move hand left -> rotate object to look left
            rotY = (0.5 - wrist.x) * 3.0;
            rotX = (wrist.y - 0.5) * 3.0;
            // No Z-roll for single hand usually, or maybe wrist angle (complex to calc reliably)
        }
      }

      onInteractionUpdate({ 
        scale, 
        position: { x: posX, y: posY },
        rotation: { x: rotX, y: rotY, z: rotZ }
      });
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