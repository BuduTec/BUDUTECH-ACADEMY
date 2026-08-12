import AcademyHeader from "@/components/AcademyHeader";
import { Button } from "@/components/ui/button";
import { trpc } from "@/lib/trpc";
import { ArrowLeft } from "lucide-react";
import { Link, useRoute } from "wouter";

export default function BlogPost() {
  const [, params] = useRoute("/blog/:slug");
  const { data: post, isLoading, error } = trpc.academy.getBlogPost.useQuery({ slug: params?.slug ?? "" }, { enabled: Boolean(params?.slug) });
  return <div className="min-h-screen bg-[#fbfcf7]"><AcademyHeader /><main className="container py-14 sm:py-20"><Link href="/blog" className="inline-flex items-center text-sm font-semibold text-[#216c6d]"><ArrowLeft className="mr-2 h-4 w-4" />All notes</Link>{isLoading ? <div className="mt-12 text-[#607a7c]">Loading note…</div> : error || !post ? <div className="mt-12 rounded-3xl border border-[#dce5d9] bg-white p-8"><h1 className="font-display text-4xl">That note is not available.</h1><Link href="/blog"><Button className="mt-5">Back to resources</Button></Link></div> : <article className="mx-auto mt-10 max-w-3xl"><div className="font-mono-brand text-xs uppercase tracking-[0.18em] text-[#2c7e7c]">{post.category}</div><h1 className="mt-5 font-display text-5xl leading-[1.02] tracking-[-0.05em] text-[#163c3e] sm:text-6xl">{post.title}</h1><p className="mt-6 max-w-2xl text-xl leading-8 text-[#607a7c]">{post.summary}</p><div className="mt-8 border-y border-[#dce5d9] py-4 text-sm text-[#688486]">By {post.authorName} · {new Date(post.publishedAt).toLocaleDateString(undefined, { dateStyle: "medium" })}</div><div className="prose prose-lg mt-10 max-w-none prose-headings:font-display prose-headings:text-[#163c3e] prose-p:leading-8 prose-p:text-[#3f6264]" dangerouslySetInnerHTML={{ __html: post.contentHtml ?? "" }} /></article>}</main></div>;
}
