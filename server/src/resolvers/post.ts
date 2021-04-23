import { Post } from "../entities/Post";
import {
    Arg,
    Ctx,
    Field,
    FieldResolver,
    InputType,
    Int,
    Mutation,
    ObjectType,
    Query,
    Resolver,
    Root,
    UseMiddleware,
} from "type-graphql";
import { MyContext } from "src/types";
import { isAuth } from "../middleware/isAuth";
import { getConnection } from "typeorm";
import { Updoot } from "../entities/Updoot";
import { User } from "../entities/User";

@InputType()
class PostInput {
    @Field()
    title: string;

    @Field()
    text: string;
}

@ObjectType()
class PaginatedPosts {
    @Field(() => [Post])
    posts: Post[];

    @Field()
    hasMore: boolean;
}

@Resolver(Post)
export class PostResolver {
    @FieldResolver(() => String)
    textSnippet(@Root() post: Post) {
        return post.text.slice(0, 50);
    }

    @FieldResolver(() => User)
    creator(@Root() post: Post, @Ctx() { userLoader }: MyContext) {
        return userLoader.load(post.creatorId);
    }

    @FieldResolver(() => Int, { nullable: true })
    async voteStatus(
        @Root() post: Post,
        @Ctx() { updootLoader, req }: MyContext
    ) {
        if (!req.session.userId) return null;

        const updoot = await updootLoader.load({
            postId: post.id,
            userId: req.session.userId,
        });

        return updoot ? updoot.value : null;
    }

    @Mutation(() => Boolean)
    @UseMiddleware(isAuth)
    async vote(
        @Arg("postId", () => Int) postId: number,
        @Arg("value", () => Int) value: number,
        @Ctx() { req }: MyContext
    ) {
        const { userId } = req.session;
        const isUpdoot = value !== -1;
        const realValue = isUpdoot ? 1 : -1;

        const updoot = await Updoot.findOne({
            where: {
                postId,
                userId,
            },
        });

        if (updoot && updoot.value !== realValue) {
            await getConnection().transaction(async (tm) => {
                await tm.query(
                    `UPDATE updoot SET value = ${realValue} WHERE "postId" = ${postId} AND "userId" = ${userId}`
                );
                await tm.query(
                    `UPDATE post SET points = points + ${
                        2 * realValue
                    } WHERE id = ${postId}`
                );
            });
        } else if (!updoot) {
            await getConnection().transaction(async (tm) => {
                await tm.query(`INSERT INTO updoot ("userId", "postId", value)
                    VALUES (${userId}, ${postId}, ${realValue});`);
                await tm.query(` UPDATE post
                    SET points = points + ${realValue}
                    where id = ${postId};`);
            });
        }
        return true;
    }

    @Query(() => PaginatedPosts)
    async posts(
        @Arg("limit", () => Int) limit: number,
        @Arg("cursor", () => String, { nullable: true }) cursor: string | null
    ): // @Info() info: any
    Promise<PaginatedPosts> {
        // 20 -> 21
        const realLimit = Math.min(50, limit);
        const realLimitPlusOne = realLimit + 1;

        const posts = await getConnection().query(
            `
            SELECT p.*
            FROM post p           
            ${cursor ? `WHERE p."createdAt" < TO_TIMESTAMP(${cursor})` : ""}
            ORDER BY p."createdAt" DESC
            limit ${realLimitPlusOne}
            `
        );

        return {
            posts: posts.slice(0, realLimit),
            hasMore: posts.length === realLimitPlusOne,
        };
    }

    @Query(() => Post, { nullable: true })
    post(@Arg("id", () => Int) id: number): Promise<Post | undefined> {
        console.log(id);
        return Post.findOne(id);
    }

    @Mutation(() => Post)
    @UseMiddleware(isAuth)
    async createPost(
        @Arg("input") input: PostInput,
        @Ctx() { req }: MyContext
    ): Promise<Post> {
        return Post.create({
            ...input,
            creatorId: req.session.userId,
        }).save();
    }

    @Mutation(() => Post, { nullable: true })
    @UseMiddleware(isAuth)
    async updatePost(
        @Arg("id", () => Int) id: number,
        @Arg("title") title: string,
        @Arg("text") text: string,
        @Ctx() { req }: MyContext
    ): Promise<Post | null> {
        const result = await getConnection()
            .createQueryBuilder()
            .update(Post)
            .set({ title, text })
            .where('id = :id AND "creatorId" = :creatorId', {
                id,
                creatorId: req.session.userId,
            })
            .returning("*")
            .execute();

        return result.raw[0];
    }

    @Mutation(() => Boolean)
    @UseMiddleware(isAuth)
    async deletePost(
        @Arg("id", () => Int) id: number,
        @Ctx() { req }: MyContext
    ): Promise<boolean> {
        // not cascade way
        // const post = await Post.findOne(id);

        // if (!post || post.creatorId !== req.session.userId) {
        //     return false;
        // }
        // await Updoot.delete({ postId: id });
        // await Post.delete({ id });

        await Post.delete({ id, creatorId: req.session.userId });

        return true;
    }
}
