import { useEffect, useId, useRef } from 'react';
import type { AudioSettings } from '../audio/audioSettings';

export interface AudioSettingsPanelProps {
  settings: AudioSettings;
  onChange: (settings: AudioSettings) => void;
  onClose: () => void;
}

interface VolumeControlProps {
  label: string;
  value: number;
  muted: boolean;
  onVolumeChange: (value: number) => void;
  onMutedChange: (muted: boolean) => void;
}

function VolumeControl({
  label,
  value,
  muted,
  onVolumeChange,
  onMutedChange,
}: VolumeControlProps) {
  const labelId = useId();
  const percentage = Math.round(value * 100);

  return (
    <section className={`audio-control${muted ? ' audio-control--muted' : ''}`}>
      <div className="audio-control__header">
        <label id={labelId} className="audio-control__label">
          {label}
        </label>
        <span className="audio-control__value" aria-hidden="true">
          {percentage}%
        </span>
        <button
          type="button"
          className="audio-control__mute"
          aria-pressed={muted}
          aria-label={`${muted ? '开启' : '静音'}${label}`}
          onClick={() => onMutedChange(!muted)}
        >
          {muted ? '已静音' : '静音'}
        </button>
      </div>
      <input
        className="audio-control__range"
        type="range"
        min="0"
        max="100"
        step="1"
        value={percentage}
        aria-labelledby={labelId}
        aria-valuetext={`${percentage}%${muted ? '，已静音' : ''}`}
        onChange={(event) => onVolumeChange(Number(event.currentTarget.value) / 100)}
      />
    </section>
  );
}

/** 音频设置弹层：打开后聚焦关闭按钮，Escape 可关闭。 */
export function AudioSettingsPanel({
  settings,
  onChange,
  onClose,
}: AudioSettingsPanelProps) {
  const closeRef = useRef<HTMLButtonElement>(null);
  const descriptionId = useId();

  useEffect(() => {
    closeRef.current?.focus();
    const onKeyDown = (event: KeyboardEvent) => {
      if (event.key !== 'Escape') return;
      event.preventDefault();
      onClose();
    };
    window.addEventListener('keydown', onKeyDown);
    return () => window.removeEventListener('keydown', onKeyDown);
  }, [onClose]);

  return (
    <div
      className="overlay audio-overlay"
      role="dialog"
      aria-modal="true"
      aria-labelledby="audio-settings-title"
      aria-describedby={descriptionId}
      onMouseDown={(event) => {
        if (event.target === event.currentTarget) onClose();
      }}
    >
      <div className="audio-panel">
        <button
          ref={closeRef}
          type="button"
          className="audio-panel__close"
          aria-label="关闭声音设置"
          onClick={onClose}
        >
          <svg viewBox="0 0 24 24" aria-hidden="true" focusable="false">
            <path
              d="m6.5 6.5 11 11m0-11-11 11"
              fill="none"
              stroke="currentColor"
              strokeWidth="2.2"
              strokeLinecap="round"
            />
          </svg>
        </button>
        <div className="audio-panel__icon" aria-hidden="true">
          <svg viewBox="0 0 32 32" focusable="false">
            <path d="M6 13h5l7-6v18l-7-6H6z" fill="currentColor" />
            <path
              d="M22 12.5a5 5 0 0 1 0 7M25 9a9.5 9.5 0 0 1 0 14"
              fill="none"
              stroke="currentColor"
              strokeWidth="2.2"
              strokeLinecap="round"
            />
          </svg>
        </div>
        <h2 id="audio-settings-title" className="audio-panel__title">
          声音设置
        </h2>
        <p id={descriptionId} className="audio-panel__text">
          音量会自动保存在当前设备。
        </p>

        <VolumeControl
          label="背景音乐"
          value={settings.musicVolume}
          muted={settings.musicMuted}
          onVolumeChange={(musicVolume) =>
            onChange({
              ...settings,
              musicVolume,
              musicMuted: musicVolume > 0 ? false : settings.musicMuted,
            })
          }
          onMutedChange={(musicMuted) => onChange({ ...settings, musicMuted })}
        />
        <VolumeControl
          label="游戏音效"
          value={settings.effectsVolume}
          muted={settings.effectsMuted}
          onVolumeChange={(effectsVolume) =>
            onChange({
              ...settings,
              effectsVolume,
              effectsMuted: effectsVolume > 0 ? false : settings.effectsMuted,
            })
          }
          onMutedChange={(effectsMuted) => onChange({ ...settings, effectsMuted })}
        />
      </div>
    </div>
  );
}
