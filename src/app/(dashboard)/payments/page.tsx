import { AdminPaymentsCommandCenter } from "@/components/payments/admin-payments-command-center";
import { getAdminPaymentDashboardData } from "@/lib/payments/payment-story.service";

export const dynamic = "force-dynamic";

export default async function PaymentsPage() {
  const initialData = await getAdminPaymentDashboardData();
  return <AdminPaymentsCommandCenter initialData={initialData} />;
}
