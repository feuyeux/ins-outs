import { useEffect, useId, useRef } from 'react';

export type OverlayBadge = 'win' | 'stuck';

export interface OverlayCardProps {
  badge: OverlayBadge;
  title: string;
  text: string;
  actions: Array<{
    label: string;
    onClick: () => void;
    primary?: boolean;
    disabled?: boolean;
  }>;
}

/** 弹窗徽标：自绘 SVG，避免 emoji 在无字体环境下变成豆腐块 */
function BadgeIcon({ badge }: { badge: OverlayBadge }) {
  if (badge === 'win') {
    return (
      <svg viewBox="0 0 32 32" focusable="false">
        <path
          d="M7 20.5 13.2 26 25 9.5"
          fill="none"
          stroke="currentColor"
          strokeWidth="3.6"
          strokeLinecap="round"
          strokeLinejoin="round"
        />
      </svg>
    );
  }
  return (
    <svg viewBox="0 0 32 32" focusable="false">
      <path
        d="M16 6v14"
        fill="none"
        stroke="currentColor"
        strokeWidth="3.6"
        strokeLinecap="round"
      />
      <circle cx="16" cy="25.6" r="2.1" fill="currentColor" />
    </svg>
  );
}

/** 通用弹窗卡片，用于通关与死局；打开后把键盘焦点移到首要操作 */
export function OverlayCard({ badge, title, text, actions }: OverlayCardProps) {
  const primaryAction = actions.find((action) => action.primary) ?? actions[0];
  const initialFocusRef = useRef<HTMLButtonElement>(null);
  const descriptionId = useId();

  useEffect(() => {
    initialFocusRef.current?.focus();
  }, []);

  return (
    <div
      className="overlay"
      role="dialog"
      aria-modal="true"
      aria-label={title}
      aria-describedby={descriptionId}
    >
      <div className="card">
        <div
          className={`card__badge card__badge--${badge}`}
          aria-hidden="true"
        >
          <BadgeIcon badge={badge} />
        </div>
        <h2 className="card__title">{title}</h2>
        <p id={descriptionId} className="card__text">
          {text}
        </p>
        <div className="card__actions">
          {actions.map((action) => (
            <button
              key={action.label}
              ref={action === primaryAction ? initialFocusRef : undefined}
              type="button"
              className={action.primary ? 'btn btn--primary' : 'btn'}
              onClick={action.onClick}
              disabled={action.disabled}
            >
              {action.label}
            </button>
          ))}
        </div>
      </div>
    </div>
  );
}
