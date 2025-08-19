import { useCallback } from 'react';
import { useAuth } from './useAuth';

interface GamificationRewards {
  ITEM_ADDED: number;
  ITEM_SOLD: number;
  BID_PLACED: number;
  FORUM_POST: number;
  DAILY_LOGIN: number;
  COLLECTION_MILESTONE_10: number;
  COLLECTION_MILESTONE_50: number;
  COLLECTION_MILESTONE_100: number;
  FIRST_SALE: number;
  POWER_SELLER: number;
}

const XP_REWARDS: GamificationRewards = {
  ITEM_ADDED: 10,
  ITEM_SOLD: 25,
  BID_PLACED: 5,
  FORUM_POST: 15,
  DAILY_LOGIN: 5,
  COLLECTION_MILESTONE_10: 100,
  COLLECTION_MILESTONE_50: 500,
  COLLECTION_MILESTONE_100: 1000,
  FIRST_SALE: 100,
  POWER_SELLER: 250,
};

interface AchievementCheck {
  type: keyof GamificationRewards;
  metadata?: any;
}

export const useGamification = () => {
  const { user, addXP, addFavoriteCharacter, refreshUser } = useAuth();

  const awardXP = useCallback(
    async (type: keyof GamificationRewards, metadata?: any) => {
      if (!user) return false;

      try {
        const xpAmount = XP_REWARDS[type];
        const leveledUp = await addXP(xpAmount);

        console.log(`Awarded ${xpAmount} XP for ${type}`, {
          metadata,
          leveledUp,
        });

        return {
          xpAwarded: xpAmount,
          leveledUp,
        };
      } catch (error) {
        console.error('Error awarding XP:', error);
        return false;
      }
    },
    [user, addXP]
  );

  const checkAchievements = useCallback(
    async (achievements: AchievementCheck[]) => {
      if (!user) return [];

      const results = [];

      for (const achievement of achievements) {
        try {
          const result = await awardXP(achievement.type, achievement.metadata);
          if (result) {
            results.push({
              type: achievement.type,
              ...result,
            });
          }
        } catch (error) {
          console.error(
            `Error processing achievement ${achievement.type}:`,
            error
          );
        }
      }

      return results;
    },
    [user, awardXP]
  );

  // Specific achievement functions
  const onItemAdded = useCallback(
    async (itemData: any) => {
      return await awardXP('ITEM_ADDED', { item: itemData });
    },
    [awardXP]
  );

  const onItemSold = useCallback(
    async (itemData: any, salePrice: number) => {
      const results = [];

      // Award XP for sale
      const saleResult = await awardXP('ITEM_SOLD', {
        item: itemData,
        salePrice,
      });
      if (saleResult) results.push({ type: 'ITEM_SOLD', ...saleResult });

      // Check if this is their first sale
      // You'd need to query your sales history here
      const isFirstSale = true; // Replace with actual check
      if (isFirstSale) {
        const firstSaleResult = await awardXP('FIRST_SALE', { item: itemData });
        if (firstSaleResult)
          results.push({ type: 'FIRST_SALE', ...firstSaleResult });
      }

      return results;
    },
    [awardXP]
  );

  const onBidPlaced = useCallback(
    async (auctionData: any, bidAmount: number) => {
      return await awardXP('BID_PLACED', { auction: auctionData, bidAmount });
    },
    [awardXP]
  );

  const onForumPost = useCallback(
    async (postData: any) => {
      return await awardXP('FORUM_POST', { post: postData });
    },
    [awardXP]
  );

  const onDailyLogin = useCallback(async () => {
    // You might want to check if they already got daily login XP today
    return await awardXP('DAILY_LOGIN');
  }, [awardXP]);

  const checkCollectionMilestones = useCallback(
    async (collectionSize: number) => {
      const results = [];

      if (collectionSize === 10) {
        const result = await awardXP('COLLECTION_MILESTONE_10');
        if (result)
          results.push({ type: 'COLLECTION_MILESTONE_10', ...result });
      } else if (collectionSize === 50) {
        const result = await awardXP('COLLECTION_MILESTONE_50');
        if (result)
          results.push({ type: 'COLLECTION_MILESTONE_50', ...result });
      } else if (collectionSize === 100) {
        const result = await awardXP('COLLECTION_MILESTONE_100');
        if (result)
          results.push({ type: 'COLLECTION_MILESTONE_100', ...result });
      }

      return results;
    },
    [awardXP]
  );

  // Auto-discover favorite characters based on collection
  const autoDiscoverFavorites = useCallback(
    async (collectionItems: any[]) => {
      if (!user || !collectionItems.length) return;

      // Simple logic: if user has 3+ items of the same character, add to favorites
      const characterCounts: Record<string, number> = {};

      collectionItems.forEach(item => {
        // You'd need to extract character names from item titles/tags
        // This is a simplified example
        const characters = extractCharactersFromItem(item);
        characters.forEach(character => {
          characterCounts[character] = (characterCounts[character] || 0) + 1;
        });
      });

      for (const [character, count] of Object.entries(characterCounts)) {
        if (
          count >= 3 &&
          !user.preferences?.favoriteCharacters?.includes(character)
        ) {
          try {
            await addFavoriteCharacter(character);
            console.log(`Auto-added favorite character: ${character}`);
          } catch (error) {
            console.error(
              `Error auto-adding favorite character ${character}:`,
              error
            );
          }
        }
      }
    },
    [user, addFavoriteCharacter]
  );

  return {
    awardXP,
    checkAchievements,
    onItemAdded,
    onItemSold,
    onBidPlaced,
    onForumPost,
    onDailyLogin,
    checkCollectionMilestones,
    autoDiscoverFavorites,
    XP_REWARDS,
  };
};

// Helper function to extract character names from items
// You'd implement this based on your data structure
function extractCharactersFromItem(item: any): string[] {
  const characters: string[] = [];

  // Example logic - adjust based on your data
  const title = item.title?.toLowerCase() || '';

  if (title.includes('spider-man') || title.includes('spiderman')) {
    characters.push('Spider-Man');
  }
  if (title.includes('batman')) {
    characters.push('Batman');
  }
  if (title.includes('superman')) {
    characters.push('Superman');
  }
  if (title.includes('x-men')) {
    characters.push('X-Men');
  }
  if (title.includes('naruto')) {
    characters.push('Naruto');
  }
  // Add more character detection logic as needed

  return characters;
}
