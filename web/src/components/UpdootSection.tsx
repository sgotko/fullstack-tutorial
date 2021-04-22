import { ChevronUpIcon, ChevronDownIcon } from "@chakra-ui/icons";
import { Flex, IconButton } from "@chakra-ui/react";
import React from "react";
import {
  PostSnippetFragment,
  useVoteMutation,
  VoteMutationVariables,
} from "../generated/graphql";

interface UpdootSectionProps {
  post: PostSnippetFragment;
}

export const UpdootSection: React.FC<UpdootSectionProps> = ({ post }) => {
  const [, vote] = useVoteMutation();
  return (
    <Flex direction="column" alignItems="center" justifyContent="center" mr={4}>
      <IconButton
        aria-label="vote-up"
        icon={<ChevronUpIcon size="24px" />}
        colorScheme={post.voteStatus === 1 ? "green" : undefined}
        onClick={() => {
          post.voteStatus !== 1 && vote({ postId: post.id, value: 1 });
        }}
      />
      {post.points}
      <IconButton
        aria-label="vote-down"
        icon={<ChevronDownIcon size="24px" />}
        colorScheme={post.voteStatus === -1 ? "red" : undefined}
        onClick={() => {
          post.voteStatus !== -1 && vote({ postId: post.id, value: -1 });
        }}
      />
    </Flex>
  );
};
