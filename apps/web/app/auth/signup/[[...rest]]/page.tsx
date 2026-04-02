import { SignUp } from '@clerk/nextjs';

function SignUpSkeleton() {
  return (
    <div className="w-100 rounded-xl border border-border bg-card px-8 py-10 animate-pulse">
      <div className="mx-auto mb-5 h-10 w-10 rounded-lg bg-muted" />
      <div className="mx-auto mb-2 h-5 w-32 rounded bg-muted" />
      <div className="mx-auto mb-8 h-4 w-48 rounded bg-muted" />
      <div className="mb-1.5 h-3.5 w-20 rounded bg-muted" />
      <div className="mb-4 h-9 w-full rounded-md bg-muted" />
      <div className="mb-4 h-9 w-full rounded-md bg-muted" />
      <div className="mb-4 h-9 w-full rounded-md bg-muted" />
      <div className="h-9 w-full rounded-md bg-muted" />
      <div className="mt-8 border-t border-border pt-5">
        <div className="mx-auto h-4 w-44 rounded bg-muted" />
      </div>
    </div>
  );
}

export default function Page() {
  return (
    <div className="min-h-screen bg-background flex flex-col">
      <main className="flex flex-1 items-center justify-center px-4 py-12">
        <SignUp fallback={<SignUpSkeleton />} />
      </main>
    </div>
  );
}
