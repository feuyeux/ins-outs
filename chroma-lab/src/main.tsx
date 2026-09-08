import { StrictMode } from 'react';
import { createRoot } from 'react-dom/client';
import App from './App';
import { ErrorBoundary } from './components/ErrorBoundary';
import './styles/global.css';

const container = document.getElementById('root');
if (!container) {
  throw new Error('未找到 #root 挂载节点');
}

/** 渲染异常多半源于损坏的本地存档，恢复时清空后重载（连旧版本的键一起清） */
function resetAfterCrash(): void {
  try {
    window.localStorage.removeItem('chroma-lab:progress:v1');
    window.localStorage.removeItem('magic-sort:progress:v1');
  } catch {
    // 存储不可用时忽略，直接重载
  }
  window.location.reload();
}

createRoot(container).render(
  <StrictMode>
    <ErrorBoundary onReset={resetAfterCrash}>
      <App />
    </ErrorBoundary>
  </StrictMode>
);
