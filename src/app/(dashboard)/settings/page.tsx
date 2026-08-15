import { redirect } from "next/navigation";
import { auth } from "@/lib/auth";
import { emailConfigStatus } from "@/lib/mail";
import { EmailSettings } from "@/components/settings/email-settings";

export const dynamic = "force-dynamic";

export default async function SettingsPage() {
  // Auth is enforced by the dashboard layout; this guard is a safety net.
  const session = await auth();
  if (!session?.user?.id) redirect("/login");

  const config = emailConfigStatus();
  const initial = {
    ok: true,
    configured: config.channel !== "none",
    channel: config.channel,
    from:
      config.channel === "smtp"
        ? config.from
        : config.channel === "resend"
          ? (process.env.RESEND_FROM ?? "Business OS <onboarding@resend.dev>")
          : null,
    host: config.channel === "smtp" ? config.host : null,
    port: config.channel === "smtp" ? config.port : null,
    companyName: null,
  };

  return (
    <div className="px-5 sm:px-8 py-6 max-w-3xl">
      <div className="section-number">SETTINGS</div>
      <h1 className="mt-1 text-2xl font-semibold tracking-tight text-[var(--bos-text-primary)]">
        Workspace settings
      </h1>
      <p className="mt-1 text-[13px] text-[var(--bos-text-secondary)] leading-relaxed">
        Email delivery powers every client communication — secure links, clarifications and reminders.
      </p>

      <div className="mt-6">
        <EmailSettings initial={initial} />
      </div>
    </div>
  );
}
