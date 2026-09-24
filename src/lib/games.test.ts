import { describe, it, expect, beforeEach } from 'vitest';
import { createTestDatabase } from '../../db/test-helpers';
import { categories, publishers, games } from '../../db/schema';
import type { Database } from './db';
import {
    getAllGames,
    getAllGameIds,
    getGameById,
    getFilteredGames,
} from './games';

async function seedGames(db: Database, count: number): Promise<void> {
    const [category] = await db
        .insert(categories)
        .values({ name: 'Strategy', description: 'cat' })
        .returning({ id: categories.id });
    const [publisher] = await db
        .insert(publishers)
        .values({ name: 'Pub One', description: 'pub' })
        .returning({ id: publishers.id });

    // Insert titles in reverse-alphabetical order to prove ordering is applied.
    for (let i = count; i >= 1; i--) {
        await db.insert(games).values({
            title: `Game ${String(i).padStart(2, '0')}`,
            description: `Description ${i}`,
            starRating: 4.2,
            categoryId: category.id,
            publisherId: publisher.id,
        });
    }
}

describe('games data-access helpers', () => {
    let db: Database;

    beforeEach(async () => {
        db = await createTestDatabase();
    });

    it('returns all games ordered by title', async () => {
        await seedGames(db, 3);
        const all = await getAllGames(db);
        expect(all.map((g) => g.title)).toEqual(['Game 01', 'Game 02', 'Game 03']);
        expect(all[0].category).toEqual({ id: expect.any(Number), name: 'Strategy' });
        expect(all[0].publisher).toEqual({ id: expect.any(Number), name: 'Pub One' });
    });

    it('returns all game ids ordered by title', async () => {
        await seedGames(db, 3);
        const ids = await getAllGameIds(db);
        const all = await getAllGames(db);
        expect(ids).toEqual(all.map((g) => g.id));
    });

    it('fetches a single game by id', async () => {
        await seedGames(db, 2);
        const ids = await getAllGameIds(db);
        const game = await getGameById(db, ids[0]);
        expect(game?.title).toBe('Game 01');
    });

    it('returns null for a non-existent game', async () => {
        await seedGames(db, 2);
        expect(await getGameById(db, 99999)).toBeNull();
    });

    it('filters by one or more categories and an optional publisher', async () => {
        const firstCategory = await db.insert(categories).values({ name: 'Strategy' }).returning({ id: categories.id });
        const secondCategory = await db.insert(categories).values({ name: 'Puzzle' }).returning({ id: categories.id });
        const firstPublisher = await db.insert(publishers).values({ name: 'Pub One' }).returning({ id: publishers.id });
        const secondPublisher = await db.insert(publishers).values({ name: 'Pub Two' }).returning({ id: publishers.id });

        await db.insert(games).values([
            { title: 'Alpha', description: 'A', categoryId: firstCategory[0].id, publisherId: firstPublisher[0].id },
            { title: 'Beta', description: 'B', categoryId: secondCategory[0].id, publisherId: firstPublisher[0].id },
            { title: 'Gamma', description: 'C', categoryId: firstCategory[0].id, publisherId: secondPublisher[0].id },
        ]);

        expect((await getFilteredGames(db, { categoryIds: [firstCategory[0].id] })).map((game) => game.title))
            .toEqual(['Alpha', 'Gamma']);
        expect((await getFilteredGames(db, { categoryIds: [firstCategory[0].id, secondCategory[0].id] })).map((game) => game.title))
            .toEqual(['Alpha', 'Beta', 'Gamma']);
        expect((await getFilteredGames(db, { publisherId: firstPublisher[0].id })).map((game) => game.title))
            .toEqual(['Alpha', 'Beta']);
        expect((await getFilteredGames(db, { categoryIds: [firstCategory[0].id], publisherId: firstPublisher[0].id })).map((game) => game.title))
            .toEqual(['Alpha']);
    });

    it('returns no games for unmatched filters and all games for empty filters', async () => {
        await seedGames(db, 2);
        expect(await getFilteredGames(db, { categoryIds: [99999] })).toEqual([]);
        expect((await getFilteredGames(db)).map((game) => game.title)).toEqual(['Game 01', 'Game 02']);
    });
});
