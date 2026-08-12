import { useAuth } from "@/_core/hooks/useAuth";
import AcademyHeader from "@/components/AcademyHeader";
import Countdown from "@/components/Countdown";
import { Button } from "@/components/ui/button";
import { startLogin } from "@/const";
import { trpc } from "@/lib/trpc";
import { CheckCircle2, Link2, ShieldCheck, UsersRound } from "lucide-react";
import { useEffect, useMemo } from "react";
import { Link } from "wouter";
import { toast } from "sonner";

export default function Register() {
  const { user, isAuthenticated, loading } = useAuth();
  const { data: event } = trpc.academy.getActiveEvent.useQuery();
  const utils = trpc.useUtils();
  const register = trpc.academy.registerForActiveEvent.useMutation({ onSuccess: () => { toast.success("You are registered. Your student dashboard is ready."); utils.academy.getHomeData.invalidate(); utils.academy.getStudentDashboard.invalidate(); } });
  const applyReferral = trpc.academy.applyReferralCode.useMutation({ onSuccess: () => { toast.success("Your referral source has been saved."); utils.academy.getStudentDashboard.invalidate(); } });
  const referralCode = useMemo(() => new URLSearchParams(window.location.search).get("ref")?.trim().toUpperCase() ?? null, []);
  useEffect(() => { if (referralCode) localStorage.setItem("budutech-pending-referral", referralCode); }, [referralCode]);
  const savedReferral = referralCode ?? localStorage.getItem("budutech-pending-referral");
  const finishRegistration = async () => {
    try {
      if (savedReferral) {
        await applyReferral.mutateAsync({ code: savedReferral });
        localStorage.removeItem("budutech-pending-referral");
      }
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "We could not apply that referral code.");
    }
    try { await register.mutateAsync(); } catch (error) { toast.error(error instanceof Error ? error.message : "We could not complete registration."); }
  };
  return <div className="min-h-screen bg-[#fbfcf7]"><AcademyHeader /><main className="container grid gap-12 py-12 lg:grid-cols-[.9fr_1.1fr] lg:items-center lg:py-20"><div><div className="inline-flex items-center gap-2 rounded-full bg-[#e8f3e5] px-3 py-1.5 text-xs font-semibold text-[#286665]"><UsersRound className="h-3.5 w-3.5" /> Free live training</div><h1 className="mt-6 font-display text-5xl leading-[0.98] tracking-[-0.055em] text-[#163c3e] sm:text-6xl">Reserve your place in the room.</h1><p className="mt-5 max-w-xl text-lg leading-8 text-[#607a7c]">Your account gives you event updates, access to your learning space, and a personal referral link to share the opportunity.</p><div className="mt-8 space-y-4">{[[ShieldCheck, "A protected student account"], [Link2, "A unique referral link after registration"], [CheckCircle2, "Live-session and replay updates in one place"]].map(([Icon, text]) => { const CurrentIcon = Icon as typeof ShieldCheck; return <div className="flex items-center gap-3 text-sm font-medium text-[#355a5b]" key={text as string}><span className="grid h-9 w-9 place-items-center rounded-xl bg-[#e9f5d0] text-[#25605f]"><CurrentIcon className="h-4 w-4" /></span>{text as string}</div>; })}</div></div><div className="rounded-[2rem] border border-[#d7e5d8] bg-white p-6 academy-shadow sm:p-8">{event ? <><div className="font-mono-brand text-xs uppercase tracking-[0.18em] text-[#2c7e7c]">Current Academy session</div><h2 className="mt-3 text-2xl font-semibold leading-tight tracking-[-0.04em] text-[#163c3e]">{event.title}</h2><p className="mt-3 text-sm leading-6 text-[#688183]">{new Date(event.startDate).toLocaleString(undefined, { dateStyle: "full", timeStyle: "short" })} · {event.timeZone}</p>{event.state === "upcoming" && <div className="mt-6 rounded-2xl bg-[#123a3c] p-4"><Countdown startDate={event.startDate} compact /></div>}<div className="mt-7 border-t border-[#e0eae1] pt-6">{loading ? <div className="text-sm text-[#688183]">Checking your student account…</div> : !isAuthenticated ? <><h3 className="text-lg font-semibold text-[#173d3f]">Create your student account</h3><p className="mt-2 text-sm leading-6 text-[#607a7c]">Sign in securely to reserve your place. If you arrived through a referral link, we will preserve that source for validation.</p>{savedReferral && <div className="mt-4 rounded-xl bg-[#eef7e8] px-4 py-3 text-sm text-[#356262]">Referral code detected: <span className="font-mono-brand font-medium">{savedReferral}</span></div>}<Button onClick={startLogin} className="mt-6 h-12 w-full bg-[#123a3c] text-white hover:bg-[#214f50]">Continue to secure sign-in</Button></> : <><h3 className="text-lg font-semibold text-[#173d3f]">You’re signed in as {user?.name ?? "a BuduTech student"}.</h3><p className="mt-2 text-sm leading-6 text-[#607a7c]">Confirm your registration to save your place in this event.</p>{savedReferral && <div className="mt-4 rounded-xl bg-[#eef7e8] px-4 py-3 text-sm text-[#356262]">We will validate this referral source: <span className="font-mono-brand font-medium">{savedReferral}</span></div>}<Button onClick={finishRegistration} disabled={register.isPending || applyReferral.isPending} className="mt-6 h-12 w-full bg-[#d4f36b] text-[#123a3c] hover:bg-[#c7e85c]">{register.isPending || applyReferral.isPending ? "Saving your place…" : "Confirm free registration"}</Button><Link href="/dashboard" className="mt-4 block text-center text-sm font-semibold text-[#216c6d]">Go to my dashboard</Link></>}</div></> : <><h2 className="text-2xl font-semibold text-[#163c3e]">The next session is being prepared.</h2><p className="mt-3 leading-7 text-[#607a7c]">Create your student account now and we will let you know when registration opens.</p><Button onClick={startLogin} className="mt-6 bg-[#123a3c] text-white hover:bg-[#214f50]">Create student account</Button></>}</div></main></div>;
}
