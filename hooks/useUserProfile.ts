import { useEffect, useState } from "react";

import { useSession } from "next-auth/react";

export interface UserProfile {
  email: string;
  isPremium: boolean;
  subscriptionPlan?: string;
  billingEnd?: string;
}

export function useUserProfile() {
  const { data: session } = useSession();
  const [profile, setProfile] = useState<UserProfile | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!session?.user?.email) {
      setLoading(false);
      return;
    }

    const fetchProfile = async () => {
      try {
        const res = await fetch("/api/user/profile");
        if (res.ok) {
          const data = await res.json();
          setProfile(data);
        }
      } catch (error) {
        console.error("Failed to fetch profile:", error);
      } finally {
        setLoading(false);
      }
    };

    fetchProfile();
  }, [session?.user?.email]);

  return { profile, loading, isPremium: profile?.isPremium ?? false };
}
