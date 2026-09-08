import { UNKNOWN_COLOR, getColor } from '../game/colors';
import { BOTTLE_CAPACITY, isBottleComplete } from '../game/logic';
import type {
  Bottle as BottleModel,
  BottleDecor,
  BottleVariant,
} from '../game/types';

export interface BottleProps {
  bottle: BottleModel;
  index: number;
  /** 该瓶容量，中央大瓶远大于普通瓶 */
  capacity?: number;
  /** 造型：普通瓶或中央大瓶 */
  variant?: BottleVariant;
  /** 逐层未知色标记，与 bottle 同长 */
  hiddenLayers?: boolean[];
  selected: boolean;
  decor: BottleDecor;
  hintFrom: boolean;
  hintTo: boolean;
  rejected: boolean;
  pouringFrom: boolean;
  disabled: boolean;
  onTap: (index: number) => void;
}

/** 瓶壁刻度：每 1/容量 高度画一道细线，纯 CSS 渐变，一个元素搞定 */
function tickBackground(capacity: number): string {
  return `repeating-linear-gradient(to top, rgba(255, 255, 255, 0.22) 0 1px, transparent 1px calc(100% / ${capacity}))`;
}

/**
 * 试剂瓶：瓶口环 + 瓶颈 + 刻度瓶身 + 液体层 + 高光 + 可选装饰。
 * 液体自底向上堆叠（flex column-reverse），每层高度按容量等分，
 * 因此同一个组件既能画 4 层的普通瓶，也能画十几层的中央大瓶。
 * 未揭晓的层画成毛玻璃灰并标「?」，装满同色后瓶口会盖上封签。
 */
export function Bottle({
  bottle,
  index,
  capacity = BOTTLE_CAPACITY,
  variant = 'normal',
  hiddenLayers,
  selected,
  decor,
  hintFrom,
  hintTo,
  rejected,
  pouringFrom,
  disabled,
  onTap,
}: BottleProps) {
  const tall = variant === 'tall';
  const complete = isBottleComplete(bottle, capacity);
  const topIndex = bottle.length - 1;
  const unknownLeft = (hiddenLayers ?? []).filter(Boolean).length;

  const classNames = [
    'bottle',
    tall && 'bottle--tall',
    selected && 'bottle--selected',
    complete && 'bottle--complete',
    hintFrom && 'bottle--hint-from',
    hintTo && 'bottle--hint-to',
    rejected && 'bottle--rejected',
    pouringFrom && 'bottle--pouring-from',
  ]
    .filter(Boolean)
    .join(' ');

  const name = tall ? '中央大瓶' : `第 ${index + 1} 个瓶子`;
  const unknownNote = unknownLeft > 0 ? `，含 ${unknownLeft} 层未知色` : '';
  const label = complete
    ? `${name}，已完成`
    : bottle.length === 0
      ? `${name}，空瓶，容量 ${capacity} 层`
      : `${name}，${bottle.length} / ${capacity} 层液体，顶层颜色 ${
          getColor(bottle[topIndex]).label
        }${unknownNote}`;

  return (
    <button
      type="button"
      className={classNames}
      onClick={() => onTap(index)}
      disabled={disabled}
      aria-label={label}
      aria-pressed={selected}
    >
      <span className="bottle__lip" aria-hidden="true" />
      <span className="bottle__neck" aria-hidden="true" />
      {decor === 'cork' && <span className="bottle__cork" aria-hidden="true" />}
      {decor === 'label' && (
        <span className="bottle__label" aria-hidden="true">
          {capacity}
        </span>
      )}

      <span className="bottle__glass" aria-hidden="true">
        {bottle.map((colorId, layerIndex) => {
          const unknown = hiddenLayers?.[layerIndex] === true;
          const color = unknown ? UNKNOWN_COLOR : getColor(colorId);
          const isTop = layerIndex === topIndex;
          return (
            <span
              key={`${layerIndex}-${unknown ? 'x' : colorId}`}
              className={unknown ? 'layer layer--unknown' : 'layer'}
              style={{
                height: `calc(100% / ${capacity})`,
                background: `linear-gradient(90deg, ${color.dark} 0%, ${color.main} 26%, ${color.light} 48%, ${color.main} 72%, ${color.dark} 100%)`,
              }}
            >
              {unknown && <span className="layer__mark">?</span>}
              {isTop && !unknown && (
                <span
                  className="layer__surface"
                  style={{ background: color.light }}
                />
              )}
            </span>
          );
        })}
        <span
          className="bottle__ticks"
          style={{ backgroundImage: tickBackground(capacity) }}
        />
      </span>

      <span className="bottle__gloss" aria-hidden="true" />
      <span className="bottle__gloss bottle__gloss--right" aria-hidden="true" />

      {complete && (
        <span className="bottle__seal" aria-hidden="true">
          <svg viewBox="0 0 24 24" focusable="false">
            <path
              d="M4.5 12.8 9.4 17.6 19.5 7.2"
              fill="none"
              stroke="currentColor"
              strokeWidth="3.4"
              strokeLinecap="round"
              strokeLinejoin="round"
            />
          </svg>
        </span>
      )}
    </button>
  );
}
