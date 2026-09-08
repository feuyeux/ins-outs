/** 定时器注入点，便于测试与 SSR 安全降级 */
export interface Scheduler {
  setTimeout: (callback: () => void, delayMs: number) => number;
  clearTimeout: (id: number) => void;
}

export const defaultScheduler: Scheduler = {
  setTimeout: (callback, delayMs) =>
    typeof window === 'undefined' ? 0 : window.setTimeout(callback, delayMs),
  clearTimeout: (id) => {
    if (typeof window !== 'undefined') window.clearTimeout(id);
  },
};

export interface PendingCommit {
  /** 安排一次延迟提交，替换任何尚未执行的提交 */
  schedule: (commit: () => void, delayMs: number) => void;
  /** 立即执行待提交动作（应用切后台时使用） */
  flush: () => void;
  /** 丢弃待提交动作（切换关卡或卸载时使用） */
  cancel: () => void;
  isPending: () => boolean;
}

/**
 * 延迟提交控制器。
 * 倒液动画结束才写入牌面，但移动端 WebView 会在切后台时挂起定时器，
 * 因此需要一个能被「提前结算」的入口。核心约束是**恰好执行一次**：
 * 定时器与手动 flush 竞争时不能重复提交，也不能丢步。
 */
export function createPendingCommit(
  scheduler: Scheduler = defaultScheduler
): PendingCommit {
  let timer: number | null = null;
  let pending: (() => void) | null = null;

  function clearTimer(): void {
    if (timer !== null) {
      scheduler.clearTimeout(timer);
      timer = null;
    }
  }

  function take(): (() => void) | null {
    const commit = pending;
    pending = null;
    clearTimer();
    return commit;
  }

  return {
    schedule(commit, delayMs) {
      // 新的提交到来时丢弃旧的，避免同时存在两个待提交动作
      pending = null;
      clearTimer();
      pending = commit;
      timer = scheduler.setTimeout(() => {
        const next = take();
        next?.();
      }, delayMs);
    },
    flush() {
      take()?.();
    },
    cancel() {
      take();
    },
    isPending() {
      return pending !== null;
    },
  };
}
