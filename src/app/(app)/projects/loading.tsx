import { PageHeader } from "@/components/app/page-header";
import { Skeleton } from "@/components/ui/skeleton";

export default function ProjectsLoading() {
    return (
        <div className="grid gap-6">
            <PageHeader
                title="Projects"
                subtitle="Portfolio health, milestones, and execution pressure."
            />

            <div className="flex flex-col gap-4 md:flex-row md:items-center md:justify-between">
                <Skeleton className="h-10 w-full md:w-[300px] rounded-2xl" />
                <div className="flex gap-2">
                    <Skeleton className="h-10 w-20 rounded-2xl" />
                    <Skeleton className="h-10 w-20 rounded-2xl" />
                </div>
            </div>

            <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-3">
                {Array.from({ length: 9 }).map((_, i) => (
                    <div key={i} className="grain surface h-[140px] rounded-3xl border bg-card/80 p-5">
                        <div className="flex justify-between gap-4">
                            <div className="space-y-2">
                                <Skeleton className="h-5 w-32 rounded-lg" />
                                <Skeleton className="h-4 w-24 rounded-lg" />
                            </div>
                            <Skeleton className="h-6 w-16 rounded-full" />
                        </div>
                        <div className="mt-8 flex justify-between">
                            <Skeleton className="h-4 w-16 rounded-lg" />
                            <Skeleton className="h-4 w-20 rounded-lg" />
                        </div>
                    </div>
                ))}
            </div>
        </div>
    );
}
