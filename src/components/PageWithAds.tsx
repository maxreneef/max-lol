import { AdSidebarLeft, AdSidebarRight } from "./AdUnit";

interface Props {
  children: React.ReactNode;
}

/**
 * Layout OP.GG: 3 colunas (sidebar 180px | conteúdo | sidebar 180px).
 * Sidebars com position: sticky coladas abaixo do header (top: 72px).
 * Em telas < 1380px, as sidebars somem e o conteúdo ocupa 100%.
 */
export function PageWithAds({ children }: Props) {
  return (
    <div className="page-ads-layout">
      <aside className="page-ads-left">
        <AdSidebarLeft />
      </aside>
      <main className="page-ads-main">{children}</main>
      <aside className="page-ads-right">
        <AdSidebarRight />
      </aside>
    </div>
  );
}
