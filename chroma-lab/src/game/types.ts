/** 颜色索引，对应 palette 下标 */
export type ColorId = number;

/**
 * 一个瓶子：色块数组，索引 0 为瓶底，最后一个元素为最上层液面。
 * 长度 <= 该瓶容量（普通瓶为 BOTTLE_CAPACITY，中央大瓶更大）。
 */
export type Bottle = ColorId[];

/** 整个牌面：瓶子数组，约定最后一个是中央大瓶 */
export type Board = Bottle[];

/**
 * 逐瓶容量表，下标与 Board 对齐。
 * 缺省（undefined 或越界）时按 BOTTLE_CAPACITY 处理，方便旧逻辑与测试沿用等容量牌面。
 */
export type Capacities = readonly number[];

/**
 * 未知色遮罩：`mask[瓶下标][层下标] === true` 表示该层颜色对玩家不可见。
 * 被遮的层只可能位于液面之下——一旦它成为顶层就立即揭晓，
 * 因此层下标在整局内保持稳定（液体只从顶部进出）。
 */
export type HiddenMask = boolean[][];

/** 一次倒液操作 */
export interface Move {
  from: number;
  to: number;
  /** 本次转移的色块数量 */
  amount: number;
  /** 转移的颜色 */
  color: ColorId;
}

/** 关卡配置 */
export interface LevelConfig {
  /** 关卡序号，从 1 开始 */
  level: number;
  /** 颜色种类数（含大瓶专属色） */
  colorCount: number;
  /** 额外空瓶数量（普通瓶） */
  emptyCount: number;
  /**
   * 中央大瓶容量。刻意取「4 的倍数 + 2」，
   * 于是专属色无法在普通瓶里凑成满瓶，只能全部倒进大瓶才算完成。
   */
  tallCapacity: number;
  /** 大瓶专属色：该色的总量等于大瓶容量 */
  tallColor: ColorId;
  /** 开局处于「未知色」状态的层数，靠倒空上层液体逐个揭晓 */
  hiddenCount: number;
}

/** 瓶子外观装饰类型：木塞 / 容量标签 */
export type BottleDecor = 'none' | 'cork' | 'label';

/** 瓶子造型：普通瓶 / 中央大瓶 */
export type BottleVariant = 'normal' | 'tall';
