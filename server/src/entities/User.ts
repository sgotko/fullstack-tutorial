import { Field, ObjectType } from "type-graphql";
import {
    BaseEntity,
    Column,
    CreateDateColumn,
    Entity,
    OneToMany,
    PrimaryGeneratedColumn,
    UpdateDateColumn,
} from "typeorm";
import { Post } from "./Post";
import { Updoot } from "./Updoot";

@ObjectType()
@Entity()
export class User extends BaseEntity {
    @Field()
    @PrimaryGeneratedColumn()
    id!: number;

    @Field(() => String)
    @Column({ unique: true })
    username!: string;

    @Column()
    password!: string;

    @Field(() => String)
    @Column({ unique: true })
    email!: string;

    @OneToMany(() => Post, (post) => post.creator)
    posts: Post[];

    @OneToMany(() => Updoot, (updoot) => updoot.user)
    updoots: Updoot[];

    @Field(() => String)
    @CreateDateColumn()
    createdAt: Date;

    @Field(() => String)
    @UpdateDateColumn()
    updatedAt: Date;
}
