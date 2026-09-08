import { Component, type ErrorInfo, type ReactNode } from 'react';

export interface ErrorBoundaryProps {
  children: ReactNode;
  /** 点击「重新开始」时的额外清理，例如清除损坏的存档 */
  onReset?: () => void;
}

interface ErrorBoundaryState {
  error: Error | null;
}

/**
 * 顶层错误边界：任何渲染期异常都不应让玩家看到空白页面，
 * 而是给出可读提示与一个明确的恢复入口。
 */
export class ErrorBoundary extends Component<
  ErrorBoundaryProps,
  ErrorBoundaryState
> {
  state: ErrorBoundaryState = { error: null };

  static getDerivedStateFromError(error: Error): ErrorBoundaryState {
    return { error };
  }

  componentDidCatch(error: Error, info: ErrorInfo): void {
    // 保留控制台线索便于排查，同时不影响玩家继续游玩
    console.error('Chroma Lab 渲染异常：', error, info.componentStack);
  }

  private handleReset = (): void => {
    this.props.onReset?.();
    this.setState({ error: null });
  };

  render(): ReactNode {
    const { error } = this.state;
    if (!error) return this.props.children;

    return (
      <div className="fallback" role="alert">
        <div className="card">
          <div className="card__badge" aria-hidden="true">
            🛠️
          </div>
          <h2 className="card__title">游戏遇到了意外错误</h2>
          <p className="card__text">
            已停止在异常状态继续运行。点击下方按钮可以重置本局并重新开始。
          </p>
          <div className="card__actions">
            <button
              type="button"
              className="btn btn--primary"
              onClick={this.handleReset}
            >
              重新开始
            </button>
          </div>
        </div>
      </div>
    );
  }
}
