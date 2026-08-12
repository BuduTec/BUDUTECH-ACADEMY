import { useAuth } from "@/_core/hooks/useAuth";
import { startLogin } from "@/const";
import { Button } from "@/components/ui/button";
import { ArrowUpRight, Menu, X } from "lucide-react";
import { useState } from "react";
import { Link, useLocation } from "wouter";

const navItems = [
  { label: "Learn", href: "/courses" },
  { label: "Resources", href: "/blog" },
  { label: "Leaderboard", href: "/leaderboard" },
];

export function AcademyMark({ inverse = false }: { inverse?: boolean }) {
  return (
    <Link href="/" className="inline-flex items-center gap-2.5 group" aria-label="BuduTech Academy home">
      <span className={`grid h-9 w-9 place-items-center rounded-xl font-mono-brand text-sm font-medium ${inverse ? "bg-[#d4f36b] text-[#123a3c]" : "bg-[#123a3c] text-[#e9f5d0]"}`}>BT</span>
      <span className={`text-[0.98rem] font-semibold tracking-[-0.035em] ${inverse ? "text-white" : "text-[#123a3c]"}`}>BuduTech <span className={inverse ? "text-[#d4f36b]" : "text-[#2c7e7c]"}>Academy</span></span>
    </Link>
  );
}

export default function AcademyHeader({ dark = false }: { dark?: boolean }) {
  const [open, setOpen] = useState(false);
  const { isAuthenticated, user } = useAuth();
  const [location] = useLocation();
  const dashboardTarget = user?.role === "admin" ? "/admin" : "/dashboard";

  return (
    <header className={`relative z-50 border-b ${dark ? "border-white/10 bg-[#123a3c] text-white" : "border-[#d7dfce] bg-[#fbfcf7]/90 text-[#123a3c] backdrop-blur"}`}>
      <div className="container flex h-[76px] items-center justify-between">
        <AcademyMark inverse={dark} />
        <nav className="hidden items-center gap-7 md:flex" aria-label="Main navigation">
          {navItems.map((item) => <Link key={item.href} href={item.href} className={`text-sm font-medium transition-colors ${location === item.href ? (dark ? "text-[#d4f36b]" : "text-[#217170]") : (dark ? "text-white/75 hover:text-white" : "text-[#426163] hover:text-[#123a3c]")}`}>{item.label}</Link>)}
        </nav>
        <div className="hidden items-center gap-3 md:flex">
          {isAuthenticated ? <Link href={dashboardTarget}><Button variant="outline" className={dark ? "border-white/20 bg-transparent text-white hover:bg-white/10 hover:text-white" : "border-[#bdd2cb] bg-transparent text-[#123a3c]"}>My learning</Button></Link> : <Button variant="ghost" onClick={startLogin} className={dark ? "text-white hover:bg-white/10 hover:text-white" : "text-[#24595a]"}>Sign in</Button>}
          <Link href="/register"><Button className="gap-2 bg-[#d4f36b] text-[#123a3c] hover:bg-[#c7e85c]">Join free training <ArrowUpRight className="h-4 w-4" /></Button></Link>
        </div>
        <button onClick={() => setOpen((value) => !value)} className={`grid h-10 w-10 place-items-center rounded-lg md:hidden ${dark ? "bg-white/10" : "bg-[#e9f2ed]"}`} aria-label="Toggle navigation">{open ? <X className="h-5 w-5" /> : <Menu className="h-5 w-5" />}</button>
      </div>
      {open && <div className={`absolute inset-x-0 top-full border-b px-4 py-5 md:hidden ${dark ? "border-white/10 bg-[#123a3c]" : "border-[#d7dfce] bg-[#fbfcf7]"}`}><nav className="mx-auto flex max-w-lg flex-col gap-3"><Link href="/courses" onClick={() => setOpen(false)} className="rounded-lg px-3 py-2 text-sm font-medium">Learn</Link><Link href="/blog" onClick={() => setOpen(false)} className="rounded-lg px-3 py-2 text-sm font-medium">Resources</Link><Link href="/leaderboard" onClick={() => setOpen(false)} className="rounded-lg px-3 py-2 text-sm font-medium">Leaderboard</Link><Link href={isAuthenticated ? dashboardTarget : "/register"} onClick={() => setOpen(false)}><Button className="mt-1 w-full bg-[#d4f36b] text-[#123a3c] hover:bg-[#c7e85c]">{isAuthenticated ? "My learning" : "Join free training"}</Button></Link></nav></div>}
    </header>
  );
}
