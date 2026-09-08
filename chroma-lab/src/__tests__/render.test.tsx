import { renderToString } from 'react-dom/server';
import { describe, expect, it } from 'vitest';
import App from '../App';
import { DEFAULT_AUDIO_SETTINGS } from '../audio/audioSettings';
import { AudioSettingsPanel } from '../components/AudioSettingsPanel';
import { BottleGrid, cellOf, columnsPerSide } from '../components/BottleGrid';
import { OverlayCard } from '../components/OverlayCard';

/**
 * 渲染冒烟测试：确认整棵组件树能在无浏览器环境下完成首屏渲染，
 * 捕获 import 环、空指针、非法 props 等运行时错误。
 */
describe('App 渲染', () => {
  const raw = renderToString(<App />);
  // React SSR 会在静态文本与插值之间插入 <!-- --> 分隔注释，断言前先剔除
  const html = raw.replace(/<!--\s*-->/g, '');

  it('能完成首屏渲染并输出内容', () => {
    expect(html.length).toBeGreaterThan(500);
  });

  it('渲染出原创标识，且不含参考产品的名称与标语', () => {
    expect(html).toContain('CHROMA');
    expect(html).toContain('LAB');
    expect(html).toContain('aria-label="Chroma Lab 标识"');
    expect(html).not.toContain('MAGIC');
    expect(html).not.toContain('Harder than you think');
  });

  it('渲染出第 1 关信息与操作栏', () => {
    expect(html).toContain('第 1 关');
    expect(html).toContain('撤销');
    expect(html).toContain('重玩');
    expect(html).toContain('提示');
    expect(html).toContain('声音');
    expect(html).toContain('aria-label="声音设置"');
  });

  it('操作栏图标是内联 SVG，不依赖 emoji 字体', () => {
    expect(html).toContain('class="tool__icon"');
    expect(html).toContain('<svg');
    expect(html).not.toMatch(/[\u{1F300}-\u{1FAFF}]/u);
  });

  it('渲染出瓶阵与中央大瓶', () => {
    expect(html).toContain('class="board"');
    expect(html).toContain('bottle__glass');
    expect(html).toContain('bottle--tall');
    expect(html).toContain('中央大瓶');
  });

  it('中央大瓶是可点击的按钮，并标出容量', () => {
    expect(html).toMatch(
      /<button type="button" class="bottle bottle--tall"[^>]*aria-label="中央大瓶，空瓶，容量 6 层"/
    );
    // 进度条由顶栏承担，中央位置留给可倒液的大瓶
    expect(html).toContain('class="topbar__progress"');
    expect(html).toContain('role="progressbar"');
  });

  it('第 1 关渲染出 6 个普通瓶 + 1 个中央大瓶，且没有未知色层', () => {
    const bottleCount = (html.match(/aria-label="第 \d+ 个瓶子/g) ?? []).length;
    expect(bottleCount).toBe(6);
    expect((html.match(/bottle--tall/g) ?? []).length).toBe(1);
    // 未知色从第 7 关才出现
    expect(html).not.toContain('layer--unknown');
  });

  it('瓶身画出刻度线', () => {
    expect(html).toContain('class="bottle__ticks"');
    expect(html).toContain('repeating-linear-gradient');
  });

  it('初始不展示通关或死局弹窗', () => {
    expect(html).not.toContain('全部归位');
    expect(html).not.toContain('没有可行的倒法');
  });

  it('渲染出关卡切换按钮，且第 1 关无法回退', () => {
    expect(html).toContain('aria-label="上一关"');
    expect(html).toContain('aria-label="下一关"');
    // 第 1 关且尚未解锁后续关卡时，两个方向都应禁用
    const disabledNav = (html.match(/class="levelnav__btn" disabled/g) ?? [])
      .length;
    expect(disabledNav).toBe(2);
  });

  it('渲染出屏幕阅读器播报区域', () => {
    expect(html).toContain('role="status"');
    expect(html).toContain('aria-live="polite"');
  });
});

describe('BottleGrid 严格格点布局', () => {
  const board = Array.from({ length: 17 }, () => [] as number[]);
  const caps = [...Array.from({ length: 16 }, () => 4), 18];
  const html = renderToString(
    <BottleGrid
      board={board}
      caps={caps}
      hidden={board.map(() => [])}
      tallIndex={16}
      decors={[...Array.from({ length: 16 }, () => 'none' as const), 'label']}
      selected={null}
      hintMove={null}
      rejected={null}
      pouring={null}
      interactionLocked={false}
      onTapBottle={() => undefined}
    />
  );

  it('用 grid 模板声明列宽与行高，行列都对齐格点', () => {
    // 16 个普通瓶 → 每侧 3 列 + 中央大瓶列，共 3 行
    expect(html).toContain(
      'grid-template-columns:repeat(3, var(--bottle-w)) var(--tall-w) repeat(3, var(--bottle-w))'
    );
    expect(html).toContain('grid-template-rows:repeat(3, var(--bottle-h))');
  });

  it('把列数与行数作为 CSS 变量传给样式层，用于反算瓶子尺寸', () => {
    expect(html).toContain('--side-cols:3');
    expect(html).toContain('--rows:3');
  });

  it('中央大瓶独占中间列并贯穿所有行', () => {
    expect(html).toContain('grid-row:1 / -1;grid-column:4');
    expect((html.match(/bottle--tall/g) ?? []).length).toBe(1);
    expect(html).toContain('aria-label="中央大瓶，空瓶，容量 18 层"');
  });

  it('每个普通瓶都落在显式的行列上', () => {
    const placed = (html.match(/grid-row:\d+;grid-column:\d+/g) ?? []).length;
    expect(placed).toBe(16);
  });

  it('columnsPerSide 少量瓶子每侧 2 列，较多时 3 列', () => {
    expect(columnsPerSide(6)).toBe(2);
    expect(columnsPerSide(8)).toBe(2);
    expect(columnsPerSide(9)).toBe(3);
  });

  it('cellOf 按行优先填格，并跳过中央列', () => {
    // 每侧 2 列：0,1 在左，2,3 在右（中央列是第 3 列）
    expect(cellOf(0, 2)).toEqual({ row: 1, column: 1 });
    expect(cellOf(1, 2)).toEqual({ row: 1, column: 2 });
    expect(cellOf(2, 2)).toEqual({ row: 1, column: 4 });
    expect(cellOf(3, 2)).toEqual({ row: 1, column: 5 });
    expect(cellOf(4, 2)).toEqual({ row: 2, column: 1 });
    // 每侧 3 列：中央列是第 4 列
    expect(cellOf(2, 3)).toEqual({ row: 1, column: 3 });
    expect(cellOf(3, 3)).toEqual({ row: 1, column: 5 });
    expect(cellOf(6, 3)).toEqual({ row: 2, column: 1 });
  });
});

describe('OverlayCard 渲染', () => {
  const html = renderToString(
    <OverlayCard
      badge="win"
      title="全部归位"
      text="完成说明"
      actions={[
        { label: '重玩', onClick: () => undefined },
        { label: '下一关', onClick: () => undefined, primary: true },
      ]}
    />
  );

  it('将说明文本关联到模态对话框', () => {
    expect(html).toContain('role="dialog"');
    expect(html).toContain('aria-modal="true"');
    expect(html).toMatch(/aria-describedby="[^"]+"/);
    expect(html).toMatch(/<p id="[^"]+" class="card__text">完成说明<\/p>/);
  });

  it('徽标是自绘 SVG 而非 emoji', () => {
    expect(html).toContain('card__badge card__badge--win');
    expect(html).toContain('<svg');
  });

  it('保留主要操作按钮样式', () => {
    expect(html).toContain('class="btn btn--primary"');
    expect(html).toContain('下一关');
  });

  it('支持禁用某个操作（例如无步可撤时）', () => {
    const stuck = renderToString(
      <OverlayCard
        badge="stuck"
        title="没有可行的倒法了"
        text="说明"
        actions={[
          { label: '撤销一步', onClick: () => undefined, disabled: true },
          { label: '加一个瓶子', onClick: () => undefined, primary: true },
        ]}
      />
    );
    expect(stuck).toContain('撤销一步');
    expect(stuck).toMatch(/class="btn" disabled/);
  });
});


describe('AudioSettingsPanel 渲染', () => {
  const html = renderToString(
    <AudioSettingsPanel
      settings={{
        ...DEFAULT_AUDIO_SETTINGS,
        musicVolume: 0.35,
        effectsVolume: 0.8,
        effectsMuted: true,
      }}
      onChange={() => undefined}
      onClose={() => undefined}
    />
  );

  it('使用模态对话框语义并提供关闭按钮', () => {
    expect(html).toContain('role="dialog"');
    expect(html).toContain('aria-modal="true"');
    expect(html).toContain('aria-labelledby="audio-settings-title"');
    expect(html).toContain('aria-label="关闭声音设置"');
  });

  it('音乐与音效分别提供音量滑块和静音按钮', () => {
    expect(html).toContain('背景音乐');
    expect(html).toContain('游戏音效');
    expect((html.match(/type="range"/g) ?? []).length).toBe(2);
    expect(html).toContain('value="35"');
    expect(html).toContain('value="80"');
    expect(html).toContain('aria-label="开启游戏音效"');
    expect(html).toContain('aria-pressed="true"');
  });

  it('所有图标均为内联 SVG，不引入外部或 emoji 资源', () => {
    expect(html).toContain('<svg');
    expect(html).not.toContain('<img');
    expect(html).not.toMatch(/[\u{1F300}-\u{1FAFF}]/u);
  });
});
