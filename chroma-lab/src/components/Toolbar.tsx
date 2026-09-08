import type { Ref } from 'react';

export interface ToolbarProps {
  canUndo: boolean;
  disabled: boolean;
  audioMuted: boolean;
  audioButtonRef?: Ref<HTMLButtonElement>;
  onUndo: () => void;
  onRestart: () => void;
  onHint: () => void;
  onAudio: () => void;
}

/**
 * 底部操作栏：撤销 / 重玩 / 提示。
 * 图标全部是内联 SVG——emoji 在部分 Android WebView 与容器环境里没有字体，
 * 会渲染成方框豆腐块，自绘路径可以彻底避免。
 */
export function Toolbar({
  canUndo,
  disabled,
  audioMuted,
  audioButtonRef,
  onUndo,
  onRestart,
  onHint,
  onAudio,
}: ToolbarProps) {
  return (
    <nav className="toolbar">
      <button
        type="button"
        className="tool"
        onClick={onUndo}
        disabled={!canUndo || disabled}
        title="撤销（快捷键 U）"
      >
        <span className="tool__icon" aria-hidden="true">
          <svg viewBox="0 0 24 24" focusable="false">
            <path
              d="M4.8 10.5h9.4a4.9 4.9 0 0 1 0 9.8H8.6"
              fill="none"
              stroke="currentColor"
              strokeWidth="2.2"
              strokeLinecap="round"
            />
            <path
              d="M8.4 5.6 3.9 10.5l4.5 4.6"
              fill="none"
              stroke="currentColor"
              strokeWidth="2.2"
              strokeLinecap="round"
              strokeLinejoin="round"
            />
          </svg>
        </span>
        撤销
      </button>
      <button
        type="button"
        className="tool"
        onClick={onRestart}
        disabled={disabled}
        title="重玩（快捷键 R）"
      >
        <span className="tool__icon" aria-hidden="true">
          <svg viewBox="0 0 24 24" focusable="false">
            <path
              d="M19.4 12a7.4 7.4 0 1 1-2.6-5.6"
              fill="none"
              stroke="currentColor"
              strokeWidth="2.2"
              strokeLinecap="round"
            />
            <path
              d="M18.6 3.2v4.2h-4.2"
              fill="none"
              stroke="currentColor"
              strokeWidth="2.2"
              strokeLinecap="round"
              strokeLinejoin="round"
            />
          </svg>
        </span>
        重玩
      </button>
      <button
        type="button"
        className="tool tool--primary"
        onClick={onHint}
        disabled={disabled}
        title="提示（快捷键 H）"
      >
        <span className="tool__icon" aria-hidden="true">
          <svg viewBox="0 0 24 24" focusable="false">
            <path
              d="M12 3.6a5.9 5.9 0 0 1 3.6 10.6c-.6.5-1 1.2-1 2v.6H9.4v-.6c0-.8-.4-1.5-1-2A5.9 5.9 0 0 1 12 3.6z"
              fill="none"
              stroke="currentColor"
              strokeWidth="2.1"
              strokeLinejoin="round"
            />
            <path
              d="M9.9 19.7h4.2M10.7 21.8h2.6"
              fill="none"
              stroke="currentColor"
              strokeWidth="2.1"
              strokeLinecap="round"
            />
          </svg>
        </span>
        提示
      </button>
      <button
        ref={audioButtonRef}
        type="button"
        className="tool"
        onClick={onAudio}
        title="声音设置"
        aria-label={`声音设置${audioMuted ? '，当前已静音' : ''}`}
      >
        <span className="tool__icon" aria-hidden="true">
          <svg viewBox="0 0 24 24" focusable="false">
            <path
              d="M4.5 9h3.4l4.8-4v14l-4.8-4H4.5z"
              fill="none"
              stroke="currentColor"
              strokeWidth="2"
              strokeLinejoin="round"
            />
            {audioMuted ? (
              <path
                d="m16 9 4 6m0-6-4 6"
                fill="none"
                stroke="currentColor"
                strokeWidth="2"
                strokeLinecap="round"
              />
            ) : (
              <path
                d="M16 8.2a5.4 5.4 0 0 1 0 7.6M18.7 5.5a9 9 0 0 1 0 13"
                fill="none"
                stroke="currentColor"
                strokeWidth="2"
                strokeLinecap="round"
              />
            )}
          </svg>
        </span>
        声音
      </button>
    </nav>
  );
}
