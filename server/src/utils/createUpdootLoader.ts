import DataLoader from "dataloader";
import { Updoot } from "../entities/Updoot";

// [{postId: 5, userId: 10}]
// we load {postId: 5, userId: 10, value: 1} or null
// then return Updoot

export const createUpdootLoader = () =>
    new DataLoader<
        { postId: number; userId: number | undefined },
        Updoot | null
    >(async (keys) => {
        const updoots = await Updoot.findByIds(keys as any[]);
        const updootIdsToUpdoot: Record<string, Updoot> = {};
        updoots.forEach((updoot) => {
            updootIdsToUpdoot[`${updoot.userId}|${updoot.postId}`] = updoot;
        });

        return keys.map(
            (key) => updootIdsToUpdoot[`${key.userId}|${key.postId}`]
        );
    });
