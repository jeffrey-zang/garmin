import React, { useEffect, useRef, useState } from 'react';
import { View, Text, PermissionsAndroid, Platform } from 'react-native';
import { Camera, useCameraDevices } from 'react-native-vision-camera';
import Voice from '@react-native-voice/voice';
import { CameraRoll } from '@react-native-camera-roll/camera-roll';
import Sound from 'react-native-sound';

Sound.setCategory('Playback');

const playSound = (sound: 'A' | 'B' | 'C') => {
  console.log('started playing ' + sound);
  const soundFile = new Sound(
    'https://raw.githubusercontent.com/jeffrey-zang/garmin/main/assets/' +
      sound +
      '.mp3',
    undefined,
    error => {
      if (error) {
        console.log('failed to load the sound', error);
        return;
      }
      console.log(
        'duration in seconds: ' +
          soundFile.getDuration() +
          'number of channels: ' +
          soundFile.getNumberOfChannels(),
      );

      if (sound !== 'C') {
        soundFile.setVolume(2);
      }

      soundFile.play(success => {
        if (success) {
          console.log('successfully finished playing ' + sound);
        } else {
          console.log('playback failed due to audio decoding errors');
        }
        soundFile.release();
      });
    },
  );
};

export default function App() {
  const devices = useCameraDevices();
  const device = devices.find(d => d.position === 'back');
  const camera = useRef<Camera>(null);

  const [isRecording, setIsRecording] = useState<boolean>(false);
  const [isListeningForCommand, setIsListeningForCommand] =
    useState<boolean>(false);
  const [videoSegments, setVideoSegments] = useState<string[]>([]);
  const segmentDuration = 60; // seconds

  useEffect(() => {
    const requestPermissions = async () => {
      const cameraPermission = await Camera.requestCameraPermission();
      const micPermission = await Camera.requestMicrophonePermission();

      if (Platform.OS === 'android') {
        await PermissionsAndroid.request(
          PermissionsAndroid.PERMISSIONS.RECORD_AUDIO,
        );
      }

      console.log('Camera:', cameraPermission, 'Mic:', micPermission);
    };
    requestPermissions();
  }, []);

  useEffect(() => {
    Voice.onSpeechStart = () => console.log('Speech started ');
    Voice.onSpeechResults = (event: any) => {
      if (isListeningForCommand) {
        handleCommand(event);
      } else {
        handleWakeWord(event);
      }
    };

    return () => {
      Voice.destroy().then(Voice.removeAllListeners);
    };
  }, [isListeningForCommand]);

  const startListening = async () => {
    try {
      console.log(' Starting listener...');
      console.log(isRecording);
      await Voice.start('en-US');
    } catch (e) {
      console.error('Voice error:', e);
    }
  };

  const handleWakeWord = (event: any) => {
    if (!event.value) return;
    const transcript = event.value.join(' ').toLowerCase();
    console.log('Heard (wake word):', transcript);

    if (
      transcript.includes('ok garmin') ||
      transcript.includes('ok garin') ||
      transcript.includes('ok garmen') ||
      transcript.includes('ok garmen') ||
      transcript.includes('ok garmine') ||
      transcript.includes('ok garman') ||
      transcript.includes('ok karmin') ||
      transcript.includes('ok carmen') ||
      transcript.includes('ok karmen')
    ) {
      console.log('Wake word detected!');
      console.log('started playing A');
      playSound('A');

      setIsListeningForCommand(true);
    }
  };

  const handleCommand = (event: any) => {
    if (!event.value) return;
    const transcript = event.value.join(' ').toLowerCase();
    console.log('Heard (command):', transcript);

    if (transcript.includes('video')) {
      console.log('Saving video...');
      playSound('B');

      saveVideo();
    } else if (
      transcript.includes('nevermind') ||
      transcript.includes('cancel') ||
      transcript.includes('disregard')
    ) {
      console.log('Cancelled.');
      playSound('C');
    }

    setIsListeningForCommand(false);
  };

  useEffect(() => {
    if (device) {
      startListening();
      startRecording();
    }

    return () => {
      stopRecording();
    };
  }, [device]);

  const startRecording = async () => {
    if (!camera.current) return;

    console.log(' Start recording');
    setIsRecording(true);

    camera.current.startRecording({
      onRecordingFinished: video => {
        setVideoSegments(prev => [...prev, video.path]);
      },
      onRecordingError: error => console.error(error),
    });

    setTimeout(() => camera.current?.stopRecording(), segmentDuration * 1000);
  };

  const stopRecording = async () => {
    if (camera.current) {
      await camera.current.stopRecording();
    }
  };

  const saveVideo = async () => {
    try {
      const lastSegment = videoSegments[videoSegments.length - 1];
      if (!lastSegment) {
        console.log('No video segments to save.');
        return;
      }
      await CameraRoll.save(lastSegment, { type: 'video', album: 'Garmin' });
      console.log('Video saved to camera roll!');
    } catch (error) {
      console.error('Failed to save video:', error);
    }
  };

  if (device == null)
    return <Text style={{ margin: 'auto' }}>Loading camera...</Text>;

  return (
    <View style={{ flex: 1 }}>
      <Camera
        ref={camera}
        style={{ flex: 1 }}
        device={device}
        isActive={true}
        video={true}
        audio={true}
      />
    </View>
  );
}
