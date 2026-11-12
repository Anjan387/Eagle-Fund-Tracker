import { requireUser } from "@/lib/auth";
import { Card, CardHeader, PageHeader } from "@/components/ui";
import { ChangeNameForm, ChangePasswordForm } from "./AccountForm";

export default async function AccountPage() {
  const user = await requireUser();

  return (
    <div className="flex flex-col gap-8">
      <PageHeader title="Account" description="Your name and your sign-in." />

      <Card className="max-w-md overflow-hidden">
        <CardHeader
          title={user.name}
          description={`${user.email} · ${user.role === "advisor" ? "Faculty advisor" : "Portfolio manager"}`}
        />
        <div className="border-b border-line px-5 py-5">
          <h3 className="mb-3 text-sm font-semibold text-ink">Your name</h3>
          <ChangeNameForm name={user.name} />
        </div>
        <div className="px-5 py-5">
          <h3 className="mb-3 text-sm font-semibold text-ink">Change password</h3>
          <ChangePasswordForm />
        </div>
      </Card>
    </div>
  );
}
