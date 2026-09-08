import { LogoMark } from './LogoMark';

export interface TopBarProps {
  level: number;
  moveCount: number;
  bestLevel: number;
  /** 0~1 的归位进度 */
  progress: number;
  /** 仍未揭晓的未知色层数 */
  hiddenLeft: number;
  canPrevLevel: boolean;
  canNextLevel: boolean;
  onPrevLevel: () => void;
  onNextLevel: () => void;
}

/**
 * 顶栏：原创标识 + 关卡状态 + 归位进度条 + 关卡切换。
 * 信息密度刻意压低——正在解的谜题在下面，顶栏只回答「第几关、进行到哪、还有多少未知」。
 */
export function TopBar({
  level,
  moveCount,
  bestLevel,
  progress,
  hiddenLeft,
  canPrevLevel,
  canNextLevel,
  onPrevLevel,
  onNextLevel,
}: TopBarProps) {
  const pct = Math.round(Math.min(1, Math.max(0, progress)) * 100);

  return (
    <header className="topbar">
      <div className="logo">
        <LogoMark />
        <span className="logo__text">
          <span className="logo__name">CHROMA</span>
          <span className="logo__sub">LAB</span>
        </span>
      </div>

      <div className="topbar__info">
        <div className="topbar__meta">
          <span className="chip chip--level">第 {level} 关</span>
          <span className="chip">{moveCount} 步</span>
          {hiddenLeft > 0 && (
            <span className="chip chip--unknown">未知 {hiddenLeft}</span>
          )}
          <span className="chip chip--ghost">最高 {bestLevel}</span>
        </div>
        <div
          className="topbar__progress"
          role="progressbar"
          aria-label="关卡完成进度"
          aria-valuenow={pct}
          aria-valuemin={0}
          aria-valuemax={100}
        >
          <span className="topbar__progress-fill" style={{ width: `${pct}%` }} />
        </div>
      </div>

      <div className="levelnav">
        <button
          type="button"
          className="levelnav__btn"
          onClick={onPrevLevel}
          disabled={!canPrevLevel}
          aria-label="上一关"
          title="上一关（快捷键 [ ）"
        >
          <svg viewBox="0 0 24 24" aria-hidden="true" focusable="false">
            <path
              d="M14.5 5.5 8 12l6.5 6.5"
              fill="none"
              stroke="currentColor"
              strokeWidth="2.4"
              strokeLinecap="round"
              strokeLinejoin="round"
            />
          </svg>
        </button>
        <button
          type="button"
          className="levelnav__btn"
          onClick={onNextLevel}
          disabled={!canNextLevel}
          aria-label="下一关"
          title="下一关（快捷键 ] ）"
        >
          <svg viewBox="0 0 24 24" aria-hidden="true" focusable="false">
            <path
              d="M9.5 5.5 16 12l-6.5 6.5"
              fill="none"
              stroke="currentColor"
              strokeWidth="2.4"
              strokeLinecap="round"
              strokeLinejoin="round"
            />
          </svg>
        </button>
      </div>
    </header>
  );
}
