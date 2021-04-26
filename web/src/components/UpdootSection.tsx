import { ApolloCache, gql } from "@apollo/client";
import { ChevronDownIcon, ChevronUpIcon } from "@chakra-ui/icons";
import { Flex, IconButton } from "@chakra-ui/react";
import React from "react";
import {
  PostSnippetFragment,
  useVoteMutation,
  VoteMutation,
} from "../generated/graphql";

interface UpdootSectionProps {
  post: PostSnippetFragment;
}

const updateAfterVote = (
  value: number,
  postId: number,
  cache: ApolloCache<VoteMutation>
) => {
  const data = cache.readFragment<PostSnippetFragment>({
    id: "Post:" + postId,
    fragment: gql`
      fragment _ on Post {
        id
        points
        voteStatus
      }
    `,
  });

  if (data && data.voteStatus !== value) {
    const newPoints = data.points + (!data.voteStatus ? 1 : 2) * value;
    cache.writeFragment({
      id: "Post:" + postId,
      fragment: gql`
        fragment __ on Post {
          points
          voteStatus
        }
      `,
      data: { points: newPoints, voteStatus: value },
    });
  }
};

export const UpdootSection: React.FC<UpdootSectionProps> = ({ post }) => {
  const [vote] = useVoteMutation();
  return (
    <Flex direction="column" alignItems="center" justifyContent="center" mr={4}>
      <IconButton
        aria-label="vote-up"
        icon={<ChevronUpIcon size="24px" />}
        colorScheme={post.voteStatus === 1 ? "green" : undefined}
        onClick={() => {
          post.voteStatus !== 1 &&
            vote({
              variables: { postId: post.id, value: 1 },
              update: (cache) => updateAfterVote(1, post.id, cache),
            });
        }}
      />
      {post.points}
      <IconButton
        aria-label="vote-down"
        icon={<ChevronDownIcon size="24px" />}
        colorScheme={post.voteStatus === -1 ? "red" : undefined}
        onClick={() => {
          post.voteStatus !== -1 &&
            vote({
              variables: { postId: post.id, value: -1 },
              update: (cache) => updateAfterVote(-1, post.id, cache),
            });
        }}
      />
    </Flex>
  );
};
