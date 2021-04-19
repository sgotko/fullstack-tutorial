import { Request, Response } from "express";
import { Session } from "express-session";
import { Redis } from "ioredis";

export type MyContext = {
    req: Request & { session?: Session };
    res: Response;
    redis: Redis;
};

declare module "express-session" {
    export interface SessionData {
        // user: { [key: string]: any };
        userId: number;
    }
}
