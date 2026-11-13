import { MarketingFooter } from "@/components/layouts/marketing-footer";
import { MarketingNav } from "@/components/layouts/marketing-nav";

export default function MarketingLayout({
  children,
}: Readonly<{ children: React.ReactNode }>) {
  return (
    <div className="marketing-page flex min-h-screen flex-col">
      <MarketingNav />
      <div className="flex-1">{children}</div>
      <MarketingFooter />
    </div>
  );
}
