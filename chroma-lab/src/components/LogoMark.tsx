/**
 * Chroma Lab 标识 —— 完全自绘的原创图形，不使用任何第三方素材。
 *
 * 构图含义：
 * - 外框是化学六边形（实验室母题），暗示「试剂 / 分析」
 * - 内部三根高度递增的色柱 = 被分好类的三种液体，同时像一张微型柱状图
 * - 顶上一滴正在落下的液滴 = 正在进行的那一次倾倒
 *
 * 与参考产品那种「圆形徽章 + 斜体字」的路子刻意错开：六边形、直角色柱、
 * 单色描边，走的是实验器材的工业感而不是糖果感。
 */
export function LogoMark({ size = 44 }: { size?: number }) {
  return (
    <svg
      className="logo__mark"
      width={size}
      height={size}
      viewBox="0 0 48 48"
      role="img"
      aria-label="Chroma Lab 标识"
    >
      <defs>
        <linearGradient id="logo-hex" x1="0" y1="0" x2="1" y2="1">
          <stop offset="0%" stopColor="#4de3c8" />
          <stop offset="100%" stopColor="#2f8ff0" />
        </linearGradient>
      </defs>
      {/* 化学六边形外框 */}
      <path
        d="M24 3.4 41.8 13.7v20.6L24 44.6 6.2 34.3V13.7z"
        fill="rgba(8, 22, 38, 0.55)"
        stroke="url(#logo-hex)"
        strokeWidth="2.6"
        strokeLinejoin="round"
      />
      {/* 三根分好类的色柱 */}
      <rect x="14" y="27" width="5.4" height="10" rx="1.6" fill="#b9e04a" />
      <rect x="21.3" y="22" width="5.4" height="15" rx="1.6" fill="#ff5fa8" />
      <rect x="28.6" y="17.5" width="5.4" height="19.5" rx="1.6" fill="#ffc233" />
      {/* 正在落下的液滴 */}
      <path
        d="M24 8.4c2.6 2.9 3.9 4.9 3.9 6.4a3.9 3.9 0 0 1-7.8 0c0-1.5 1.3-3.5 3.9-6.4z"
        fill="#4de3c8"
      />
    </svg>
  );
}
