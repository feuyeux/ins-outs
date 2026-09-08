import { describe, expect, it, vi } from 'vitest';
import { createPendingCommit, type Scheduler } from '../pendingCommit';

/** 手动驱动的调度器，用来精确复现定时器与 flush 的竞争 */
function createTestScheduler() {
  const timers = new Map<number, () => void>();
  let nextId = 1;

  const scheduler: Scheduler = {
    setTimeout: (callback) => {
      const id = nextId++;
      timers.set(id, callback);
      return id;
    },
    clearTimeout: (id) => void timers.delete(id),
  };

  return {
    scheduler,
    pendingTimers: () => timers.size,
    runAll: () => {
      for (const callback of [...timers.values()]) callback();
    },
  };
}

describe('createPendingCommit', () => {
  it('commits when the timer fires', () => {
    const clock = createTestScheduler();
    const controller = createPendingCommit(clock.scheduler);
    const commit = vi.fn();

    controller.schedule(commit, 420);
    expect(controller.isPending()).toBe(true);

    clock.runAll();

    expect(commit).toHaveBeenCalledTimes(1);
    expect(controller.isPending()).toBe(false);
    expect(clock.pendingTimers()).toBe(0);
  });

  it('flush commits immediately and cancels the pending timer', () => {
    const clock = createTestScheduler();
    const controller = createPendingCommit(clock.scheduler);
    const commit = vi.fn();

    controller.schedule(commit, 420);
    controller.flush();

    expect(commit).toHaveBeenCalledTimes(1);
    expect(clock.pendingTimers()).toBe(0);
  });

  it('does not commit twice when the timer fires after a flush', () => {
    const clock = createTestScheduler();
    const controller = createPendingCommit(clock.scheduler);
    const commit = vi.fn();

    controller.schedule(commit, 420);
    controller.flush();
    clock.runAll();

    expect(commit).toHaveBeenCalledTimes(1);
  });

  it('repeated flushes commit only once', () => {
    const clock = createTestScheduler();
    const controller = createPendingCommit(clock.scheduler);
    const commit = vi.fn();

    controller.schedule(commit, 420);
    controller.flush();
    controller.flush();

    expect(commit).toHaveBeenCalledTimes(1);
  });

  it('cancel discards the pending commit', () => {
    const clock = createTestScheduler();
    const controller = createPendingCommit(clock.scheduler);
    const commit = vi.fn();

    controller.schedule(commit, 420);
    controller.cancel();
    clock.runAll();

    expect(commit).not.toHaveBeenCalled();
    expect(controller.isPending()).toBe(false);
  });

  it('flush without a pending commit is a no-op', () => {
    const clock = createTestScheduler();
    const controller = createPendingCommit(clock.scheduler);

    expect(() => controller.flush()).not.toThrow();
    expect(controller.isPending()).toBe(false);
  });

  it('scheduling again replaces the previous pending commit', () => {
    const clock = createTestScheduler();
    const controller = createPendingCommit(clock.scheduler);
    const first = vi.fn();
    const second = vi.fn();

    controller.schedule(first, 420);
    controller.schedule(second, 420);
    clock.runAll();

    expect(first).not.toHaveBeenCalled();
    expect(second).toHaveBeenCalledTimes(1);
  });
});
