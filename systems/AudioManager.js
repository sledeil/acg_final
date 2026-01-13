import * as THREE from 'three';

/**
 * AudioManager - 负责音频管理（背景音乐、引擎声音）
 */
export class AudioManager {
  constructor(game) {
    this.game = game;

    // Audio components
    this.audioListener = null;
    this.backgroundMusic = null;
    this.engineSound = null;
    this.engineSoundBuffer = null;
    this.engineSoundStopTimer = null;

    // State
    this.isMuted = false;
  }

  /**
   * Setup audio system
   */
  setupAudio(camera) {
    if (!camera) return;

    // Attach audio listener to camera
    if (!this.audioListener) {
      this.audioListener = new THREE.AudioListener();
      camera.add(this.audioListener);

      // Unlock audio context (allow autoplay)
      const context = this.audioListener.context;
      if (context.state === 'suspended') {
        const unlockAudio = () => {
          context.resume().then(() => {
            console.log('Audio context unlocked');
            // If music is loaded but not playing, start it now
            if (this.backgroundMusic && !this.backgroundMusic.isPlaying) {
              this.startBackgroundMusic();
            }
          });
        };
        document.addEventListener('click', unlockAudio, { once: true });
        document.addEventListener('keydown', unlockAudio, { once: true });
        document.addEventListener('touchstart', unlockAudio, { once: true });
      }
    }

    // Load engine sound buffer
    const audioLoader = new THREE.AudioLoader();
    audioLoader.load(
      'assets/sound.wav',
      (buffer) => {
        this.engineSoundBuffer = buffer;
        this.engineSound = new THREE.Audio(this.audioListener);
        this.engineSound.setBuffer(buffer);
        this.engineSound.setLoop(false);
        this.engineSound.setVolume(0.45);
      },
      undefined,
      (err) => {
        console.warn('Engine sound load failed', err);
      }
    );

    // Load background music using HTML5 Audio for seamless looping
    this.backgroundMusic = new Audio('assets/music2.mp3');
    this.backgroundMusic.loop = true;
    this.backgroundMusic.volume = 0.5;
    this.backgroundMusic.preload = 'auto';

    // Listen for load complete event
    this.backgroundMusic.addEventListener('canplaythrough', () => {
      this.startBackgroundMusic();
    });

    // Handle load errors
    this.backgroundMusic.addEventListener('error', (err) => {
      console.warn('Background music load failed', err);
    });

    // Start loading audio
    this.backgroundMusic.load();
  }

  /**
   * Start background music
   */
  startBackgroundMusic() {
    if (!this.backgroundMusic) return;
    if (this.isMuted) return;

    const playPromise = this.backgroundMusic.play();

    if (playPromise !== undefined) {
      playPromise.catch(err => {
        console.log('Background music autoplay prevented, will play after user interaction');

        const playOnInteraction = () => {
          if (!this.isMuted) {
            this.backgroundMusic.play().catch(e => {
              console.warn('Background music play failed:', e);
            });
          }
        };
        document.addEventListener('click', playOnInteraction, { once: true });
        document.addEventListener('keydown', playOnInteraction, { once: true });
        document.addEventListener('touchstart', playOnInteraction, { once: true });
      });
    }
  }

  /**
   * Toggle mute/unmute
   */
  toggleMute() {
    this.isMuted = !this.isMuted;

    // Control background music
    if (this.backgroundMusic) {
      if (this.isMuted) {
        this.backgroundMusic.pause();
      } else {
        if (this.backgroundMusic.paused) {
          this.startBackgroundMusic();
        }
      }
    }

    // Control engine sound
    if (this.engineSound) {
      if (this.isMuted) {
        if (this.engineSound.isPlaying) {
          this.engineSound.stop();
        }
        if (this.engineSoundStopTimer) {
          clearTimeout(this.engineSoundStopTimer);
          this.engineSoundStopTimer = null;
        }
      }
    }

    console.log(`Audio ${this.isMuted ? 'muted' : 'unmuted'}`);
  }

  /**
   * Play engine sound (looping)
   */
  playEngineSound() {
    if (!this.engineSound || !this.engineSoundBuffer) return;
    if (this.isMuted) return;
    if (this.engineSound.isPlaying) return;

    this.engineSound.stop();
    this.engineSound.setLoop(true);

    // Start from 1 second mark to avoid initial burst
    const startOffset = Math.min(1.0, Math.max(0, this.engineSoundBuffer.duration - 0.01));
    this.engineSound.offset = startOffset;

    // Fade in to avoid sudden burst
    const ctx = this.audioListener.context;
    const gainNode = this.engineSound.gain;
    if (gainNode && gainNode.gain) {
      const now = ctx.currentTime;
      const fadeIn = 0.06;

      gainNode.gain.cancelScheduledValues(now);
      gainNode.gain.setValueAtTime(0, now);
      gainNode.gain.linearRampToValueAtTime(0.45, now + fadeIn);
    }

    this.engineSound.play();
  }

  /**
   * Stop engine sound
   */
  stopEngineSound() {
    if (this.engineSound && this.engineSound.isPlaying) {
      this.engineSound.stop();
    }
  }

  /**
   * Get muted state
   */
  isMutedState() {
    return this.isMuted;
  }
}
