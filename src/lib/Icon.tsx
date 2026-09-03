// iconfont 精简包里的图标（symbol 由 public/iconfont.js 注入）
// 只需要挂 UI 导航/分区图标；孩子头像、任务图标、奖励图标等是数据库里的用户数据，仍用 emoji
export function IfIcon({ name, className = "" }: { name: string; className?: string }) {
  return (
    <svg className={`if-icon ${className}`} aria-hidden="true">
      <use xlinkHref={`#icon-${name}`} />
    </svg>
  );
}
