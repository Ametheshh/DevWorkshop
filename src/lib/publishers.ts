/**
 * Publisher data access helpers.
 *
 * This module provides the build-time queries used to list publishers for the
 * static catalog pages in the Astro site.
 */
import { asc } from 'drizzle-orm';
import type { Database } from './db';
import { publishers } from '../../db/schema';
import type { Publisher } from '../types/game';

/**
 * Retrieves all publishers sorted alphabetically by name.
 *
 * @param db - The database connection used to query the publishers table.
 * @returns A promise that resolves to all publishers in name order.
 */
export async function getAllPublishers(db: Database): Promise<Publisher[]> {
    const rows = await db
        .select({
            id: publishers.id,
            name: publishers.name,
        })
        .from(publishers)
        .orderBy(asc(publishers.name));

    return rows.map((row) => ({
        id: row.id,
        name: row.name,
    }));
}
