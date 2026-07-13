import { ProfileForm } from "@/components/profil/profile-form";
import { getOrCreateProfile } from "@/lib/queries";

export const dynamic = "force-dynamic";

export default function ProfilePage() {
  const profile = getOrCreateProfile();
  return (
    <div className="mx-auto max-w-xl space-y-4">
      <div>
        <h1 className="font-serif text-3xl tracking-tight">Profil</h1>
        <p className="mt-1 text-sm text-ink-2">
          Ces informations restent 100 % locales. Elles servent à calculer ton
          matelas de sécurité et, plus tard, les conseils personnalisés.
        </p>
      </div>
      <ProfileForm
        monthlyIncome={profile.monthlyIncome}
        monthlyExpenses={profile.monthlyExpenses}
        emergencyMonthsTarget={profile.emergencyMonthsTarget}
      />
    </div>
  );
}
