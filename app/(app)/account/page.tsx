import { requireUser } from "@/lib/auth";
import { Card, CardHeader, PageHeader } from "@/components/ui";
import { ChangePasswordForm } from "./AccountForm";

export default async function AccountPage() {
  const user = await requireUser();

  return (
    <div className="flex flex-col gap-8">
      <PageHeader title="Account" description="Manage your own sign-in." />

      <Card className="max-w-md overflow-hidden">
        <CardHeader
          title={user.name}
          description={`${user.email} · ${user.role === "advisor" ? "Faculty advisor" : "Portfolio manager"}`}
        />
        <div className="px-5 py-5">
          <h3 className="mb-3 text-sm font-semibold text-ink">Change password</h3>
          <ChangePasswordForm />
        </div>
      </Card>
    </div>
  );
}
