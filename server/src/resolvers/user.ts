import { MyContext } from "../types";
import {
    Arg,
    Ctx,
    Field,
    FieldResolver,
    Mutation,
    ObjectType,
    Query,
    Resolver,
    Root,
} from "type-graphql";
import { User } from "../entities/User";
import argon2 from "argon2";
import { COOKIE_NAME, FORGET_PASSWORD_PREFIX } from "../constants";
import { UsernamePasswordInput } from "./UsernamePasswordInput";
import { validateRegister } from "../utils/validateRegister";
import { sendEmail } from "../utils/sendEmail";
import { v4 } from "uuid";
import { getConnection } from "typeorm";

@ObjectType()
class FieldError {
    @Field()
    field: string;

    @Field()
    message: string;
}

@ObjectType()
class UserResponse {
    @Field(() => [FieldError], { nullable: true })
    errors?: FieldError[];

    @Field(() => User, { nullable: true })
    user?: User;
}

@Resolver()
export class UserResolver {
    @FieldResolver(() => String)
    email(@Root() root: User, @Ctx() { req }: MyContext) {
        return req.session.userId === root.id ? root.email : "";
    }

    @Mutation(() => UserResponse)
    async changePassword(
        @Arg("token") token: string,
        @Arg("newPassword") newPassword: string,
        @Ctx() { redis, req }: MyContext
    ): Promise<UserResponse> {
        if (newPassword.length <= 2) {
            return {
                errors: [
                    {
                        field: "newPassword",
                        message: "length must be greater than 2",
                    },
                ],
            };
        }

        const userId = await redis.get(FORGET_PASSWORD_PREFIX + token);
        if (!userId) {
            return {
                errors: [
                    {
                        field: "token",
                        message: "token expired",
                    },
                ],
            };
        }

        const user = await User.findOne(parseInt(userId));

        if (!user) {
            return {
                errors: [
                    {
                        field: "token",
                        message: "user no longer exists",
                    },
                ],
            };
        }

        await User.update(
            {
                id: parseInt(userId),
            },
            { password: await argon2.hash(newPassword) }
        );
        await redis.del(FORGET_PASSWORD_PREFIX + token);

        // log in user after change password
        req.session.userId = user.id;

        return { user };
    }

    @Mutation(() => Boolean)
    async forgotPassword(
        @Arg("email") email: string,
        @Ctx() { redis }: MyContext
    ) {
        const user = await User.findOne({ email: email });
        if (!user) {
            //the email is not in the db;
            return true;
        }

        const token = v4();

        await redis.set(
            FORGET_PASSWORD_PREFIX + token,
            user.id,
            "ex",
            1000 * 60 * 60 * 24 * 3
        );

        await sendEmail(
            email,
            `<a href="http://localhost:3000/change-password/${token}">reset password</>`
        );

        return true;
    }

    @Query(() => User, { nullable: true })
    me(@Ctx() { req }: MyContext) {
        // you are not logged in
        if (!req.session.userId) return null;
        return User.findOne({
            id: req.session.userId,
        });
    }

    @Mutation(() => UserResponse)
    async register(
        @Arg("options")
        options: UsernamePasswordInput,
        @Ctx() { req }: MyContext
    ): Promise<UserResponse> {
        const errors = validateRegister(options);
        if (errors) return { errors };

        const hashedPassword = await argon2.hash(options.password);
        let user;
        try {
            const result = await getConnection()
                .createQueryBuilder()
                .insert()
                .into(User)
                .values({
                    username: options.username,
                    email: options.email,
                    password: hashedPassword,
                })
                .returning("*")
                .execute();
            user = result.raw[0];
        } catch (err) {
            //duplicate username error
            if (err.code === "23505" || err.detail.includes("already exists")) {
                return {
                    errors: [
                        {
                            field: "username",
                            message: "username has already taken",
                        },
                    ],
                };
            }
        }

        // auto login after register
        req.session.userId = user.id;

        return { user };
    }

    @Mutation(() => UserResponse)
    async login(
        @Arg("usernameOrEmail")
        usernameOrEmail: string,
        @Arg("password")
        password: string,
        @Ctx() { req }: MyContext
    ): Promise<UserResponse> {
        const user = await User.findOne(
            usernameOrEmail.includes("@")
                ? {
                      email: usernameOrEmail,
                  }
                : {
                      username: usernameOrEmail,
                  }
        );
        if (!user) {
            return {
                errors: [
                    {
                        field: "usernameOrEmail",
                        message: "that username or email doesn't exist",
                    },
                ],
            };
        }

        const valid = await argon2.verify(user.password, password);
        if (!valid) {
            return {
                errors: [
                    {
                        field: "password",
                        message: "incorrect password",
                    },
                ],
            };
        }

        req.session.userId = user.id;

        return {
            user,
        };
    }

    @Mutation(() => Boolean)
    logout(@Ctx() { req, res }: MyContext) {
        return new Promise((resolve) =>
            req.session.destroy((err) => {
                res.clearCookie(COOKIE_NAME);

                if (err) {
                    console.log(err);
                    resolve(false);
                    return;
                }

                resolve(true);
            })
        );
    }
}
