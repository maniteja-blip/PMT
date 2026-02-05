"use client";

import { useRouter } from "next/navigation";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";

export function TaskModal({
  title,
  children,
}: {
  title: string;
  children: React.ReactNode;
}) {
  const router = useRouter();
  return (
    <Dialog
      open
      onOpenChange={(v) => {
        if (!v) router.back();
      }}
    >
      <DialogContent
        className="max-h-[calc(100vh-2rem)] w-full max-w-[calc(100vw-2rem)] sm:max-w-[1200px] lg:max-w-[1400px] xl:max-w-[1600px]"
      >
        <DialogHeader>
          <DialogTitle>{title}</DialogTitle>
        </DialogHeader>
        <div className="max-h-[calc(100vh-10rem)] overflow-auto pr-1">{children}</div>
      </DialogContent>
    </Dialog>
  );
}
