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
    textSnippet(@Root() root: Post) {
        return root.text.slice(0, 50);
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
        @Arg("cursor", () => String, { nullable: true }) cursor: string | null,
        @Ctx() { req }: MyContext
    ): // @Info() info: any
    Promise<PaginatedPosts> {
        // 20 -> 21
        const realLimit = Math.min(50, limit);
        const realLimitPlusOne = realLimit + 1;
        const { userId } = req.session;

        const posts = await getConnection().query(
            `
            SELECT p.*,
            json_build_object (
                'id', u.id,
                'username', u.username,
                'email', u.email,
                'createdAt', u."createdAt",
                'updatedAt', u."updatedAt"
            ) creator,
            ${
                userId
                    ? `(SELECT VALUE FROM updoot WHERE "userId" = ${userId} AND "postId" = p.id) "voteStatus"`
                    : `null as "voteStatus"`
            }
            FROM post p           
            INNER JOIN public.user u ON p."creatorId" = u.id
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
    post(@Arg("id") id: number): Promise<Post | undefined> {
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
    async updatePost(
        @Arg("id") id: number,
        @Arg("title", () => String, { nullable: true }) title: string
    ): Promise<Post | null> {
        const post = await Post.findOne(id);
        if (!post) return null;
        if (typeof title !== "undefined") {
            await Post.update({ id }, { title });
        }
        return post;
    }

    @Mutation(() => Boolean)
    async deletePost(@Arg("id") id: number): Promise<boolean> {
        await Post.delete(id);
        return true;
    }
}
