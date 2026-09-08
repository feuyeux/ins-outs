import { useCallback, useEffect, useRef, useState } from 'react';
import {
  effectiveAudioLevels,
  loadAudioSettings,
  saveAudioSettings,
} from './audio/audioSettings';
import { useAudioFeedback } from './audio/useAudioFeedback';
import { AudioSettingsPanel } from './components/AudioSettingsPanel';
import { BottleGrid } from './components/BottleGrid';
import { OverlayCard } from './components/OverlayCard';
import { Toolbar } from './components/Toolbar';
import { TopBar } from './components/TopBar';
import { useGame } from './game/useGame';

export default function App() {
  const game = useGame();
  const [audioSettings, setAudioSettings] = useState(loadAudioSettings);
  const [audioPanelOpen, setAudioPanelOpen] = useState(false);
  const audioLevels = effectiveAudioLevels(audioSettings);
  const audio = useAudioFeedback(game, audioLevels);
  const soundButtonRef = useRef<HTMLButtonElement>(null);
  const closeAudioPanel = useCallback(() => {
    setAudioPanelOpen(false);
    window.requestAnimationFrame(() => soundButtonRef.current?.focus());
  }, []);
  const interactionLocked =
    game.solved || game.deadlock || game.pouring !== null || audioPanelOpen;

  // 保存最新的游戏动作，让键盘监听只注册一次，避免每次渲染反复解绑重绑
  const gameRef = useRef(game);
  gameRef.current = game;
  const audioRef = useRef(audio);
  audioRef.current = audio;
  const lockedRef = useRef(interactionLocked);
  lockedRef.current = interactionLocked;
  const audioPanelOpenRef = useRef(audioPanelOpen);
  audioPanelOpenRef.current = audioPanelOpen;

  useEffect(() => {
    saveAudioSettings(audioSettings);
  }, [audioSettings]);

  // 键盘快捷键：桌面端无需鼠标即可完成全部核心操作
  useEffect(() => {
    function onKeyDown(event: KeyboardEvent) {
      if (event.metaKey || event.ctrlKey || event.altKey) return;
      if (audioPanelOpenRef.current) return;

      const target = event.target as HTMLElement | null;
      if (target?.tagName === 'INPUT' || target?.tagName === 'TEXTAREA') return;

      const current = gameRef.current;

      switch (event.key) {
        case 'Escape':
          current.clearSelection();
          current.clearHint();
          break;
        case 'u':
        case 'U':
        case 'z':
        case 'Z':
          if (current.canUndo) {
            audioRef.current.play('undo');
            current.undo();
          }
          break;
        case 'r':
        case 'R':
          audioRef.current.play('restart');
          current.restart();
          break;
        case 'h':
        case 'H':
          if (!lockedRef.current) {
            audioRef.current.play('hint');
            current.requestHint();
          }
          break;
        case '[':
          if (current.canPrevLevel) {
            audioRef.current.play('navigate');
            current.prevLevel();
          }
          break;
        case ']':
          if (current.canNextLevel) {
            audioRef.current.play('navigate');
            current.nextLevel();
          }
          break;
        default:
          return;
      }
      event.preventDefault();
    }

    window.addEventListener('keydown', onKeyDown);
    return () => window.removeEventListener('keydown', onKeyDown);
  }, []);

  return (
    <div className="app">
      <div className="app__backdrop" aria-hidden="true" />

      <TopBar
        level={game.level}
        moveCount={game.moveCount}
        bestLevel={game.bestLevel}
        progress={game.progress}
        hiddenLeft={game.hiddenLeft}
        canPrevLevel={game.canPrevLevel}
        canNextLevel={game.canNextLevel}
        onPrevLevel={() => {
          audio.play('navigate');
          game.prevLevel();
        }}
        onNextLevel={() => {
          audio.play('navigate');
          game.nextLevel();
        }}
      />

      <main className="app__stage">
        <BottleGrid
          board={game.board}
          caps={game.caps}
          hidden={game.hidden}
          tallIndex={game.tallIndex}
          decors={game.decors}
          selected={game.selected}
          hintMove={game.hintMove}
          rejected={game.rejected}
          pouring={game.pouring}
          interactionLocked={interactionLocked}
          onTapBottle={game.tapBottle}
        />
      </main>

      {/* 操作结果播报，仅对屏幕阅读器可见 */}
      <p className="sr-only" role="status" aria-live="polite">
        {game.announcement}
      </p>

      <Toolbar
        canUndo={game.canUndo}
        disabled={interactionLocked}
        audioMuted={audioLevels.music === 0 && audioLevels.effects === 0}
        audioButtonRef={soundButtonRef}
        onUndo={() => {
          audio.play('undo');
          game.undo();
        }}
        onRestart={() => {
          audio.play('restart');
          game.restart();
        }}
        onHint={() => {
          audio.play('hint');
          game.requestHint();
        }}
        onAudio={() => {
          audio.play('select');
          setAudioPanelOpen(true);
        }}
      />

      {game.solved && (
        <OverlayCard
          badge="win"
          title="全部归位"
          text={`第 ${game.level} 关完成，共用 ${game.moveCount} 步。`}
          actions={[
            {
              label: '再玩一次',
              onClick: () => {
                audio.play('restart');
                game.restart();
              },
            },
            {
              label: '下一关',
              onClick: () => {
                audio.play('navigate');
                game.nextLevel();
              },
              primary: true,
            },
          ]}
        />
      )}

      {game.deadlock && !game.solved && (
        <OverlayCard
          badge="stuck"
          title="没有可行的倒法了"
          text={
            game.canRescue
              ? '可以撤销一步、重新开始，或者领取一个空瓶继续（每关限一次）。'
              : '本关的空瓶已经用掉了，撤销一步或重新开始试试。'
          }
          actions={[
            {
              label: '撤销一步',
              onClick: () => {
                audio.play('undo');
                game.undo();
              },
              disabled: !game.canUndo,
            },
            {
              label: '加一个瓶子',
              onClick: () => {
                audio.play('rescue');
                game.rescueWithBottle();
              },
              disabled: !game.canRescue,
              primary: game.canRescue,
            },
            {
              label: '重新开始',
              onClick: () => {
                audio.play('restart');
                game.restart();
              },
              primary: !game.canRescue,
            },
          ]}
        />
      )}

      {audioPanelOpen && (
        <AudioSettingsPanel
          settings={audioSettings}
          onChange={setAudioSettings}
          onClose={closeAudioPanel}
        />
      )}
    </div>
  );
}
