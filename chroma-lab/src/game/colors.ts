/**
 * 试剂调色板 —— Chroma Lab 自有配色。
 *
 * 设计约束（不是随便挑好看的颜色）：
 * - 10 种色在色轮上尽量等距，且相邻编号不相邻上色，减少「同关卡出现两种近似色」的误判
 * - 明度统一压在中高档，保证在深色玻璃背景上都够跳
 * - 每色给出 main / light / dark 三档，用于液体主体、液面高光与瓶壁阴影，
 *   模拟圆柱体受光，无需任何图片资源
 * - 色相之外还有明度差：即使色觉障碍玩家分不清色相，也能靠明暗排序（后续色盲模式的基础）
 */
export interface LiquidColor {
  id: number;
  name: string;
  /** 中文可读名，用于无障碍朗读与操作播报 */
  label: string;
  main: string;
  light: string;
  dark: string;
}

export const PALETTE: LiquidColor[] = [
  { id: 0, name: 'acid', label: '酸柠', main: '#b9e04a', light: '#d3ee7c', dark: '#8fb625' },
  { id: 1, name: 'rose', label: '玫红', main: '#ff5fa8', light: '#ff8fc4', dark: '#d43a81' },
  { id: 2, name: 'iris', label: '鸢紫', main: '#6f5cf0', light: '#9384f7', dark: '#4d3ac6' },
  { id: 3, name: 'amber', label: '琥珀', main: '#ffc233', light: '#ffd873', dark: '#d99a12' },
  { id: 4, name: 'azure', label: '晴蓝', main: '#35a8f5', light: '#6ec4fa', dark: '#1a80c9' },
  { id: 5, name: 'ember', label: '炭橙', main: '#ff8a3d', light: '#ffab74', dark: '#d9631c' },
  { id: 6, name: 'jade', label: '翡翠', main: '#24d3bb', light: '#5ee6d4', dark: '#0fa792' },
  { id: 7, name: 'coral', label: '珊瑚', main: '#ff5b5b', light: '#ff8888', dark: '#d13636' },
  { id: 8, name: 'orchid', label: '兰花', main: '#a05cf0', light: '#bd8bf7', dark: '#7a37c6' },
  { id: 9, name: 'mint', label: '薄荷', main: '#5be08a', light: '#8aeeae', dark: '#31b862' },
];

/** 可用颜色上限 */
export const MAX_COLORS = PALETTE.length;

export function getColor(id: number): LiquidColor {
  return PALETTE[id % PALETTE.length];
}

/** 未知色（尚未揭晓）的呈现色，刻意做成低饱和的「毛玻璃灰」，与任何试剂色都不冲突 */
export const UNKNOWN_COLOR: LiquidColor = {
  id: -1,
  name: 'unknown',
  label: '未知色',
  main: '#5a6684',
  light: '#77849f',
  dark: '#3f4a63',
};
