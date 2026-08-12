import AcademyHeader from "@/components/AcademyHeader";
import { Button } from "@/components/ui/button";
import { trpc } from "@/lib/trpc";
import { CheckCircle2, CircleAlert, Loader2 } from "lucide-react";
import { useEffect, useMemo, useState } from "react";
import { Link } from "wouter";

export default function CheckoutVerify() {
  const reference = useMemo(() => new URLSearchParams(window.location.search).get("reference") ?? "", []);
  const [started, setStarted] = useState(false);
  const verify = trpc.academy.verifyPaidCourseCheckout.useMutation();
  useEffect(() => { if (reference && !started) { setStarted(true); verify.mutate({ reference }); } }, [reference, started, verify]);
  const done = verify.data?.success;
  return <div className="min-h-screen bg-[#fbfcf7]"><AcademyHeader /><main className="container grid min-h-[70vh] place-items-center py-12"><div className="w-full max-w-xl rounded-3xl border border-[#dbe6dc] bg-white p-8 text-center academy-shadow">{!reference ? <><CircleAlert className="mx-auto h-8 w-8 text-[#b05c3c]" /><h1 className="mt-4 font-display text-4xl text-[#163c3e]">Payment reference missing.</h1><p className="mt-3 leading-7 text-[#607a7c]">Return to the course page and start checkout again.</p><Link href="/courses"><Button className="mt-6 bg-[#123a3c] text-white">Explore courses</Button></Link></> : verify.isPending || !started ? <><Loader2 className="mx-auto h-8 w-8 animate-spin text-[#2c7e7c]" /><h1 className="mt-4 font-display text-4xl text-[#163c3e]">Verifying your payment.</h1><p className="mt-3 leading-7 text-[#607a7c]">Please keep this page open while BuduTech Academy confirms your Paystack transaction securely.</p></> : done ? <><CheckCircle2 className="mx-auto h-9 w-9 text-[#2c7e7c]" /><h1 className="mt-4 font-display text-4xl text-[#163c3e]">Your course is ready.</h1><p className="mt-3 leading-7 text-[#607a7c]">Payment verified. We have unlocked your Academy enrollment and sent a confirmation email.</p><Link href="/dashboard"><Button className="mt-6 bg-[#123a3c] text-white">Open my dashboard</Button></Link></> : <><CircleAlert className="mx-auto h-8 w-8 text-[#b05c3c]" /><h1 className="mt-4 font-display text-4xl text-[#163c3e]">We could not verify that payment.</h1><p className="mt-3 leading-7 text-[#607a7c]">{verify.error?.message ?? "If you completed payment, refresh this page in a moment or contact the Academy team with your payment reference."}</p><Link href="/courses"><Button className="mt-6 bg-[#123a3c] text-white">Return to courses</Button></Link></>}</div></main></div>;
}
