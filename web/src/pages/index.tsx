import {
  Box,
  Button,
  Flex,
  Heading,
  Link,
  Stack,
  Text,
} from "@chakra-ui/react";
import NextLink from "next/link";
import React from "react";
import { EditDeletePostButtons } from "../components/EditDeletePostButtons";
import { Layout } from "../components/Layout";
import { UpdootSection } from "../components/UpdootSection";
import { usePostsQuery } from "../generated/graphql";
import { withApollo } from "../utils/withApollo";

const Index = () => {
  const { data, loading, fetchMore, variables } = usePostsQuery({
    variables: {
      limit: 15,
    },
    notifyOnNetworkStatusChange: true,
  });

  if (!loading && !data) {
    return <div>no posts</div>;
  }

  return (
    <Layout>
      {!data && loading ? (
        <div>loading...</div>
      ) : (
        <Stack spacing={8}>
          {data!.posts.posts.map((post) =>
            !post ? null : (
              <Flex p={5} shadow="md" borderWidth="1px" key={post.id}>
                <UpdootSection post={post} />
                <Box flex={1}>
                  <NextLink href={`/post/[id]`} as={`/post/${post.id}`}>
                    <Link>
                      <Heading fontSize="xl">{post.title}</Heading>
                    </Link>
                  </NextLink>

                  <Text mt={2} fontSize={12}>
                    posted by {post.creator.username}
                  </Text>
                  <Flex align="center">
                    <Text flex={1} mt={4}>
                      {post.textSnippet}
                    </Text>

                    <Box ml="auto">
                      <EditDeletePostButtons
                        id={post.id}
                        creatorId={post.creator.id}
                      />
                    </Box>
                  </Flex>
                </Box>
              </Flex>
            )
          )}
        </Stack>
      )}

      <Flex my={8}>
        {data && data.posts.hasMore && (
          <Button
            isLoading={loading}
            m="auto"
            onClick={async () => {
              await fetchMore({
                variables: {
                  limit: variables?.limit,
                  cursor:
                    data.posts.posts[data.posts.posts.length - 1].createdAt,
                },
              });
              // updateQuery: (prev, { fetchMoreResult }): PostsQuery => {
              //   if (!fetchMoreResult) return prev as PostsQuery;

              //   return {
              //     __typename: "Query",
              //     posts: {
              //       hasMore: (fetchMoreResult as PostsQuery).posts.hasMore,
              //       posts: [
              //         ...(prev as PostsQuery).posts.posts,
              //         ...(fetchMoreResult as PostsQuery).posts.posts,
              //       ],
              //     },
              //   };
              // },
            }}
          >
            load more
          </Button>
        )}
      </Flex>
    </Layout>
  );
};

export default withApollo({ ssr: true })(Index);
