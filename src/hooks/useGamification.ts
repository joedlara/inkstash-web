export const useGamification = () => {
  const [userProgress, setUserProgress] = useState<UserProgress | null>(null);
  const [loading, setLoading] = useState(true);

  const gamificationService = useMemo(
    () => new GamificationService(supabase),
    []
  );

  const updateStats = async (action: string, value?: number) => {
    if (!userProgress) return;
    await gamificationService.updateUserStats(
      userProgress.userId,
      action,
      value
    );
  };

  const checkForBadges = async (action: string, metadata?: any) => {
    if (!userProgress) return;

    const newBadges = await gamificationService.checkAndAwardBadges(
      userProgress.userId,
      action,
      metadata
    );

    if (newBadges.length > 0) {
      // Show badge notifications
      newBadges.forEach(badge => {
        // You could use a toast notification library here
        console.log(`🎉 New badge: ${badge.name}`);
      });

      // Refresh user progress
      const updated = await gamificationService.getUserProgress(
        userProgress.userId
      );
      setUserProgress(updated);
    }
  };

  return {
    userProgress,
    checkForBadges,
    updateStats,
    loading,
    badges: BADGE_DEFINITIONS,
  };
};
