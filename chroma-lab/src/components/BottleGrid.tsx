import { Bottle } from './Bottle';
import type { Board, BottleDecor, HiddenMask, Move } from '../game/types';
import type { PourAnimation } from '../game/useGame';

export interface BottleGridProps {
  board: Board;
  caps: number[];
  hidden: HiddenMask;
  tallIndex: number;
  decors: BottleDecor[];
  selected: number | null;
  hintMove: Move | null;
  rejected: number | null;
  pouring: PourAnimation | null;
  interactionLocked: boolean;
  onTapBottle: (index: number) => void;
}

/** 每侧列数：瓶子少时一侧 2 列（每行 4 个），多了改 3 列（每行 6 个） */
export function columnsPerSide(normalCount: number): number {
  return normalCount <= 8 ? 2 : 3;
}

/**
 * 把第 n 个普通瓶放到严格格点上。
 * 中间那一列（下标 cols + 1）留给中央大瓶，普通瓶按行优先跳过它。
 */
export function cellOf(
  order: number,
  cols: number
): { row: number; column: number } {
  const perRow = cols * 2;
  const row = Math.floor(order / perRow) + 1;
  const slot = order % perRow;
  // CSS Grid 列号从 1 开始；跳过中央列
  const column = slot < cols ? slot + 1 : slot + 2;
  return { row, column };
}

/**
 * 瓶阵布局：一张严格的 CSS Grid。
 *
 * 列 = 左侧 N 列 + 中央大瓶列 + 右侧 N 列，行高统一，瓶底对齐同一条基线，
 * 所以不管这一关有几个瓶子、最后一行是否填满，**行列都横平竖直**，
 * 不会出现「最后一行居中导致整列错位」的情况。
 * 中央大瓶用 grid-row: 1 / -1 贯穿所有行，视觉高度即它的容量。
 */
export function BottleGrid({
  board,
  caps,
  hidden,
  tallIndex,
  decors,
  selected,
  hintMove,
  rejected,
  pouring,
  interactionLocked,
  onTapBottle,
}: BottleGridProps) {
  const normalIndices = board
    .map((_, index) => index)
    .filter((index) => index !== tallIndex);
  const cols = columnsPerSide(normalIndices.length);
  const rows = Math.max(1, Math.ceil(normalIndices.length / (cols * 2)));

  const boardStyle = {
    // 列数 / 行数交给 CSS，瓶子尺寸由它们算出来，任何关卡规模都能一屏放下
    ['--side-cols' as string]: cols,
    ['--rows' as string]: rows,
    gridTemplateColumns: `repeat(${cols}, var(--bottle-w)) var(--tall-w) repeat(${cols}, var(--bottle-w))`,
    gridTemplateRows: `repeat(${rows}, var(--bottle-h))`,
  } as React.CSSProperties;

  const renderBottle = (index: number) => (
    <Bottle
      index={index}
      bottle={board[index]}
      capacity={caps[index]}
      variant={index === tallIndex ? 'tall' : 'normal'}
      hiddenLayers={hidden[index]}
      decor={decors[index] ?? 'none'}
      selected={selected === index}
      hintFrom={hintMove?.from === index}
      hintTo={hintMove?.to === index}
      rejected={rejected === index}
      pouringFrom={pouring?.from === index}
      disabled={interactionLocked}
      onTap={onTapBottle}
    />
  );

  return (
    <div className="board" style={boardStyle}>
      {normalIndices.map((index, order) => {
        const { row, column } = cellOf(order, cols);
        return (
          <div
            className="board__cell"
            key={index}
            style={{ gridRow: row, gridColumn: column }}
          >
            {renderBottle(index)}
          </div>
        );
      })}

      <div
        className="board__cell board__cell--center"
        style={{ gridRow: `1 / -1`, gridColumn: cols + 1 }}
      >
        {renderBottle(tallIndex)}
      </div>
    </div>
  );
}
