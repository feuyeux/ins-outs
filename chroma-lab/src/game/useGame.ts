import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import {
  describeHint,
  describeLevelStart,
  describeMove,
  describeStatus,
} from './announce';
import {
  cloneMask,
  hiddenRemaining,
  moveVisibleLayers,
  revealSurfaced,
  withExtraRow,
} from './hidden';
import {
  buildHiddenMask,
  capacitiesFor,
  generateLevel,
  getBottleDecors,
  getLevelConfig,
} from './levelGenerator';
import {
  canPour,
  cloneBoard,
  isDeadlock,
  isSolved,
  pour,
  progressRatio,
  withExtraBottle,
} from './logic';
import { hint as computeHint } from './solver';
import { createPendingCommit, type PendingCommit } from './pendingCommit';
import { loadProgress, saveProgress } from './storage';
import type { Board, HiddenMask, Move } from './types';

export interface PourAnimation {
  from: number;
  to: number;
  move: Move;
  /** 动画唯一标识，用于 React key 重置 */
  token: number;
}

/** 每关最多可以救援（加瓶）几次 */
export const MAX_RESCUE = 1;

export interface GameState {
  level: number;
  bestLevel: number;
  board: Board;
  /** 逐瓶容量表，最后一项是中央大瓶 */
  caps: number[];
  /** 未知色遮罩，与 board 同形 */
  hidden: HiddenMask;
  /** 仍未揭晓的未知层数 */
  hiddenLeft: number;
  /** 中央大瓶下标 */
  tallIndex: number;
  /** 中央大瓶容量 */
  tallCapacity: number;
  selected: number | null;
  moveCount: number;
  solved: boolean;
  deadlock: boolean;
  progress: number;
  canUndo: boolean;
  /** 本关还能否用「加一个瓶子」救援 */
  canRescue: boolean;
  /** 是否可以回到上一关 */
  canPrevLevel: boolean;
  /** 是否可以前往下一关（不超过已解锁进度） */
  canNextLevel: boolean;
  decors: ReturnType<typeof getBottleDecors>;
  hintMove: Move | null;
  pouring: PourAnimation | null;
  /** 无法倒入时被拒绝的瓶子索引，用于抖动反馈 */
  rejected: number | null;
  /** 供屏幕阅读器播报的最新操作结果 */
  announcement: string;
}

export interface GameActions {
  tapBottle: (index: number) => void;
  undo: () => void;
  restart: () => void;
  nextLevel: () => void;
  prevLevel: () => void;
  gotoLevel: (level: number) => void;
  requestHint: () => void;
  clearHint: () => void;
  clearSelection: () => void;
  /** 死局救援：在中央大瓶之前插入一个空瓶 */
  rescueWithBottle: () => void;
}

const POUR_ANIM_MS = 420;

export function prefersReducedMotion(): boolean {
  return (
    typeof window !== 'undefined' &&
    typeof window.matchMedia === 'function' &&
    window.matchMedia('(prefers-reduced-motion: reduce)').matches
  );
}

/** 一次撤销所需的完整状态；救援快照额外记录插入位置 */
export type Snapshot = {
  board: Board;
  hidden: HiddenMask;
  moveCount: number;
  rescued: number;
} & (
  | { kind: 'pour' }
  | { kind: 'rescue'; insertAt: number }
);

/**
 * 恢复历史快照，同时保持未知层揭晓的单调性。
 * 救援会插入一行空遮罩，比较揭晓状态前需先移除该行。
 */
export function restoreSnapshot(
  snapshot: Snapshot,
  currentHidden: HiddenMask
): Pick<Snapshot, 'board' | 'hidden' | 'moveCount' | 'rescued'> {
  const comparable = cloneMask(currentHidden);
  if (snapshot.kind === 'rescue') comparable.splice(snapshot.insertAt, 1);

  const restoredHidden = snapshot.hidden.map((row, bottle) =>
    row.map(
      (wasHidden, layer) =>
        wasHidden && comparable[bottle]?.[layer] !== false
    )
  );

  return {
    board: snapshot.board,
    hidden: restoredHidden,
    moveCount: snapshot.moveCount,
    rescued: snapshot.rescued,
  };
}

export function useGame(): GameState & GameActions {
  const initial = useMemo(() => loadProgress(), []);
  const [level, setLevel] = useState(initial.level);
  const [bestLevel, setBestLevel] = useState(initial.bestLevel);
  // 存档中若留有未完成的合法牌面则直接续玩，否则按关卡号生成
  const [board, setBoard] = useState<Board>(
    () => initial.board ?? generateLevel(initial.level)
  );
  const [hidden, setHidden] = useState<HiddenMask>(
    () =>
      initial.hidden ??
      buildHiddenMask(initial.board ?? generateLevel(initial.level), initial.level)
  );
  const [rescued, setRescued] = useState(initial.rescued);
  const [history, setHistory] = useState<Snapshot[]>([]);
  const [selected, setSelected] = useState<number | null>(null);
  const [moveCount, setMoveCount] = useState(initial.moveCount);
  const [hintMove, setHintMove] = useState<Move | null>(null);
  const [pouring, setPouring] = useState<PourAnimation | null>(null);
  const [rejected, setRejected] = useState<number | null>(null);
  const [announcement, setAnnouncement] = useState('');
  const rejectTimer = useRef<number | null>(null);
  const tokenRef = useRef(0);
  /** 倒液动画期间尚未落定的一步，支持定时提交与提前结算 */
  const pendingPour = useRef<PendingCommit>();
  if (!pendingPour.current) pendingPour.current = createPendingCommit();

  // 卸载时清理待提交动作与计时器，避免内存泄漏
  useEffect(() => {
    const pending = pendingPour.current;
    return () => {
      pending?.cancel();
      if (rejectTimer.current !== null) window.clearTimeout(rejectTimer.current);
    };
  }, []);

  /**
   * iOS WKWebView 与 Android WebView 在应用切后台时会挂起定时器。
   * 若此时正播放倒液动画，界面会停在锁定状态，且这一步尚未写入存档。
   * 因此在页面隐藏或卸载前立即结算待提交的一步，保证状态与存档一致。
   */
  useEffect(() => {
    if (typeof document === 'undefined') return;

    const flush = () => pendingPour.current?.flush();
    const onVisibilityChange = () => {
      if (document.visibilityState === 'hidden') flush();
    };

    document.addEventListener('visibilitychange', onVisibilityChange);
    window.addEventListener('pagehide', flush);
    return () => {
      document.removeEventListener('visibilitychange', onVisibilityChange);
      window.removeEventListener('pagehide', flush);
    };
  }, []);

  const caps = useMemo(
    () => capacitiesFor(level, board.length),
    [level, board.length]
  );
  const tallIndex = caps.length - 1;
  const tallCapacity = caps[tallIndex];
  const solved = useMemo(() => isSolved(board, caps), [board, caps]);
  const deadlock = useMemo(() => isDeadlock(board, caps), [board, caps]);
  const progress = useMemo(() => progressRatio(board), [board]);
  const hiddenLeft = useMemo(() => hiddenRemaining(hidden), [hidden]);
  const decors = useMemo(
    () => getBottleDecors(level, board.length),
    [level, board.length]
  );

  // 通关后解锁下一关
  useEffect(() => {
    if (!solved) return;
    setBestLevel((prev) => Math.max(prev, level + 1));
  }, [solved, level]);

  // 单一存档出口：关卡、进度与牌面变化后统一落盘
  useEffect(() => {
    saveProgress({ level, bestLevel, board, hidden, moveCount, rescued });
  }, [level, bestLevel, board, hidden, moveCount, rescued]);

  // 通关与死局状态播报
  useEffect(() => {
    const status = describeStatus({ level, moveCount, solved, deadlock });
    if (status) setAnnouncement(status);
  }, [level, moveCount, solved, deadlock]);

  const loadLevel = useCallback((target: number) => {
    const safe = Number.isFinite(target)
      ? Math.max(1, Math.floor(target))
      : 1;
    // 丢弃尚未提交的倒液，避免旧关卡的一步覆盖新牌面
    pendingPour.current?.cancel();
    if (rejectTimer.current !== null) window.clearTimeout(rejectTimer.current);
    rejectTimer.current = null;
    const nextBoard = generateLevel(safe);
    const config = getLevelConfig(safe);
    setLevel(safe);
    setBoard(nextBoard);
    setHidden(buildHiddenMask(nextBoard, safe, config.hiddenCount));
    setRescued(0);
    setHistory([]);
    setSelected(null);
    setMoveCount(0);
    setHintMove(null);
    setPouring(null);
    setRejected(null);
    setAnnouncement(
      describeLevelStart(safe, config.tallCapacity, config.hiddenCount)
    );
  }, []);

  const flashRejected = useCallback((index: number) => {
    setRejected(index);
    if (rejectTimer.current !== null) window.clearTimeout(rejectTimer.current);
    rejectTimer.current = window.setTimeout(() => setRejected(null), 320);
  }, []);

  const tapBottle = useCallback(
    (index: number) => {
      if (solved || pouring) return;
      setHintMove(null);

      // 首次点击：选中源瓶（空瓶不可作为源）
      if (selected === null) {
        if (board[index].length === 0) {
          flashRejected(index);
          return;
        }
        setSelected(index);
        return;
      }

      // 再次点击同一瓶：取消选中
      if (selected === index) {
        setSelected(null);
        return;
      }

      if (!canPour(board, selected, index, caps)) {
        flashRejected(index);
        setSelected(null);
        return;
      }

      const result = pour(board, selected, index, caps, hidden);
      if (!result) {
        flashRejected(index);
        setSelected(null);
        return;
      }

      const snapshot: Snapshot = {
        kind: 'pour',
        board: cloneBoard(board),
        hidden: cloneMask(hidden),
        moveCount,
        rescued,
      };
      const commitMove = () => {
        const movedMask = moveVisibleLayers(
          hidden,
          selected,
          index,
          result.move.amount
        );
        // 倒空上层液体后，浮到液面的未知层立即揭晓
        const revealed = revealSurfaced(result.board, movedMask);
        setHistory((prev) => [...prev, snapshot]);
        setBoard(result.board);
        setHidden(revealed.mask);
        setMoveCount((prev) => prev + 1);
        setPouring(null);
        setAnnouncement(describeMove(result.move, tallIndex, revealed.revealed));
      };
      setSelected(null);

      if (prefersReducedMotion()) {
        commitMove();
        return;
      }

      const token = ++tokenRef.current;
      setPouring({ from: selected, to: index, move: result.move, token });

      // 动画结束后再提交牌面，视觉上液体先流动再落位
      pendingPour.current?.schedule(commitMove, POUR_ANIM_MS);
    },
    [
      board,
      hidden,
      caps,
      tallIndex,
      selected,
      solved,
      pouring,
      moveCount,
      rescued,
      flashRejected,
    ]
  );

  const undo = useCallback(() => {
    if (pouring || history.length === 0) return;
    const last = history[history.length - 1];
    const restored = restoreSnapshot(last, hidden);
    setBoard(restored.board);
    setHidden(restored.hidden);
    setMoveCount(restored.moveCount);
    setRescued(restored.rescued);
    setSelected(null);
    setHintMove(null);
    setHistory(history.slice(0, -1));
    setAnnouncement(last.kind === 'rescue' ? '已撤销加瓶' : '已撤销一步');
  }, [pouring, history, hidden]);

  const restart = useCallback(() => {
    loadLevel(level);
  }, [level, loadLevel]);

  /**
   * 死局救援：在中央大瓶之前插入一个空的普通瓶。
   * 成熟产品里这一步是付费点（金币换瓶子），本作没有经济系统，
   * 因此改为每关免费 1 次——既保证「卡住不等于重来」，又不让它变成万能解。
   */
  const rescueWithBottle = useCallback(() => {
    if (pouring || rescued >= MAX_RESCUE) return;
    const insertAt = board.length - 1;
    const snapshot: Snapshot = {
      kind: 'rescue',
      insertAt,
      board: cloneBoard(board),
      hidden: cloneMask(hidden),
      moveCount,
      rescued,
    };

    setHistory((prev) => [...prev, snapshot]);
    setBoard(withExtraBottle(board, insertAt));
    setHidden(withExtraRow(hidden, insertAt));
    setRescued((count) => count + 1);
    setSelected(null);
    setHintMove(null);
    setAnnouncement('已加入一个空瓶');
  }, [board, hidden, pouring, moveCount, rescued]);

  const nextLevel = useCallback(() => {
    if (deadlock) return;
    const target = level + 1;
    // 可以重访已经解锁的下一关；只有当前关卡已解开时才允许解锁新关卡
    if (!solved && target > bestLevel) {
      setAnnouncement(`第 ${target} 关尚未解锁`);
      return;
    }
    loadLevel(target);
  }, [level, solved, deadlock, bestLevel, loadLevel]);

  const prevLevel = useCallback(() => {
    if (level <= 1 || deadlock) return;
    loadLevel(level - 1);
  }, [level, deadlock, loadLevel]);

  const gotoLevel = useCallback(
    (target: number) => {
      const safe = Number.isFinite(target)
        ? Math.max(1, Math.floor(target))
        : 1;
      if (safe > bestLevel) {
        setAnnouncement(`第 ${safe} 关尚未解锁`);
        return;
      }
      if (deadlock) return;
      loadLevel(safe);
    },
    [bestLevel, deadlock, loadLevel]
  );

  const requestHint = useCallback(() => {
    if (solved || pouring) return;
    const move = computeHint(board, caps);
    setHintMove(move);
    setAnnouncement(describeHint(move, tallIndex));
  }, [board, caps, tallIndex, solved, pouring]);

  const clearHint = useCallback(() => setHintMove(null), []);
  const clearSelection = useCallback(() => setSelected(null), []);

  return {
    level,
    bestLevel,
    board,
    caps,
    hidden,
    hiddenLeft,
    tallIndex,
    tallCapacity,
    selected,
    moveCount,
    solved,
    deadlock,
    progress,
    canUndo: history.length > 0 && !pouring,
    canRescue: rescued < MAX_RESCUE && !pouring,
    canPrevLevel: level > 1 && !pouring && !deadlock,
    canNextLevel: level < bestLevel && !pouring && !deadlock,
    decors,
    hintMove,
    pouring,
    rejected,
    announcement,
    tapBottle,
    undo,
    restart,
    nextLevel,
    prevLevel,
    gotoLevel,
    requestHint,
    clearHint,
    clearSelection,
    rescueWithBottle,
  };
}

export { getLevelConfig };
