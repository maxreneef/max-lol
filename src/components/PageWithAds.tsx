import { AdSidebarLeft, AdSidebarRight } from "./AdUnit";

interface Props {
  children: React.ReactNode;
}

/**
 * Envolve o conteúdo da página com sidebars de anúncio (esquerda + direita),
 * igual ao layout do OP.GG. Os sidebars somem em telas < 1380px via CSS.
 */
export function PageWithAds({ children }: Props) {
  return (
    <div className="page-ads-layout">
      <aside className="page-ads-left">
        <AdSidebarLeft />
      </aside>
      <div className="page-ads-main">
        {children}
      </div>
      <aside className="page-ads-right">
        <AdSidebarRight />
      </aside>
    </div>
  );
}
