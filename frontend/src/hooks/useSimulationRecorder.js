import { useCallback, useRef, useState } from 'react';

const SEGMENT_DURATION_MS = 5000;
const RECORDING_SETTLE_MS = 180;
const FRAME_RATE = 60;

const delay = (ms) => new Promise(resolve => setTimeout(resolve, ms));

const waitForPaint = () => new Promise(resolve => {
  requestAnimationFrame(() => requestAnimationFrame(resolve));
});

const pickVideoMimeType = () => {
  if (typeof MediaRecorder === 'undefined') return '';

  return [
    'video/mp4;codecs=h264',
    'video/mp4',
    'video/webm;codecs=vp9',
    'video/webm;codecs=vp8',
    'video/webm'
  ].find(type => MediaRecorder.isTypeSupported(type)) || '';
};

const getVideoExtension = (mimeType) => mimeType.includes('mp4') ? 'mp4' : 'webm';

const buildDownloadName = (extension) => {
  const stamp = new Date().toISOString().replace(/[:.]/g, '-');
  return `voyageatlas-simulation-${stamp}.${extension}`;
};

export const useSimulationRecorder = ({
  globeRef,
  visibleEvents,
  currentEventIndex,
  isPlaying,
  speed,
  setCurrentEventIndex,
  setIsPlaying,
  setSpeed
}) => {
  const recorderRef = useRef(null);
  const streamRef = useRef(null);
  const stopTimerRef = useRef(null);
  const progressTimerRef = useRef(null);
  const cancelledRef = useRef(false);
  const previousPlaybackRef = useRef(null);
  const [state, setState] = useState({
    status: 'idle',
    progress: 0,
    message: '',
    fileName: ''
  });

  const clearTimers = useCallback(() => {
    clearTimeout(stopTimerRef.current);
    clearInterval(progressTimerRef.current);
    stopTimerRef.current = null;
    progressTimerRef.current = null;
  }, []);

  const stopStream = useCallback(() => {
    streamRef.current?.getTracks().forEach(track => track.stop());
    streamRef.current = null;
  }, []);

  const cancelRecording = useCallback(() => {
    cancelledRef.current = true;
    clearTimers();
    if (recorderRef.current?.state === 'recording') {
      recorderRef.current.stop();
    }
    stopStream();
    const previousPlayback = previousPlaybackRef.current;
    setSpeed(previousPlayback?.speed ?? 1);
    setCurrentEventIndex(previousPlayback?.currentEventIndex ?? -1);
    setIsPlaying(previousPlayback?.isPlaying ?? false);
    setState({
      status: 'idle',
      progress: 0,
      message: 'Recording cancelled.',
      fileName: ''
    });
  }, [clearTimers, setCurrentEventIndex, setIsPlaying, setSpeed, stopStream]);

  const startRecording = useCallback(async (exportSpeed) => {
    if (state.status === 'recording' || state.status === 'saving') return;

    if (!visibleEvents.length) {
      setState({
        status: 'error',
        progress: 0,
        message: 'No visible routes to record.',
        fileName: ''
      });
      return;
    }

    if (typeof MediaRecorder === 'undefined') {
      setState({
        status: 'error',
        progress: 0,
        message: 'This browser cannot record canvas video.',
        fileName: ''
      });
      return;
    }

    const previousPlayback = {
      currentEventIndex,
      isPlaying,
      speed
    };
    previousPlaybackRef.current = previousPlayback;

    const speedValue = Number(exportSpeed) || 1;
    const totalDurationMs = Math.max(1400, Math.ceil((visibleEvents.length * SEGMENT_DURATION_MS) / speedValue) + 650);

    cancelledRef.current = false;
    setState({
      status: 'recording',
      progress: 0,
      message: 'Preparing route capture...',
      fileName: ''
    });

    try {
      setIsPlaying(false);
      setSpeed(speedValue);
      setCurrentEventIndex(visibleEvents[0].__sourceIndex);
      await delay(RECORDING_SETTLE_MS);
      await waitForPaint();
      if (cancelledRef.current) return;

      const canvas = globeRef.current?.getRecordingCanvas?.();
      if (!canvas?.captureStream) {
        throw new Error('The globe canvas is not available for recording.');
      }

      const stream = canvas.captureStream(FRAME_RATE);
      if (!stream.getVideoTracks().length) {
        throw new Error('No video track was produced by the globe canvas.');
      }

      streamRef.current = stream;
      const mimeType = pickVideoMimeType();
      const chunks = [];
      const recorder = new MediaRecorder(stream, mimeType ? { mimeType } : undefined);
      recorderRef.current = recorder;

      const stopped = new Promise((resolve, reject) => {
        recorder.ondataavailable = (event) => {
          if (event.data?.size) chunks.push(event.data);
        };
        recorder.onerror = () => reject(recorder.error || new Error('Recording failed.'));
        recorder.onstop = resolve;
      });

      const startedAt = Date.now();
      progressTimerRef.current = setInterval(() => {
        const elapsed = Date.now() - startedAt;
        setState(prev => ({
          ...prev,
          progress: Math.min(0.96, elapsed / totalDurationMs),
          message: `Recording ${visibleEvents.length} visible leg${visibleEvents.length === 1 ? '' : 's'} at ${speedValue}x...`
        }));
      }, 180);

      recorder.start(250);
      setIsPlaying(true);
      if (cancelledRef.current) {
        recorder.stop();
      }

      stopTimerRef.current = setTimeout(() => {
        if (recorder.state === 'recording') recorder.stop();
      }, totalDurationMs);

      await stopped;
      clearTimers();
      stopStream();
      setIsPlaying(false);

      if (cancelledRef.current) return;
      if (!chunks.length) throw new Error('The recording finished without video data.');

      setState(prev => ({
        ...prev,
        status: 'saving',
        progress: 0.98,
        message: 'Packaging video...'
      }));

      const blobType = mimeType || 'video/webm';
      const blob = new Blob(chunks, { type: blobType });
      const extension = getVideoExtension(blobType);
      const fileName = buildDownloadName(extension);
      const url = URL.createObjectURL(blob);
      const anchor = document.createElement('a');
      anchor.href = url;
      anchor.download = fileName;
      document.body.appendChild(anchor);
      anchor.click();
      anchor.remove();
      window.setTimeout(() => URL.revokeObjectURL(url), 1000);

      setState({
        status: 'complete',
        progress: 1,
        message: `${fileName} downloaded.`,
        fileName
      });
    } catch (error) {
      clearTimers();
      stopStream();
      setIsPlaying(false);
      setState({
        status: 'error',
        progress: 0,
        message: error.message || 'Could not record this simulation.',
        fileName: ''
      });
    } finally {
      recorderRef.current = null;
      if (!cancelledRef.current) {
        setSpeed(previousPlayback.speed);
        setCurrentEventIndex(previousPlayback.currentEventIndex);
        setIsPlaying(previousPlayback.isPlaying);
      }
      previousPlaybackRef.current = null;
    }
  }, [
    clearTimers,
    currentEventIndex,
    globeRef,
    isPlaying,
    setCurrentEventIndex,
    setIsPlaying,
    setSpeed,
    speed,
    state.status,
    stopStream,
    visibleEvents
  ]);

  return {
    ...state,
    isRecording: state.status === 'recording' || state.status === 'saving',
    startRecording,
    cancelRecording
  };
};
